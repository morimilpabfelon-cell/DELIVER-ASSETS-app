import AsyncStorage from '@react-native-async-storage/async-storage'
import { stores } from '@/data/catalog'
import type { AppNotice, AppRole, Address, Incident, MerchantOrder, OrderRecord, PaymentMethod, RiderDeliveryRecord, RiderOffer, SupportMessage } from '@/data/system'
import type { IntegratedOperation, LedgerEntry, OperatorProfile, PaymentKind, PaymentState, OperationStatus } from '@/data/operations'
import type { QueuedAction, TechnicalEvent } from '@/data/resilience'
import { defaultAdminProfile, defaultMerchantProfile, defaultRiderProfile, operationStatusToMerchantState } from '@/data/operations'
import type { ActiveOrder, DeliveryKind, MerchantStoreState, Shipment, UserProfile, UserSettings } from '@/context/AppContext'
import type { CartLine } from '@/data/cart'
import { normalizeCartLine } from '@/data/cart'

export const APP_STORAGE_KEY = '@deliver-assets/customer-state-v2'
export const APP_SCHEMA_VERSION = 9

export type PersistedAppSnapshot = {
  schemaVersion: number
  updatedAt: string
  onboardingComplete: boolean
  role: AppRole
  authenticated: boolean
  guestSession?: boolean
  profile: UserProfile
  merchantProfile: OperatorProfile
  riderProfile: OperatorProfile
  adminProfile: OperatorProfile
  addresses: Address[]
  payments: PaymentMethod[]
  favorites: number[]
  notices: AppNotice[]
  supportMessages: SupportMessage[]
  settings: UserSettings
  desktopSessionActive: boolean
  walletBalance: number
  cart: CartLine[]
  promo: string
  activeCartStoreId?: number | null
  orderStage: number
  deliveryKind: DeliveryKind
  activeShipment: Shipment | null
  activeOrder: ActiveOrder | null
  activeOperationId: string | null
  operations: IntegratedOperation[]
  ledger: LedgerEntry[]
  history: OrderRecord[]
  currentMerchantStoreId?: number
  merchantStates?: Record<number, MerchantStoreState>
  merchantOpen: boolean
  merchantAutoAccept: boolean
  merchantOrders: MerchantOrder[]
  merchantStock: Record<number, boolean>
  riderOnline: boolean
  riderVoiceNavigation: boolean
  riderRouteStage: number
  riderOffers: RiderOffer[]
  activeRiderOffer: RiderOffer | null
  riderToday: number
  riderHistory: RiderDeliveryRecord[]
  adminMaintenance: boolean
  adminBlockUndeclared: boolean
  adminEnhancedVerification: boolean
  incidents: Incident[]
  pendingActions?: QueuedAction[]
  technicalEvents?: TechnicalEvent[]
  hubRevision?: number
  hubDomainRevisions?: { operations: number; merchants: number; admin: number }
}

type Candidate = Partial<PersistedAppSnapshot> & { schemaVersion?: number }

function initialMerchantStates(): Record<number, MerchantStoreState> {
  return Object.fromEntries(stores.map((store) => [store.id, {
    storeId: store.id,
    open: true,
    autoAccept: false,
    stock: Object.fromEntries(store.products.map((product) => [product.id, true])),
    productImages: Object.fromEntries(store.products.map((product) => [product.id, null])),
  }]))
}

function inferPaymentKind(label = ''): PaymentKind {
  const value = label.toLowerCase()
  if (value.includes('billetera')) return 'wallet'
  if (value.includes('efectivo')) return 'cash'
  return 'card'
}

function normalizeOperation(value: IntegratedOperation): IntegratedOperation {
  const paymentKind = value.paymentKind ?? inferPaymentKind(value.payment)
  const paymentState: PaymentState = value.paymentState ?? (paymentKind === 'cash' ? 'cash_due' : value.status === 'cancelled' ? 'refunded' : 'captured')
  const storeId = value.storeId ?? value.providerId ?? 1
  return {
    ...value,
    customerId: value.customerId ?? 'customer-demo',
    merchantId: value.merchantId ?? `merchant-${storeId}`,
    paymentKind,
    paymentState,
    offerAttempts: Number.isFinite(value.offerAttempts) ? value.offerAttempts : 0,
    events: Array.isArray(value.events) ? value.events : [],
  }
}


function legacyStatus(state: string): OperationStatus {
  if (state === 'aceptado') return 'accepted'
  if (state === 'preparando') return 'preparing'
  if (state === 'listo') return 'ready'
  if (state === 'entregado' || state === 'Entregado') return 'delivered'
  if (state === 'cancelado' || state === 'Cancelado') return 'cancelled'
  return 'created'
}

