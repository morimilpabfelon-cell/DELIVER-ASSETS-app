import type { CategoryKey } from '@/data/catalog'
import type { MerchantOrder, MerchantOrderState, OrderRecord, RiderDeliveryRecord, RiderOffer } from '@/data/system'

export type OperationKind = 'order' | 'shipment'
export type OperationStatus =
  | 'created'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'rider_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export type PaymentState = 'pending' | 'authorized' | 'captured' | 'cash_due' | 'failed' | 'refunded'
export type PaymentKind = 'card' | 'wallet' | 'cash'
export type OperationActor = 'customer' | 'merchant' | 'rider' | 'admin' | 'system'

export type OperationEvent = {
  id: string
  status: OperationStatus
  label: string
  at: string
  actor: OperationActor
}

export type OperationItem = {
  productId: number
  name: string
  quantity: number
  unitPrice: number
  extras: string[]
  note: string
}

export type ShipmentDetails = {
  senderName: string
  senderPhone: string
  recipientName: string
  recipientPhone: string
  content: string
  weightKg: number
  pieces: number
  dimensions: string
  declaredValue: number
  validationNote?: string
}

export type IntegratedOperation = {
  id: string
  kind: OperationKind
  category: CategoryKey
  customerId: string
  merchantId: string
  riderId?: string
  storeId?: number
  providerId?: number
  serviceId?: number
  customerName: string
  merchantName: string
  pickupAddress: string
  dropoffAddress: string
  items: OperationItem[]
  itemSummary: string
  total: number
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  platformRevenue: number
  merchantNet: number
  riderPay: number
  payment: string
  paymentKind: PaymentKind
  paymentState: PaymentState
  status: OperationStatus
  createdAt: string
  updatedAt: string
  deliveredAt?: string
  cancelledAt?: string
  cancellationReason?: string
  riderName?: string
  offerAttempts: number
  shipmentDetails?: ShipmentDetails
  rated?: boolean
  events: OperationEvent[]
}

export type LedgerOwner = 'customer' | 'merchant' | 'rider' | 'platform'
export type LedgerEntry = {
  id: string
  orderId: string
  customerId: string
  merchantId: string
  riderId?: string
  owner: LedgerOwner
  type: 'charge' | 'cash_due' | 'merchant_credit' | 'rider_credit' | 'platform_credit' | 'refund'
  amount: number
  direction: 'debit' | 'credit'
  label: string
  createdAt: string
}

export type OperatorProfile = {
  name: string
  email: string
  phone: string
  subtitle: string
}

export const defaultMerchantProfile: OperatorProfile = {
  name: 'Barrio Burger',
  email: 'negocio@deliverassets.demo',
  phone: '+51 940 120 310',
  subtitle: 'Comida · Miraflores · validación demo',
}

export const defaultRiderProfile: OperatorProfile = {
  name: 'Alex Ramírez',
  email: 'rider@deliverassets.demo',
  phone: '+51 960 220 118',
  subtitle: 'Bicicleta · Miraflores · verificado demo',
}

export const defaultAdminProfile: OperatorProfile = {
  name: 'Eidon M.',
  email: 'admin@deliverassets.demo',
  phone: '+51 900 000 001',
  subtitle: 'Control central · sesión reforzada demo',
}

const eventLabel: Record<OperationStatus, string> = {
  created: 'Operación creada por el cliente',
  accepted: 'Operación aceptada y validada',
  preparing: 'Preparación iniciada',
  ready: 'Operación lista para recojo',
  rider_assigned: 'Repartidor asignado',
  picked_up: 'Recojo confirmado',
  in_transit: 'Entrega en camino',
  delivered: 'Entrega completada',
  cancelled: 'Operación cancelada',
}

export function createOperationId(kind: OperationKind): string {
  const prefix = kind === 'shipment' ? 'DX' : 'DA'
  const time = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `#${prefix}-${time}-${random}`
}

