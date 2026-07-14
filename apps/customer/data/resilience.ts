export type NetworkMode = 'online' | 'slow' | 'offline'
export type TechnicalLevel = 'info' | 'success' | 'warning' | 'error'
export type QueuedActionKind =
  | 'create_order'
  | 'create_shipment'
  | 'cancel_operation'
  | 'merchant_transition'
  | 'rider_accept'
  | 'rider_reject'
  | 'rider_progress'
  | 'rider_complete'
  | 'merchant_settings'
  | 'admin_policy'
  | 'incident_resolve'

export type QueuedAction = {
  id: string
  key: string
  kind: QueuedActionKind
  label: string
  entityId: string
  createdAt: string
  attempts: number
  lastError?: string
}

export type TechnicalEvent = {
  id: string
  level: TechnicalLevel
  scope: string
  message: string
  at: string
}

export type HealthCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
}

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase()
}

export function createActionKey(kind: QueuedActionKind, entityId: string, payload?: unknown): string {
  let normalized = ''
  try {
    normalized = payload === undefined ? '' : JSON.stringify(payload)
  } catch {
    normalized = String(payload ?? '')
  }
  return `${kind}:${entityId}:${hashText(normalized)}`
}

export function createQueuedAction(kind: QueuedActionKind, entityId: string, label: string, payload?: unknown): QueuedAction {
  const createdAt = new Date().toISOString()
  const key = createActionKey(kind, entityId, payload)
  return {
    id: `QA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    key,
    kind,
    label,
    entityId,
    createdAt,
    attempts: 0,
  }
}

export function createTechnicalEvent(level: TechnicalLevel, scope: string, message: string): TechnicalEvent {
  const at = new Date().toISOString()
  return {
    id: `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    level,
    scope,
    message,
    at,
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