function legacyOperationBase(id: string, title: string, total: number, status: OperationStatus, storeId = 1, createdAt = new Date().toISOString()): IntegratedOperation {
  const store = stores.find((item) => item.id === storeId) ?? stores[0]
  const product = store.products[0]
  return {
    id,
    kind: store.category === 'envios' ? 'shipment' : 'order',
    category: store.category,
    customerId: 'customer-migrated',
    merchantId: `merchant-${store.id}`,
    storeId: store.category === 'envios' ? undefined : store.id,
    providerId: store.category === 'envios' ? store.id : undefined,
    serviceId: store.category === 'envios' ? product.id : undefined,
    customerName: 'Cliente migrado',
    merchantName: title || store.name,
    pickupAddress: `${title || store.name} · Lima Central`,
    dropoffAddress: 'Dirección migrada',
    items: [{ productId: product.id, name: product.name, quantity: 1, unitPrice: total, extras: [], note: 'Registro migrado' }],
    itemSummary: `1 ${product.name}`,
    total,
    subtotal: total,
    deliveryFee: 0,
    serviceFee: 0,
    discount: 0,
    platformRevenue: Number((total * .15).toFixed(2)),
    merchantNet: store.category === 'envios' ? 0 : Number((total * .75).toFixed(2)),
    riderPay: Number((total * .10).toFixed(2)),
    payment: 'Pago migrado',
    paymentKind: 'card',
    paymentState: status === 'cancelled' ? 'refunded' : 'captured',
    status,
    createdAt,
    updatedAt: createdAt,
    deliveredAt: status === 'delivered' ? createdAt : undefined,
    cancelledAt: status === 'cancelled' ? createdAt : undefined,
    offerAttempts: 0,
    events: [{ id: `${id}-migrated`, status, label: 'Registro migrado al motor integrado v1.4', at: createdAt, actor: 'system' }],
  }
}

function mergeLegacyOperations(candidate: Candidate, normalized: IntegratedOperation[]): IntegratedOperation[] {
  const result = [...normalized]
  const ids = new Set(result.map((item) => item.id))
  for (const record of candidate.history ?? []) {
    if (ids.has(record.id)) continue
    const store = stores.find((item) => item.id === record.storeId)
    const operation = legacyOperationBase(record.id, record.title, record.total, legacyStatus(record.status), store?.id ?? (record.kind === 'shipment' ? 10 : 1))
    result.push({ ...operation, rated: record.rated })
    ids.add(record.id)
  }
  for (const order of candidate.merchantOrders ?? []) {
    if (ids.has(order.id)) continue
    const profileName = candidate.merchantProfile?.name ?? defaultMerchantProfile.name
    const store = stores.find((item) => item.name === profileName) ?? stores[0]
    const operation = legacyOperationBase(order.id, store.name, order.total, legacyStatus(order.state), store.id)
    operation.customerName = order.customer
    operation.itemSummary = order.items
    operation.status = legacyStatus(order.state)
    result.push(operation)
    ids.add(order.id)
  }
  for (const offer of candidate.riderOffers ?? []) {
    const id = offer.orderId ?? `#MIG-${offer.id}`
    if (ids.has(id)) continue
    const store = stores.find((item) => item.name === offer.pickup) ?? stores[0]
    const operation = legacyOperationBase(id, store.name, Math.max(offer.pay * 3, offer.pay), 'ready', store.id)
    operation.dropoffAddress = offer.dropoff
    operation.riderPay = offer.pay
    result.push(operation)
    ids.add(id)
  }
  return result
}