export function appendOperationEvent(
  operation: IntegratedOperation,
  status: OperationStatus,
  actor: OperationActor,
  at = new Date().toISOString(),
  customLabel?: string,
): IntegratedOperation {
  if (operation.status === status && !customLabel) return operation
  return {
    ...operation,
    status,
    updatedAt: at,
    deliveredAt: status === 'delivered' ? at : operation.deliveredAt,
    cancelledAt: status === 'cancelled' ? at : operation.cancelledAt,
    events: [
      ...operation.events,
      { id: `${operation.id}-${status}-${at}-${operation.events.length}`, status, label: customLabel ?? eventLabel[status], at, actor },
    ],
  }
}


const operationStatusRank: Record<OperationStatus, number> = {
  created: 0, accepted: 1, preparing: 2, ready: 3, rider_assigned: 4, picked_up: 5, in_transit: 6, delivered: 7, cancelled: 8,
}

function operationTime(value?: string): number {
  const time = Date.parse(value ?? '')
  return Number.isFinite(time) ? time : 0
}

function mergeOperationEvents(first: OperationEvent[], second: OperationEvent[]): OperationEvent[] {
  const events = new Map<string, OperationEvent>()
  for (const event of [...first, ...second]) {
    const current = events.get(event.id)
    if (!current || operationTime(event.at) >= operationTime(current.at)) events.set(event.id, event)
  }
  return [...events.values()].sort((a, b) => operationTime(a.at) - operationTime(b.at))
}

export function mergeIntegratedOperation(current: IntegratedOperation, incoming: IntegratedOperation): IntegratedOperation {
  const incomingNewer = operationTime(incoming.updatedAt) >= operationTime(current.updatedAt)
  const older = incomingNewer ? current : incoming
  const newer = incomingNewer ? incoming : current
  let status = current.status
  if (current.status === 'delivered') status = 'delivered'
  else if (current.status === 'cancelled') status = 'cancelled'
  else if (incoming.status === 'delivered') status = 'delivered'
  else if (incoming.status === 'cancelled') status = operationStatusRank[current.status] <= operationStatusRank.ready ? 'cancelled' : current.status
  else if (operationStatusRank[incoming.status] >= operationStatusRank[current.status]) status = incoming.status

  const events = mergeOperationEvents(current.events, incoming.events)
  const updatedAt = [current.updatedAt, incoming.updatedAt, events.at(-1)?.at].filter((value): value is string => Boolean(value)).sort((a, b) => operationTime(b) - operationTime(a))[0]
  const merged: IntegratedOperation = {
    ...older,
    ...newer,
    id: current.id,
    status,
    events,
    updatedAt,
    offerAttempts: Math.max(current.offerAttempts, incoming.offerAttempts),
    rated: Boolean(current.rated || incoming.rated),
    riderName: incoming.riderName ?? current.riderName,
    riderId: incoming.riderId ?? current.riderId,
    deliveredAt: status === 'delivered' ? ([current.deliveredAt, incoming.deliveredAt, updatedAt].filter((value): value is string => Boolean(value)).sort((a, b) => operationTime(b) - operationTime(a))[0]) : current.deliveredAt ?? incoming.deliveredAt,
    cancelledAt: status === 'cancelled' ? ([current.cancelledAt, incoming.cancelledAt, updatedAt].filter((value): value is string => Boolean(value)).sort((a, b) => operationTime(b) - operationTime(a))[0]) : current.cancelledAt ?? incoming.cancelledAt,
  }
  if (status === 'delivered' && merged.paymentState === 'cash_due') merged.paymentState = 'captured'
  if (status === 'cancelled' && !['refunded', 'failed'].includes(merged.paymentState)) merged.paymentState = merged.paymentState === 'captured' ? 'refunded' : 'failed'
  return merged
}

