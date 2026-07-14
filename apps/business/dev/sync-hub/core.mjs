import fs from 'node:fs'
import path from 'node:path'

export const EMPTY_REVISIONS = Object.freeze({ operations: 0, merchants: 0, admin: 0 })

const STATUS_RANK = Object.freeze({
  created: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  rider_assigned: 4,
  picked_up: 5,
  in_transit: 6,
  delivered: 7,
  cancelled: 8,
})

function asTime(value) {
  const time = Date.parse(String(value ?? ''))
  return Number.isFinite(time) ? time : 0
}

function newestIso(...values) {
  return values.filter(Boolean).sort((a, b) => asTime(b) - asTime(a))[0]
}

function stableJson(value) {
  return JSON.stringify(value)
}

export function createInitialState() {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
    domainRevisions: { ...EMPTY_REVISIONS },
    operations: [],
    merchantStates: null,
    admin: null,
    recentIdempotencyKeys: [],
  }
}

function mergeEvents(first = [], second = []) {
  const map = new Map()
  for (const event of [...first, ...second]) {
    if (!event || typeof event.id !== 'string') continue
    const existing = map.get(event.id)
    if (!existing || asTime(event.at) >= asTime(existing.at)) map.set(event.id, event)
  }
  return [...map.values()].sort((a, b) => asTime(a.at) - asTime(b.at))
}

function resolveStatus(current, incoming) {
  const currentStatus = current?.status ?? 'created'
  const incomingStatus = incoming?.status ?? currentStatus
  if (currentStatus === 'delivered') return 'delivered'
  if (currentStatus === 'cancelled') return 'cancelled'
  if (incomingStatus === 'delivered') return 'delivered'
  if (incomingStatus === 'cancelled') {
    const cancellationEvents = Array.isArray(incoming?.events) ? incoming.events.filter((event) => event?.status === 'cancelled') : []
    const actor = cancellationEvents.sort((a, b) => asTime(b.at) - asTime(a.at))[0]?.actor ?? 'system'
    if (actor === 'customer' && (STATUS_RANK[currentStatus] ?? 0) > STATUS_RANK.accepted) return currentStatus
    if (actor === 'merchant' && (STATUS_RANK[currentStatus] ?? 0) > STATUS_RANK.ready) return currentStatus
    return 'cancelled'
  }
  if ((STATUS_RANK[incomingStatus] ?? 0) >= (STATUS_RANK[currentStatus] ?? 0)) return incomingStatus
  return currentStatus
}

export function mergeOperation(current, incoming) {
  if (!current) return structuredClone(incoming)
  if (!incoming) return structuredClone(current)

  const incomingNewer = asTime(incoming.updatedAt) >= asTime(current.updatedAt)
  const status = resolveStatus(current, incoming)
  const rejectedIncomingStatus = incoming.status !== status && (
    incoming.status === 'cancelled' || (STATUS_RANK[incoming.status] ?? 0) < (STATUS_RANK[current.status] ?? 0)
  )
  const older = rejectedIncomingStatus ? incoming : incomingNewer ? current : incoming
  const newer = rejectedIncomingStatus ? current : incomingNewer ? incoming : current
  const incomingEvents = rejectedIncomingStatus
    ? (incoming.events ?? []).filter((event) => event.status !== incoming.status || (current.events ?? []).some((currentEvent) => currentEvent.id === event.id))
    : incoming.events
  const events = mergeEvents(current.events, incomingEvents)
  const latestEvent = events.at(-1)
  const updatedAt = newestIso(current.updatedAt, incoming.updatedAt, latestEvent?.at) ?? new Date().toISOString()
  const merged = {
    ...older,
    ...newer,
    id: current.id,
    status,
    events,
    updatedAt,
    offerAttempts: Math.max(Number(current.offerAttempts ?? 0), Number(incoming.offerAttempts ?? 0)),
    rated: Boolean(current.rated || incoming.rated),
    riderName: incoming.riderName ?? current.riderName,
    riderId: incoming.riderId ?? current.riderId,
    deliveredAt: status === 'delivered' ? newestIso(current.deliveredAt, incoming.deliveredAt, updatedAt) : current.deliveredAt ?? incoming.deliveredAt,
    cancelledAt: status === 'cancelled' ? newestIso(current.cancelledAt, incoming.cancelledAt, updatedAt) : current.cancelledAt,
    cancellationReason: status === 'cancelled' ? incoming.cancellationReason ?? current.cancellationReason : current.cancellationReason,
  }

  if (rejectedIncomingStatus) merged.paymentState = current.paymentState
  if (status === 'delivered' && merged.paymentState === 'cash_due') merged.paymentState = 'captured'
  if (status === 'cancelled' && !['refunded', 'failed'].includes(merged.paymentState)) {
    merged.paymentState = merged.paymentState === 'captured' ? 'refunded' : 'failed'
  }
  return merged
}