function normalizeSnapshot(value: unknown): PersistedAppSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Candidate
  if (![1, 2, 3, 4, 5, 6, 7, 8, APP_SCHEMA_VERSION].includes(candidate.schemaVersion ?? -1)) return null
  if (!Array.isArray(candidate.addresses)) return null

  const states = initialMerchantStates()
  const currentMerchantStoreId = typeof candidate.currentMerchantStoreId === 'number' ? candidate.currentMerchantStoreId : 1
  if (candidate.merchantStates && typeof candidate.merchantStates === 'object') {
    for (const store of stores) {
      const saved = candidate.merchantStates[store.id]
      if (saved) states[store.id] = { ...states[store.id], ...saved, stock: { ...states[store.id].stock, ...(saved.stock ?? {}) }, productImages: { ...states[store.id].productImages, ...(saved.productImages ?? {}) } }
    }
  } else {
    states[currentMerchantStoreId] = {
      ...states[currentMerchantStoreId],
      open: candidate.merchantOpen !== false,
      autoAccept: candidate.merchantAutoAccept === true,
      stock: { ...states[currentMerchantStoreId].stock, ...(candidate.merchantStock ?? {}) },
    }
  }

  const routeStage = typeof candidate.riderRouteStage === 'number' ? Math.max(0, Math.min(3, Math.round(candidate.riderRouteStage))) : 0
  const operations = mergeLegacyOperations(candidate, Array.isArray(candidate.operations) ? candidate.operations.map(normalizeOperation) : [])

  return {
    schemaVersion: APP_SCHEMA_VERSION,
    updatedAt: candidate.updatedAt ?? new Date().toISOString(),
    onboardingComplete: candidate.onboardingComplete === true,
    role: candidate.role ?? 'cliente',
    authenticated: candidate.authenticated === true,
    guestSession: false,
    profile: candidate.profile ? { ...candidate.profile, photoUri: typeof candidate.profile.photoUri === 'string' ? candidate.profile.photoUri : null } : { name: 'Eidon Morimil', email: 'eidon@deliverassets.demo', phone: '+51 999 432 101', photoUri: null },
    merchantProfile: candidate.merchantProfile ?? defaultMerchantProfile,
    riderProfile: candidate.riderProfile ?? defaultRiderProfile,
    adminProfile: candidate.adminProfile ?? defaultAdminProfile,
    addresses: candidate.addresses,
    payments: Array.isArray(candidate.payments) ? candidate.payments : [],
    favorites: Array.isArray(candidate.favorites) ? candidate.favorites : [],
    notices: Array.isArray(candidate.notices) ? candidate.notices : [],
    supportMessages: Array.isArray(candidate.supportMessages) ? candidate.supportMessages : [],
    settings: candidate.settings ?? { orderUpdates: true, promotions: true, securityAlerts: true, locationWhileUsing: true, biometric: false, darkMode: false },
    desktopSessionActive: candidate.desktopSessionActive !== false,
    walletBalance: typeof candidate.walletBalance === 'number' ? candidate.walletBalance : 180,
    cart: Array.isArray(candidate.cart) ? candidate.cart.flatMap((line) => line && typeof line === 'object' && typeof line.storeId === 'number' && line.product ? [normalizeCartLine(line)] : []) : [],
    promo: candidate.promo ?? '',
    activeCartStoreId: typeof candidate.activeCartStoreId === 'number' ? candidate.activeCartStoreId : null,
    orderStage: typeof candidate.orderStage === 'number' ? candidate.orderStage : 0,
    deliveryKind: candidate.deliveryKind ?? 'order',
    activeShipment: candidate.activeShipment ?? null,
    activeOrder: candidate.activeOrder ?? null,
    activeOperationId: typeof candidate.activeOperationId === 'string' ? candidate.activeOperationId : null,
    operations,
    ledger: Array.isArray(candidate.ledger) ? candidate.ledger : [],
    history: Array.isArray(candidate.history) ? candidate.history : [],
    currentMerchantStoreId,
    merchantStates: states,
    merchantOpen: states[currentMerchantStoreId]?.open !== false,
    merchantAutoAccept: states[currentMerchantStoreId]?.autoAccept === true,
    merchantOrders: Array.isArray(candidate.merchantOrders) ? candidate.merchantOrders : [],
    merchantStock: states[currentMerchantStoreId]?.stock ?? {},
    riderOnline: candidate.riderOnline === true,
    riderVoiceNavigation: candidate.riderVoiceNavigation !== false,
    riderRouteStage: routeStage,
    riderOffers: Array.isArray(candidate.riderOffers) ? candidate.riderOffers : [],
    activeRiderOffer: candidate.activeRiderOffer ?? null,
    riderToday: typeof candidate.riderToday === 'number' ? candidate.riderToday : 0,
    riderHistory: Array.isArray(candidate.riderHistory) ? candidate.riderHistory : [],
    adminMaintenance: candidate.adminMaintenance === true,
    adminBlockUndeclared: candidate.adminBlockUndeclared !== false,
    adminEnhancedVerification: candidate.adminEnhancedVerification !== false,
    incidents: Array.isArray(candidate.incidents) ? candidate.incidents : [],
    pendingActions: Array.isArray(candidate.pendingActions) ? candidate.pendingActions : [],
    technicalEvents: Array.isArray(candidate.technicalEvents) ? candidate.technicalEvents.slice(0, 80) : [],
    hubRevision: typeof candidate.hubRevision === 'number' ? Math.max(0, Math.trunc(candidate.hubRevision)) : 0,
    hubDomainRevisions: {
      operations: typeof candidate.hubDomainRevisions?.operations === 'number' ? Math.max(0, Math.trunc(candidate.hubDomainRevisions.operations)) : 0,
      merchants: typeof candidate.hubDomainRevisions?.merchants === 'number' ? Math.max(0, Math.trunc(candidate.hubDomainRevisions.merchants)) : 0,
      admin: typeof candidate.hubDomainRevisions?.admin === 'number' ? Math.max(0, Math.trunc(candidate.hubDomainRevisions.admin)) : 0,
    },
  }
}

export async function loadAppSnapshot(): Promise<PersistedAppSnapshot | null> {
  const raw = await AsyncStorage.getItem(APP_STORAGE_KEY)
  if (!raw) return null
  try { return normalizeSnapshot(JSON.parse(raw) as unknown) } catch { return null }
}

export async function saveAppSnapshot(snapshot: PersistedAppSnapshot): Promise<void> {
  await AsyncStorage.setItem(APP_STORAGE_KEY, JSON.stringify(snapshot))
}

export async function clearAppSnapshot(): Promise<void> { await AsyncStorage.removeItem(APP_STORAGE_KEY) }
export async function getStoredBytes(): Promise<number> { const raw = await AsyncStorage.getItem(APP_STORAGE_KEY); return raw?.length ?? 0 }
