export type CoordinationRole = 'customer' | 'merchant' | 'rider' | 'admin' | 'system'
export type CoordinationMessageType = 'text' | 'image' | 'system' | 'receipt'
export type CoordinationMessageStatus = 'sent' | 'pending' | 'failed'

export type CoordinationParticipant = {
  role: Exclude<CoordinationRole, 'system'>
  id: string
  name: string
  joinedAt: string
}

export type CoordinationMessage = {
  id: string
  operationId: string
  senderRole: CoordinationRole
  senderId: string
  senderName: string
  type: CoordinationMessageType
  text?: string
  imageUrl?: string
  createdAt: string
  status: CoordinationMessageStatus
}

export type ReceiptLine = {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  extras: string[]
  note: string
  lineTotal: number
}

export type OperationReceipt = {
  number: string
  operationId: string
  issuedAt: string
  merchantName: string
  customerName: string
  currency: 'PEN'
  lines: ReceiptLine[]
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  total: number
  paymentLabel: string
  paymentKind: 'card' | 'wallet' | 'cash'
  paymentState: 'pending' | 'authorized' | 'captured' | 'cash_due' | 'failed' | 'refunded'
}

export type OperationCoordination = {
  status: 'open' | 'closed'
  participants: CoordinationParticipant[]
  messages: CoordinationMessage[]
  escalated: boolean
  escalatedAt?: string
  adminJoinedAt?: string
  closedAt?: string
  receipt: OperationReceipt
}

export type CoordinationSource = {
  id: string
  createdAt: string
  updatedAt: string
  status: string
  customerId: string
  merchantId: string
  riderId?: string
  customerName: string
  merchantName: string
  riderName?: string
  items: Array<{
    productId: number
    name: string
    quantity: number
    unitPrice: number
    extras: string[]
    note: string
  }>
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  total: number
  payment: string
  paymentKind: 'card' | 'wallet' | 'cash'
  paymentState: 'pending' | 'authorized' | 'captured' | 'cash_due' | 'failed' | 'refunded'
  events?: Array<{ id: string; label: string; at: string; actor: CoordinationRole }>
}

function asTime(value?: string): number {
  const time = Date.parse(value ?? '')
  return Number.isFinite(time) ? time : 0
}

function receiptNumber(operationId: string, issuedAt: string): string {
  const date = new Date(issuedAt)
  const year = Number.isNaN(date.getTime()) ? '0000' : String(date.getFullYear())
  const suffix = operationId.replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase().padStart(8, '0')
  return `B001-${year}-${suffix}`
}

export function createReceipt(source: CoordinationSource): OperationReceipt {
  return {
    number: receiptNumber(source.id, source.createdAt),
    operationId: source.id,
    issuedAt: source.createdAt,
    merchantName: source.merchantName,
    customerName: source.customerName,
    currency: 'PEN',
    lines: source.items.map((item) => ({
      ...item,
      lineTotal: Number((item.unitPrice * item.quantity).toFixed(2)),
    })),
    subtotal: source.subtotal,
    deliveryFee: source.deliveryFee,
    serviceFee: source.serviceFee,
    discount: source.discount,
    total: source.total,
    paymentLabel: source.payment,
    paymentKind: source.paymentKind,
    paymentState: source.paymentState,
  }
}