export function mergeOperations(current = [], incoming = []) {
  const map = new Map()
  for (const operation of current) {
    if (operation?.id) map.set(operation.id, structuredClone(operation))
  }
  for (const operation of incoming) {
    if (!operation?.id) continue
    map.set(operation.id, mergeOperation(map.get(operation.id), operation))
  }
  return [...map.values()].sort((a, b) => asTime(b.createdAt) - asTime(a.createdAt))
}

function normalizeRevisions(value) {
  return {
    operations: Number.isFinite(value?.operations) ? Math.max(0, Math.trunc(value.operations)) : 0,
    merchants: Number.isFinite(value?.merchants) ? Math.max(0, Math.trunc(value.merchants)) : 0,
    admin: Number.isFinite(value?.admin) ? Math.max(0, Math.trunc(value.admin)) : 0,
  }
}

export function publicState(state) {
  return {
    schemaVersion: 1,
    revision: state.revision,
    updatedAt: state.updatedAt,
    domainRevisions: { ...state.domainRevisions },
    operations: structuredClone(state.operations),
    merchantStates: state.merchantStates ? structuredClone(state.merchantStates) : null,
    admin: state.admin ? structuredClone(state.admin) : null,
  }
}

export function applyEnvelope(state, envelope, idempotencyKey = '') {
  const appId = String(envelope?.appId ?? '')
  if (!['customer', 'business', 'rider', 'control'].includes(appId)) {
    return { state, accepted: { operations: false, merchants: false, admin: false }, duplicate: false, error: 'appId inválido' }
  }

  const key = String(idempotencyKey || envelope?.idempotencyKey || '')
  if (key && state.recentIdempotencyKeys.includes(key)) {
    return { state, accepted: { operations: false, merchants: false, admin: false }, duplicate: true }
  }

  const next = structuredClone(state)
  const incomingRevisions = normalizeRevisions(envelope?.domainRevisions)
  const shared = envelope?.shared && typeof envelope.shared === 'object' ? envelope.shared : {}
  const accepted = { operations: false, merchants: false, admin: false }
  let changed = false

  if (Array.isArray(shared.operations)) {
    const merged = mergeOperations(next.operations, shared.operations)
    if (stableJson(merged) !== stableJson(next.operations)) {
      next.operations = merged
      next.domainRevisions.operations += 1
      accepted.operations = true
      changed = true
    }
  }

  if (appId === 'business' && shared.merchantStates && typeof shared.merchantStates === 'object') {
    const mayWrite = next.merchantStates === null || incomingRevisions.merchants >= next.domainRevisions.merchants
    if (mayWrite) {
      if (stableJson(shared.merchantStates) !== stableJson(next.merchantStates)) {
        next.merchantStates = structuredClone(shared.merchantStates)
        next.domainRevisions.merchants += 1
        changed = true
      }
      accepted.merchants = true
    }
  }

  if (appId === 'control' && shared.admin && typeof shared.admin === 'object') {
    const mayWrite = next.admin === null || incomingRevisions.admin >= next.domainRevisions.admin
    if (mayWrite) {
      if (stableJson(shared.admin) !== stableJson(next.admin)) {
        next.admin = structuredClone(shared.admin)
        next.domainRevisions.admin += 1
        changed = true
      }
      accepted.admin = true
    }
  }

  if (key) next.recentIdempotencyKeys = [...next.recentIdempotencyKeys.filter((item) => item !== key), key].slice(-300)
  if (changed) {
    next.revision += 1
    next.updatedAt = new Date().toISOString()
  }
  return { state: next, accepted, duplicate: false }
}

export function loadState(filePath) {
  try {
    if (!fs.existsSync(filePath)) return createInitialState()
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const initial = createInitialState()
    return {
      ...initial,
      ...parsed,
      domainRevisions: normalizeRevisions(parsed.domainRevisions),
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
      recentIdempotencyKeys: Array.isArray(parsed.recentIdempotencyKeys) ? parsed.recentIdempotencyKeys.slice(-300) : [],
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  fs.renameSync(temporary, filePath)
}
