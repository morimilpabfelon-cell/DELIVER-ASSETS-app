import type { PersistedAppSnapshot } from '@/services/persistence'
import { delay } from '@/data/resilience'
import { File } from 'expo-file-system'

export type BackendMode = 'local' | 'remote'
export type HubAppId = 'customer' | 'business' | 'rider' | 'control'
export type HubDomainRevisions = { operations: number; merchants: number; admin: number }
export type HubAdminState = {
  maintenance: boolean
  blockUndeclared: boolean
  enhancedVerification: boolean
  incidents: PersistedAppSnapshot['incidents']
}
export type SharedHubState = {
  schemaVersion: number
  revision: number
  updatedAt: string
  domainRevisions: HubDomainRevisions
  operations: PersistedAppSnapshot['operations']
  merchantStates: PersistedAppSnapshot['merchantStates'] | null
  admin: HubAdminState | null
}
export type ProductImagePublishResult = { ok: true; url: string } | { ok: false; message: string }

export type SyncOptions = {
  timeoutMs?: number
  idempotencyKey?: string
  simulatedDelayMs?: number
  retries?: number
  domainRevisions?: HubDomainRevisions
}
export type SyncResult =
  | { ok: true; mode: BackendMode; syncedAt: string; attempts: number; state: SharedHubState; accepted: { operations: boolean; merchants: boolean; admin: boolean }; duplicate: boolean }
  | { ok: false; mode: BackendMode; message: string; attempts: number }

const appId: HubAppId = 'business'
const requestedMode: BackendMode = process.env.EXPO_PUBLIC_BACKEND_MODE === 'local' ? 'local' : 'remote'
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:9090'

export const backendConfig: { appId: HubAppId; requestedMode: BackendMode; apiUrl: string; configured: boolean } = {
  appId,
  requestedMode,
  apiUrl,
  configured: requestedMode === 'local' || apiUrl.length > 0,
}

const zeroRevisions: HubDomainRevisions = { operations: 0, merchants: 0, admin: 0 }

function localState(snapshot: PersistedAppSnapshot, revisions: HubDomainRevisions = zeroRevisions): SharedHubState {
  return {
    schemaVersion: 1,
    revision: snapshot.hubRevision ?? 0,
    updatedAt: snapshot.updatedAt,
    domainRevisions: revisions,
    operations: snapshot.operations,
    merchantStates: snapshot.merchantStates ?? null,
    admin: {
      maintenance: snapshot.adminMaintenance,
      blockUndeclared: snapshot.adminBlockUndeclared,
      enhancedVerification: snapshot.adminEnhancedVerification,
      incidents: snapshot.incidents,
    },
  }
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function pullHubState(options: Pick<SyncOptions, 'timeoutMs' | 'simulatedDelayMs'> = {}): Promise<SyncResult> {
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 5000)
  if (options.simulatedDelayMs) await delay(options.simulatedDelayMs)
  if (requestedMode === 'local') {
    return { ok: false, mode: 'local', message: 'El modo local no consulta el Sync Hub.', attempts: 0 }
  }
  try {
    const response = await requestJson(`${apiUrl.replace(/\/$/, '')}/v1/state`, { method: 'GET', headers: { 'X-DA-Client-Version': '2.3.0-business' } }, timeoutMs)
    const body = await response.json() as { ok?: boolean; state?: SharedHubState; message?: string }
    if (!response.ok || !body.ok || !body.state) return { ok: false, mode: 'remote', message: body.message ?? `Servidor respondió ${response.status}.`, attempts: 1 }
    return { ok: true, mode: 'remote', syncedAt: new Date().toISOString(), attempts: 1, state: body.state, accepted: { operations: false, merchants: false, admin: false }, duplicate: false }
  } catch (error) {
    return { ok: false, mode: 'remote', message: error instanceof Error && error.name === 'AbortError' ? `La consulta excedió ${Math.round(timeoutMs / 1000)} s.` : 'No fue posible conectar con DELIVER ASSETS Sync Hub.', attempts: 1 }
  }
}