export function mergeIntegratedOperations(local: IntegratedOperation[], remote: IntegratedOperation[]): IntegratedOperation[] {
  const operations = new Map<string, IntegratedOperation>()
  for (const operation of local) operations.set(operation.id, operation)
  for (const operation of remote) {
    const current = operations.get(operation.id)
    operations.set(operation.id, current ? mergeIntegratedOperation(current, operation) : operation)
  }
  return [...operations.values()].sort((a, b) => operationTime(b.createdAt) - operationTime(a.createdAt))
}

export function cancelIntegratedOperation(
  operation: IntegratedOperation,
  actor: OperationActor,
  reason: string,
  at = new Date().toISOString(),
): IntegratedOperation {
  const paymentState: PaymentState = operation.paymentState === 'captured' ? 'refunded' : ['pending', 'authorized', 'cash_due'].includes(operation.paymentState) ? 'failed' : operation.paymentState
  return {
    ...appendOperationEvent(operation, 'cancelled', actor, at, `Cancelado: ${reason}`),
    paymentState,
    cancellationReason: reason,
    cancelledAt: at,
  }
}

export function merchantStateToOperationStatus(state: MerchantOrderState): OperationStatus {
  if (state === 'nuevo') return 'created'
  if (state === 'aceptado') return 'accepted'
  if (state === 'preparando') return 'preparing'
  if (state === 'listo') return 'ready'
  if (state === 'cancelado') return 'cancelled'
  return 'delivered'
}

export function operationStatusToMerchantState(status: OperationStatus): MerchantOrderState {
  if (status === 'created') return 'nuevo'
  if (status === 'accepted') return 'aceptado'
  if (status === 'preparing') return 'preparando'
  if (status === 'ready' || status === 'rider_assigned' || status === 'picked_up' || status === 'in_transit') return 'listo'
  if (status === 'cancelled') return 'cancelado'
  return 'entregado'
}

export function operationStatusToCustomerStage(operation: IntegratedOperation): number {
  if (operation.kind === 'shipment') {
    if (operation.status === 'created' || operation.status === 'accepted') return 1
    if (operation.status === 'preparing' || operation.status === 'ready' || operation.status === 'rider_assigned') return 2
    if (operation.status === 'picked_up') return 3
    if (operation.status === 'in_transit') return 4
    if (operation.status === 'delivered') return 5
    return 0
  }
  if (operation.status === 'created' || operation.status === 'accepted') return 1
  if (operation.status === 'preparing' || operation.status === 'ready') return 2
  if (operation.status === 'rider_assigned' || operation.status === 'picked_up' || operation.status === 'in_transit') return 3
  if (operation.status === 'delivered') return 4
  return 0
}

export function operationStatusLabel(status: OperationStatus): string {
  return eventLabel[status]
}

export function makeRiderOffer(operation: IntegratedOperation): RiderOffer {
  return {
    id: `OF-${operation.id.replace(/[^A-Z0-9]/gi, '').slice(-7)}-${operation.offerAttempts + 1}`,
    orderId: operation.id,
    pickup: operation.merchantName,
    dropoff: operation.dropoffAddress,
    distance: operation.kind === 'shipment' ? '4.1 km' : '2.4 km',
    time: operation.kind === 'shipment' ? '34 min' : '21 min',
    pay: operation.riderPay,
    category: operation.kind === 'shipment' ? 'Documento o paquete' : operation.category[0].toUpperCase() + operation.category.slice(1),
    attempt: operation.offerAttempts + 1,
  }
}

export function formatOperationDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' ·')
}

export function deriveMerchantOrders(operations: IntegratedOperation[], storeId: number): MerchantOrder[] {
  return operations
    .filter((operation) => (operation.storeId ?? operation.providerId) === storeId)
    .map((operation) => ({
      id: operation.id,
      customer: operation.customerName,
      items: operation.itemSummary,
      total: operation.total,
      eta: operation.status === 'created' ? '20 min' : operation.status === 'preparing' ? '12 min' : operation.status === 'ready' ? 'Recojo pendiente' : 'Actualizado',
      state: operationStatusToMerchantState(operation.status),
    }))
}