export function createCoordinationMessage(
  operationId: string,
  senderRole: CoordinationRole,
  senderId: string,
  senderName: string,
  type: CoordinationMessageType,
  data: { text?: string; imageUrl?: string; createdAt?: string; status?: CoordinationMessageStatus },
): CoordinationMessage {
  const createdAt = data.createdAt ?? new Date().toISOString()
  return {
    id: `MSG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    operationId,
    senderRole,
    senderId,
    senderName,
    type,
    text: data.text?.trim() || undefined,
    imageUrl: data.imageUrl,
    createdAt,
    status: data.status ?? 'sent',
  }
}

function eventMessages(source: CoordinationSource): CoordinationMessage[] {
  return (source.events ?? []).map((event) => ({
    id: `SYS-${event.id}`,
    operationId: source.id,
    senderRole: 'system',
    senderId: 'deliver-assets-system',
    senderName: 'DELIVER ASSETS',
    type: 'system',
    text: event.label,
    createdAt: event.at,
    status: 'sent',
  }))
}

function participantMap(participants: CoordinationParticipant[]): CoordinationParticipant[] {
  const map = new Map<string, CoordinationParticipant>()
  for (const participant of participants) {
    const key = `${participant.role}:${participant.id}`
    const current = map.get(key)
    if (!current || asTime(participant.joinedAt) < asTime(current.joinedAt)) map.set(key, participant)
  }
  return [...map.values()].sort((a, b) => asTime(a.joinedAt) - asTime(b.joinedAt))
}

export function ensureOperationCoordination(source: CoordinationSource): OperationCoordination {
  const terminal = source.status === 'delivered' || source.status === 'cancelled'
  const participants: CoordinationParticipant[] = [
    { role: 'customer', id: source.customerId, name: source.customerName, joinedAt: source.createdAt },
    { role: 'merchant', id: source.merchantId, name: source.merchantName, joinedAt: source.createdAt },
  ]
  if (source.riderId) participants.push({
    role: 'rider',
    id: source.riderId,
    name: source.riderName ?? 'Repartidor',
    joinedAt: source.updatedAt,
  })

  const messages = [
    ...eventMessages(source),
    {
      id: `RECEIPT-${source.id}`,
      operationId: source.id,
      senderRole: 'system' as const,
      senderId: 'deliver-assets-system',
      senderName: 'DELIVER ASSETS',
      type: 'receipt' as const,
      text: `Boleta ${receiptNumber(source.id, source.createdAt)} generada.`,
      createdAt: source.createdAt,
      status: 'sent' as const,
    },
  ].sort((a, b) => asTime(a.createdAt) - asTime(b.createdAt))

  return {
    status: terminal ? 'closed' : 'open',
    participants,
    messages,
    escalated: false,
    closedAt: terminal ? source.updatedAt : undefined,
    receipt: createReceipt(source),
  }
}

export function normalizeOperationCoordination(source: CoordinationSource & { coordination?: OperationCoordination }): OperationCoordination {
  const fallback = ensureOperationCoordination(source)
  const current = source.coordination
  if (!current) return fallback

  const terminal = source.status === 'delivered' || source.status === 'cancelled'
  return {
    status: terminal ? 'closed' : current.status ?? 'open',
    participants: participantMap([...(fallback.participants ?? []), ...(current.participants ?? [])]),
    messages: mergeCoordinationMessages(fallback.messages, current.messages ?? []),
    escalated: Boolean(current.escalated),
    escalatedAt: current.escalatedAt,
    adminJoinedAt: current.adminJoinedAt,
    closedAt: terminal ? current.closedAt ?? source.updatedAt : current.closedAt,
    receipt: { ...(current.receipt ?? fallback.receipt), paymentState: source.paymentState },
  }
}

export function mergeCoordinationMessages(first: CoordinationMessage[] = [], second: CoordinationMessage[] = []): CoordinationMessage[] {
  const map = new Map<string, CoordinationMessage>()
  for (const message of [...first, ...second]) {
    if (!message?.id) continue
    const current = map.get(message.id)
    if (!current || asTime(message.createdAt) >= asTime(current.createdAt)) map.set(message.id, message)
  }
  return [...map.values()].sort((a, b) => asTime(a.createdAt) - asTime(b.createdAt))
}

export function mergeOperationCoordination(
  source: CoordinationSource,
  current?: OperationCoordination,
  incoming?: OperationCoordination,
): OperationCoordination {
  const fallback = ensureOperationCoordination(source)
  const first = current ?? fallback
  const second = incoming ?? fallback
  const terminal = source.status === 'delivered' || source.status === 'cancelled'
  return {
    status: terminal || first.status === 'closed' || second.status === 'closed' ? 'closed' : 'open',
    participants: participantMap([...fallback.participants, ...(first.participants ?? []), ...(second.participants ?? [])]),
    messages: mergeCoordinationMessages(fallback.messages, mergeCoordinationMessages(first.messages, second.messages)),
    escalated: Boolean(first.escalated || second.escalated),
    escalatedAt: [first.escalatedAt, second.escalatedAt].filter(Boolean).sort((a, b) => asTime(a) - asTime(b))[0],
    adminJoinedAt: [first.adminJoinedAt, second.adminJoinedAt].filter(Boolean).sort((a, b) => asTime(a) - asTime(b))[0],
    closedAt: terminal
      ? [first.closedAt, second.closedAt, source.updatedAt].filter(Boolean).sort((a, b) => asTime(b) - asTime(a))[0]
      : first.closedAt ?? second.closedAt,
    receipt: { ...(first.receipt ?? second.receipt ?? fallback.receipt), paymentState: source.paymentState },
  }
}

export function appendCoordinationMessage(
  source: CoordinationSource & { coordination?: OperationCoordination },
  message: CoordinationMessage,
): OperationCoordination {
  const coordination = normalizeOperationCoordination(source)
  if (coordination.status === 'closed') return coordination
  return {
    ...coordination,
    messages: mergeCoordinationMessages(coordination.messages, [message]),
  }
}

export function appendCoordinationParticipant(
  source: CoordinationSource & { coordination?: OperationCoordination },
  participant: CoordinationParticipant,
): OperationCoordination {
  const coordination = normalizeOperationCoordination(source)
  return {
    ...coordination,
    participants: participantMap([...coordination.participants, participant]),
  }
}

export function escalateCoordination(
  source: CoordinationSource & { coordination?: OperationCoordination },
  actorName: string,
): OperationCoordination {
  const coordination = normalizeOperationCoordination(source)
  if (coordination.status === 'closed' || coordination.escalated) return coordination
  const now = new Date().toISOString()
  const message = createCoordinationMessage(
    source.id,
    'system',
    'deliver-assets-system',
    'DELIVER ASSETS',
    'system',
    { text: `${actorName} solicitó ayuda de Control. La conversación quedó marcada para revisión.`, createdAt: now },
  )
  return {
    ...coordination,
    escalated: true,
    escalatedAt: now,
    messages: mergeCoordinationMessages(coordination.messages, [message]),
  }
}

export function paymentStateLabel(state: OperationReceipt['paymentState']): string {
  if (state === 'captured') return 'PAGO CONFIRMADO'
  if (state === 'cash_due') return 'EFECTIVO PENDIENTE'
  if (state === 'refunded') return 'REEMBOLSADO'
  if (state === 'failed') return 'PAGO FALLIDO'
  if (state === 'authorized') return 'PAGO AUTORIZADO'
  return 'PAGO PENDIENTE'
}