export async function syncSnapshot(snapshot: PersistedAppSnapshot, options: SyncOptions = {}): Promise<SyncResult> {
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 7000)
  const retries = Math.max(0, Math.min(2, options.retries ?? 1))
  const domainRevisions = options.domainRevisions ?? snapshot.hubDomainRevisions ?? zeroRevisions
  if (options.simulatedDelayMs) await delay(options.simulatedDelayMs)

  if (requestedMode === 'local') {
    return { ok: true, mode: 'local', syncedAt: new Date().toISOString(), attempts: 1, state: localState(snapshot, domainRevisions), accepted: { operations: true, merchants: true, admin: true }, duplicate: false }
  }

  const envelope = {
    appId,
    clientRevision: snapshot.hubRevision ?? 0,
    domainRevisions,
    shared: {
      operations: snapshot.operations,
      merchantStates: appId === 'business' ? snapshot.merchantStates ?? null : null,
      admin: appId === 'control' ? {
        maintenance: snapshot.adminMaintenance,
        blockUndeclared: snapshot.adminBlockUndeclared,
        enhancedVerification: snapshot.adminEnhancedVerification,
        incidents: snapshot.incidents,
      } : null,
    },
  }

  let lastMessage = 'No fue posible conectar con DELIVER ASSETS Sync Hub.'
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const response = await requestJson(`${apiUrl.replace(/\/$/, '')}/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': options.idempotencyKey ?? `snapshot-${appId}-${snapshot.updatedAt}`,
          'X-DA-Client-Version': '2.3.0-business',
        },
        body: JSON.stringify(envelope),
      }, timeoutMs)
      const body = await response.json() as { ok?: boolean; state?: SharedHubState; accepted?: { operations?: boolean; merchants?: boolean; admin?: boolean }; duplicate?: boolean; message?: string }
      if (response.ok && body.ok && body.state) {
        return {
          ok: true,
          mode: 'remote',
          syncedAt: new Date().toISOString(),
          attempts: attempt,
          state: body.state,
          accepted: { operations: Boolean(body.accepted?.operations), merchants: Boolean(body.accepted?.merchants), admin: Boolean(body.accepted?.admin) },
          duplicate: Boolean(body.duplicate),
        }
      }
      lastMessage = body.message ?? `Servidor respondió ${response.status}.`
      if (response.status < 500 || attempt > retries) return { ok: false, mode: 'remote', message: lastMessage, attempts: attempt }
    } catch (error) {
      lastMessage = error instanceof Error && error.name === 'AbortError'
        ? `La solicitud excedió ${Math.round(timeoutMs / 1000)} s.`
        : 'No fue posible conectar con DELIVER ASSETS Sync Hub.'
      if (attempt > retries) return { ok: false, mode: 'remote', message: lastMessage, attempts: attempt }
    }
    await delay(350 * attempt)
  }
  return { ok: false, mode: 'remote', message: lastMessage, attempts: retries + 1 }
}



export async function deleteProductImage(storeId: number, productId: number): Promise<{ ok: true } | { ok: false; message: string }> {
  if (requestedMode === 'local') return { ok: false, message: 'El modo local no elimina imágenes publicadas.' }
  try {
    const response = await requestJson(`${apiUrl.replace(/\/$/, '')}/v1/media/product/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DA-Client-Version': '2.3.0-business' },
      body: JSON.stringify({ storeId, productId }),
    }, 8000)
    const body = await response.json() as { ok?: boolean; message?: string }
    if (!response.ok || !body.ok) return { ok: false, message: body.message ?? `Servidor respondió ${response.status}.` }
    return { ok: true }
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.name === 'AbortError' ? 'La eliminación excedió 8 segundos.' : 'No fue posible eliminar la fotografía publicada.' }
  }
}

export async function publishProductImage(
  storeId: number,
  productId: number,
  fileUri: string,
  mimeType = 'image/jpeg',
): Promise<ProductImagePublishResult> {
  if (requestedMode === 'local') return { ok: false, message: 'El modo local no publica imágenes.' }
  try {
    const file = new File(fileUri)
    if (!file.exists || file.size <= 0) return { ok: false, message: 'La imagen local no existe.' }
    if (file.size > 4 * 1024 * 1024) return { ok: false, message: 'La imagen debe pesar menos de 4 MB para publicarse.' }
    const base64 = await file.base64()
    const response = await requestJson(`${apiUrl.replace(/\/$/, '')}/v1/media/product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DA-Client-Version': '2.3.0-business' },
      body: JSON.stringify({ storeId, productId, mimeType, base64 }),
    }, 15000)
    const body = await response.json() as { ok?: boolean; url?: string; message?: string }
    if (!response.ok || !body.ok || !body.url) return { ok: false, message: body.message ?? `Servidor respondió ${response.status}.` }
    return { ok: true, url: body.url }
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.name === 'AbortError' ? 'La publicación excedió 15 segundos.' : 'No fue posible publicar la fotografía.' }
  }
}