export function deriveRiderOffers(operations: IntegratedOperation[], activeOperationId?: string): RiderOffer[] {
  return operations
    .filter((operation) => operation.status === 'ready' && operation.id !== activeOperationId)
    .map(makeRiderOffer)
}

export function deriveCustomerHistory(operations: IntegratedOperation[]): OrderRecord[] {
  return operations
    .filter((operation) => operation.status === 'delivered' || operation.status === 'cancelled')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((operation) => ({
      id: operation.id,
      kind: operation.kind,
      storeId: operation.storeId,
      title: operation.kind === 'shipment' ? `${operation.merchantName} · ${operation.items[0]?.name ?? 'Envío'}` : operation.merchantName,
      date: formatOperationDate(operation.updatedAt),
      total: operation.total,
      status: operation.status === 'cancelled' ? 'Cancelado' : 'Entregado',
      summary: operation.kind === 'shipment'
        ? `${operation.pickupAddress} → ${operation.dropoffAddress}`
        : `${operation.items.reduce((sum, item) => sum + item.quantity, 0)} productos`,
      rated: operation.rated,
    }))
}

export function deriveRiderHistory(operations: IntegratedOperation[]): RiderDeliveryRecord[] {
  return operations
    .filter((operation) => operation.status === 'delivered' && operation.riderName)
    .sort((a, b) => new Date(b.deliveredAt ?? b.updatedAt).getTime() - new Date(a.deliveredAt ?? a.updatedAt).getTime())
    .map((operation, index) => ({
      id: `#R-${1000 + index}`,
      orderId: operation.id,
      title: operation.merchantName,
      route: `${operation.pickupAddress} → ${operation.dropoffAddress}`,
      pay: operation.riderPay,
      completedAt: new Date(operation.deliveredAt ?? operation.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      completedAtIso: operation.deliveredAt ?? operation.updatedAt,
      category: operation.kind === 'shipment' ? 'Documento o paquete' : operation.category[0].toUpperCase() + operation.category.slice(1),
    }))
}

export function deriveLedger(operations: IntegratedOperation[]): LedgerEntry[] {
  const result: LedgerEntry[] = []
  for (const operation of operations) {
    if (operation.paymentState === 'captured' || operation.paymentState === 'refunded') {
      result.push({
        id: `${operation.id}-customer`, orderId: operation.id, customerId: operation.customerId, merchantId: operation.merchantId,
        riderId: operation.riderId, owner: 'customer', type: 'charge', amount: operation.total, direction: 'debit',
        label: `Pago de ${operation.merchantName}`, createdAt: operation.createdAt,
      })
    }
    if (operation.paymentState === 'cash_due') {
      result.push({
        id: `${operation.id}-cash`, orderId: operation.id, customerId: operation.customerId, merchantId: operation.merchantId,
        riderId: operation.riderId, owner: 'customer', type: 'cash_due', amount: operation.total, direction: 'debit',
        label: `Efectivo pendiente de ${operation.merchantName}`, createdAt: operation.createdAt,
      })
    }
    if (operation.paymentState === 'refunded') {
      result.push({
        id: `${operation.id}-refund`, orderId: operation.id, customerId: operation.customerId, merchantId: operation.merchantId,
        riderId: operation.riderId, owner: 'customer', type: 'refund', amount: operation.total, direction: 'credit',
        label: `Reembolso de ${operation.merchantName}`, createdAt: operation.cancelledAt ?? operation.updatedAt,
      })
    }
    if (operation.status === 'delivered') result.push(...settleOperation(operation))
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function settleOperation(operation: IntegratedOperation): LedgerEntry[] {
  const at = operation.deliveredAt ?? operation.updatedAt
  return [
    {
      id: `${operation.id}-merchant`, orderId: operation.id, customerId: operation.customerId, merchantId: operation.merchantId,
      riderId: operation.riderId, owner: 'merchant', type: 'merchant_credit', amount: operation.merchantNet,
      direction: 'credit', label: `Ingreso de ${operation.merchantName}`, createdAt: at,
    },
    {
      id: `${operation.id}-rider`, orderId: operation.id, customerId: operation.customerId, merchantId: operation.merchantId,
      riderId: operation.riderId, owner: 'rider', type: 'rider_credit', amount: operation.riderPay,
      direction: 'credit', label: `Pago de entrega ${operation.id}`, createdAt: at,
    },
    {
      id: `${operation.id}-platform`, orderId: operation.id, customerId: operation.customerId, merchantId: operation.merchantId,
      riderId: operation.riderId, owner: 'platform', type: 'platform_credit', amount: operation.platformRevenue,
      direction: 'credit', label: `Ingreso de plataforma ${operation.id}`, createdAt: at,
    },
  ]
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function seedOperation(input: Partial<IntegratedOperation> & Pick<IntegratedOperation, 'id' | 'kind' | 'category' | 'merchantName' | 'pickupAddress' | 'dropoffAddress' | 'items' | 'itemSummary' | 'total' | 'subtotal' | 'deliveryFee' | 'serviceFee' | 'discount' | 'platformRevenue' | 'merchantNet' | 'riderPay' | 'status'>): IntegratedOperation {
  const createdAt = input.createdAt ?? isoMinutesAgo(90)
  const paymentKind = input.paymentKind ?? 'card'
  return {
    customerId: input.customerId ?? 'customer-demo', merchantId: input.merchantId ?? `merchant-${input.storeId ?? input.providerId ?? 1}`,
    customerName: input.customerName ?? 'Cliente demo', payment: input.payment ?? 'Visa •••• 4242', paymentKind,
    paymentState: input.paymentState ?? (paymentKind === 'cash' ? 'cash_due' : 'captured'), createdAt, updatedAt: input.updatedAt ?? createdAt,
    offerAttempts: input.offerAttempts ?? 0, events: input.events ?? [{ id: `${input.id}-created`, status: 'created', label: 'Operación creada por el cliente', at: createdAt, actor: 'customer' }],
    ...input,
  }
}

export const initialIntegratedOperations: IntegratedOperation[] = [
  seedOperation({ id: '#DA-SEED-2501', kind: 'order', category: 'comida', storeId: 1, merchantName: 'Barrio Burger', pickupAddress: 'Barrio Burger · Miraflores', dropoffAddress: 'Av. Pardo 620, Miraflores', customerName: 'Camila R.', items: [{ productId: 101, name: 'Combo Doble DA', quantity: 2, unitPrice: 18.9, extras: [], note: '' }], itemSummary: '2 Combo Doble DA', total: 44.7, subtotal: 39.3, deliveryFee: 3.5, serviceFee: 1.9, discount: 0, merchantNet: 33.41, riderPay: 5, platformRevenue: 6.29, status: 'created', createdAt: isoMinutesAgo(16), updatedAt: isoMinutesAgo(16) }),
  seedOperation({ id: '#DA-SEED-2498', kind: 'order', category: 'comida', storeId: 1, merchantName: 'Barrio Burger', pickupAddress: 'Barrio Burger · Miraflores', dropoffAddress: 'Calle Porta 180, Miraflores', customerName: 'Luis M.', items: [{ productId: 102, name: 'Burger Clásica', quantity: 2, unitPrice: 18.9, extras: [], note: '' }], itemSummary: '2 Burger Clásica', total: 52.8, subtotal: 47.4, deliveryFee: 3.5, serviceFee: 1.9, discount: 0, merchantNet: 40.29, riderPay: 5, platformRevenue: 7.51, status: 'preparing', createdAt: isoMinutesAgo(28), updatedAt: isoMinutesAgo(9), events: [
    { id: 'seed-2498-created', status: 'created', label: 'Operación creada por el cliente', at: isoMinutesAgo(28), actor: 'customer' },
    { id: 'seed-2498-accepted', status: 'accepted', label: 'Operación aceptada y validada', at: isoMinutesAgo(24), actor: 'merchant' },
    { id: 'seed-2498-preparing', status: 'preparing', label: 'Preparación iniciada', at: isoMinutesAgo(9), actor: 'merchant' },
  ] }),
  seedOperation({ id: '#DA-SEED-2494', kind: 'order', category: 'comida', storeId: 1, merchantName: 'Barrio Burger', pickupAddress: 'Barrio Burger · Miraflores', dropoffAddress: 'Av. Larco 410, Miraflores', customerName: 'Ana P.', items: [{ productId: 103, name: 'Papas Fuego', quantity: 2, unitPrice: 10.9, extras: [], note: '' }], itemSummary: '2 Papas Fuego', total: 31.4, subtotal: 26, deliveryFee: 3.5, serviceFee: 1.9, discount: 0, merchantNet: 22.1, riderPay: 5, platformRevenue: 4.3, status: 'ready', createdAt: isoMinutesAgo(35), updatedAt: isoMinutesAgo(5), events: [
    { id: 'seed-2494-created', status: 'created', label: 'Operación creada por el cliente', at: isoMinutesAgo(35), actor: 'customer' },
    { id: 'seed-2494-accepted', status: 'accepted', label: 'Operación aceptada y validada', at: isoMinutesAgo(30), actor: 'merchant' },
    { id: 'seed-2494-preparing', status: 'preparing', label: 'Preparación iniciada', at: isoMinutesAgo(20), actor: 'merchant' },
    { id: 'seed-2494-ready', status: 'ready', label: 'Operación lista para recojo', at: isoMinutesAgo(5), actor: 'merchant' },
  ] }),
  seedOperation({ id: '#DA-SEED-2321', kind: 'order', category: 'mercado', storeId: 4, merchantName: 'Mercado 24', pickupAddress: 'Mercado 24 · San Isidro', dropoffAddress: 'Av. Javier Prado 560, San Isidro', customerName: 'Eidon Morimil', items: [{ productId: 401, name: 'Canasta Esencial', quantity: 2, unitPrice: 42.8, extras: [], note: '' }], itemSummary: '2 Canasta Esencial', total: 86.4, subtotal: 80, deliveryFee: 4.5, serviceFee: 1.9, discount: 0, merchantNet: 68, riderPay: 7.5, platformRevenue: 10.9, status: 'delivered', createdAt: isoMinutesAgo(1500), updatedAt: isoMinutesAgo(1420), deliveredAt: isoMinutesAgo(1420), riderName: 'Alex Ramírez', riderId: 'rider-demo', events: [{ id: 'seed2321', status: 'delivered', label: 'Entrega completada', at: isoMinutesAgo(1420), actor: 'rider' }] }),
  seedOperation({ id: '#DX-SEED-2302', kind: 'shipment', category: 'envios', providerId: 10, serviceId: 1001, merchantName: 'DA Express', pickupAddress: 'Miraflores', dropoffAddress: 'San Isidro', customerName: 'Eidon Morimil', items: [{ productId: 1001, name: 'Documento', quantity: 1, unitPrice: 10.9, extras: ['Foto de entrega'], note: 'Documento comercial' }], itemSummary: 'Documento · Documento comercial', total: 10.9, subtotal: 10.9, deliveryFee: 0, serviceFee: 0, discount: 0, merchantNet: 0, riderPay: 7.09, platformRevenue: 3.81, status: 'delivered', createdAt: isoMinutesAgo(3000), updatedAt: isoMinutesAgo(2940), deliveredAt: isoMinutesAgo(2940), riderName: 'Alex Ramírez', riderId: 'rider-demo', events: [{ id: 'seed2302', status: 'delivered', label: 'Entrega completada', at: isoMinutesAgo(2940), actor: 'rider' }], shipmentDetails: { senderName: 'Eidon Morimil', senderPhone: '+51 999 432 101', recipientName: 'Recepción', recipientPhone: '999 000 222', content: 'Documento comercial', weightKg: 0.4, pieces: 1, dimensions: 'A4', declaredValue: 20 } }),
]
