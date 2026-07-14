import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, AppState as NativeAppState } from 'react-native'
import type { Product, Store } from '@/data/catalog'
import { addOrMergeCartLine, cartLineSignature, createCartLine, normalizeCartLine, updateCartLineById } from '@/data/cart'
import type { CartLine } from '@/data/cart'
import { stores } from '@/data/catalog'
import {
  AppNotice,
  AppRole,
  Address,
  Incident,
  initialAddresses,
  initialIncidents,
  initialNotices,
  initialPayments,
  initialSupport,
  MerchantOrder,
  MerchantOrderState,
  OrderRecord,
  PaymentMethod,
  RiderDeliveryRecord,
  RiderOffer,
  SupportMessage,
} from '@/data/system'
import {
  appendOperationEvent,
  cancelIntegratedOperation,
  createOperationId,
  defaultAdminProfile,
  defaultRiderProfile,
  deriveCustomerHistory,
  deriveLedger,
  deriveMerchantOrders,
  deriveRiderHistory,
  deriveRiderOffers,
  initialIntegratedOperations,
  IntegratedOperation,
  LedgerEntry,
  makeRiderOffer,
  mergeIntegratedOperations,
  merchantStateToOperationStatus,
  operationStatusLabel,
  operationStatusToCustomerStage,
  OperatorProfile,
  PaymentKind,
  ShipmentDetails,
} from '@/data/operations'
import {
  createActionKey,
  createQueuedAction,
  createTechnicalEvent,
  delay,
  HealthCheck,
  NetworkMode,
  QueuedAction,
  QueuedActionKind,
  TechnicalEvent,
  TechnicalLevel,
} from '@/data/resilience'
import { backendConfig, HubDomainRevisions, pullHubState, SharedHubState, syncSnapshot } from '@/services/backend'
import { clearAppSnapshot, loadAppSnapshot, PersistedAppSnapshot, saveAppSnapshot } from '@/services/persistence'
import { clearCartDraft, flushCartWrites, loadCartDraft, saveCartDraft } from '@/services/cartPersistence'
import { cleanupProfilePhotos, profilePhotoExists } from '@/services/profilePhoto'

export type DeliveryKind = 'order' | 'shipment'
export type Shipment = {
  providerId: number
  serviceId: number
  pickupAddress: string
  dropoffAddress: string
  senderName: string
  senderPhone: string
  recipientName: string
  recipientPhone: string
  content: string
  options: string[]
  total: number
  baseTotal: number
  discount: number
  weightKg: number
  pieces: number
  dimensions: string
  declaredValue: number
}
export type ActiveOrder = { id: string; storeId: number; lines: CartLine[]; total: number; payment: string; address: string }
export type UserSettings = { orderUpdates: boolean; promotions: boolean; securityAlerts: boolean; locationWhileUsing: boolean; biometric: boolean; darkMode: boolean }
export type UserProfile = { name: string; email: string; phone: string; photoUri?: string | null }
export type PersistenceStatus = 'loading' | 'ready' | 'saving' | 'error'
export type SyncStatus = 'local' | 'pending' | 'synced' | 'error'
export type ActionResult = { ok: boolean; message: string; operationId?: string; code?: 'duplicate' }
export type MerchantStoreState = { storeId: number; open: boolean; autoAccept: boolean; stock: Record<number, boolean>; productImages: Record<number, string | null> }
export type SavedCartSummary = { storeId: number; store: Store; itemCount: number; lineCount: number; subtotal: number; total: number; updatedAt: string }

const defaultSettings: UserSettings = { orderUpdates: true, promotions: true, securityAlerts: true, locationWhileUsing: true, biometric: false, darkMode: false }
const defaultProfile: UserProfile = { name: 'Eidon Morimil', email: 'eidon@deliverassets.demo', phone: '+51 999 432 101', photoUri: null }
const customerId = 'customer-demo'
const riderId = 'rider-demo'

const createMerchantStates = (): Record<number, MerchantStoreState> => Object.fromEntries(stores.map((store) => [store.id, {
  storeId: store.id,
  open: true,
  autoAccept: false,
  stock: Object.fromEntries(store.products.map((product) => [product.id, true])),
  productImages: Object.fromEntries(store.products.map((product) => [product.id, null])),
}]))

function storeProfile(storeId: number): OperatorProfile {
  const store = stores.find((item) => item.id === storeId) ?? stores[0]
  return {
    name: store.name,
    email: `${store.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@deliverassets.demo`,
    phone: '+51 940 120 310',
    subtitle: `${store.category[0].toUpperCase() + store.category.slice(1)} · Lima Central · comercio independiente`,
  }
}

function suspiciousShipment(content: string): boolean {
  const value = content.trim().toLowerCase()
  if (value.length < 5) return true
  return ['no sé', 'desconocido', 'secreto', 'sin declarar', 'efectivo', 'arma', 'sustancia'].some((term) => value.includes(term))
}

function normalizeMerchantStates(value: unknown): Record<number, MerchantStoreState> {
  const defaults = createMerchantStates()
  if (!value || typeof value !== 'object') return defaults
  const source = value as Record<number, Partial<MerchantStoreState>>
  for (const store of stores) {
    const saved = source[store.id]
    if (!saved) continue
    defaults[store.id] = {
      ...defaults[store.id],
      ...saved,
      storeId: store.id,
      stock: { ...defaults[store.id].stock, ...(saved.stock ?? {}) },
      productImages: { ...defaults[store.id].productImages, ...(saved.productImages ?? {}) },
    }
  }
  return defaults
}

function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second)
}

function cartLineSubtotal(line: CartLine): number {
  const extras = line.extras.reduce((sum, label) => sum + (line.product.options?.find((option) => option.label === label)?.price ?? 0), 0)
  return (line.product.price + extras) * line.quantity
}

export type AppState = {
  hydrated: boolean
  onboardingComplete: boolean
  completeOnboarding: () => void
  persistenceStatus: PersistenceStatus
  syncStatus: SyncStatus
  syncMessage: string
  lastSavedAt: string | null
  hubRevision: number
  hubConnected: boolean
  lastHubSyncAt: string | null
  backendMode: 'local' | 'remote'
  backendConfigured: boolean
  saveNow: () => Promise<boolean>
  syncNow: () => Promise<boolean>
  resetDemoData: () => Promise<void>
  networkMode: NetworkMode
  setNetworkMode: (mode: NetworkMode) => void
  pendingActions: QueuedAction[]
  technicalEvents: TechnicalEvent[]
  lastLifecycleState: string
  reducedMotion: boolean
  retryPendingActions: () => Promise<boolean>
  clearTechnicalEvents: () => void
  runHealthCheck: () => Promise<HealthCheck[]>

  role: AppRole
  authenticated: boolean
  guestSession: boolean
  setRole: (role: AppRole) => void
  authenticate: (role: AppRole, guest?: boolean) => void
  logout: () => void

  profile: UserProfile
  updateProfile: (profile: UserProfile) => void
  merchantProfile: OperatorProfile
  riderProfile: OperatorProfile
  adminProfile: OperatorProfile

  address: string
  setAddress: (value: string) => void
  addresses: Address[]
  addAddress: (address: Omit<Address, 'id' | 'selected'>) => void
  selectAddress: (id: string) => void
  deleteAddress: (id: string) => void

  payments: PaymentMethod[]
  selectPayment: (id: string) => void
  addDemoCard: () => void
  deletePayment: (id: string) => void
  selectedPayment: PaymentMethod
  walletBalance: number
  walletEntries: LedgerEntry[]

  favorites: number[]
  toggleFavorite: (storeId: number) => void
  notices: AppNotice[]
  unreadNotices: number
  markNoticeRead: (id: string) => void
  markAllNoticesRead: () => void
  supportMessages: SupportMessage[]
  sendSupportMessage: (text: string) => void
  settings: UserSettings
  toggleSetting: (key: keyof UserSettings) => void
  desktopSessionActive: boolean
  closeDesktopSession: () => void

  cart: CartLine[]
  allCartLines: CartLine[]
  cartCount: number
  allCartCount: number
  cartStoreCount: number
  savedCarts: SavedCartSummary[]
  activeCartStoreId: number | null
  selectCartStore: (storeId: number) => boolean
  cartStore: Store | null
  cartLastSavedAt: string | null
  cartPersistenceStatus: PersistenceStatus
  cartRecovered: boolean
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  total: number
  promo: string
  applyPromo: (code: string) => boolean
  addToCart: (store: Store, product: Product, quantity: number, note: string, extras: string[]) => ActionResult
  replaceCartWithProduct: (store: Store, product: Product, quantity: number, note: string, extras: string[]) => ActionResult
  updateQuantity: (productId: number, delta: number, note?: string, extras?: string[]) => void
  updateCartLineQuantity: (lineId: string, delta: number) => void
  removeCartLine: (lineId: string) => void
  clearCart: () => void
  clearAllCarts: () => void

  orderStage: number
  setOrderStage: (stage: number) => void
  deliveryKind: DeliveryKind
  activeShipment: Shipment | null
  activeOrder: ActiveOrder | null
  activeOperation: IntegratedOperation | null
  operations: IntegratedOperation[]
  ledger: LedgerEntry[]
  operationStatusText: string
  financeSummary: { grossVolume: number; merchantCredits: number; riderCredits: number; platformRevenue: number; customerCharges: number; refunds: number }
  startOrder: () => ActionResult
  startShipment: (shipment: Shipment) => ActionResult
  advanceDelivery: () => void
  finishDelivery: () => void
  cancelOperation: (id: string, actor: 'customer' | 'merchant' | 'admin', reason: string) => ActionResult
  history: OrderRecord[]
  reorder: (orderId: string) => boolean
  rateOrder: (orderId: string) => void

  currentMerchantStoreId: number
  selectMerchantStore: (storeId: number) => void
  merchantStates: Record<number, MerchantStoreState>
  isStoreOpen: (storeId: number) => boolean
  isProductAvailable: (storeId: number, productId: number) => boolean
  getProductImage: (storeId: number, productId: number) => string | null
  merchantOpen: boolean
  setMerchantOpen: (value: boolean) => void
  merchantAutoAccept: boolean
  setMerchantAutoAccept: (value: boolean) => void
  merchantOrders: MerchantOrder[]
  moveMerchantOrder: (id: string, state: MerchantOrderState) => void
  addMerchantDemoOrder: () => void
  merchantStock: Record<number, boolean>
  toggleMerchantStock: (productId: number) => void

  riderOnline: boolean
  setRiderOnline: (value: boolean) => void
  riderVoiceNavigation: boolean
  setRiderVoiceNavigation: (value: boolean) => void
  riderRouteStage: number
  advanceRiderRoute: () => void
  riderOffers: RiderOffer[]
  activeRiderOffer: RiderOffer | null
  acceptRiderOffer: (id: string) => ActionResult
  rejectRiderOffer: (id: string) => void
  completeRiderOffer: () => void
  riderToday: number
  riderHistory: RiderDeliveryRecord[]

  adminMaintenance: boolean
  setAdminMaintenance: (value: boolean) => void
  adminBlockUndeclared: boolean
  setAdminBlockUndeclared: (value: boolean) => void
  adminEnhancedVerification: boolean
  setAdminEnhancedVerification: (value: boolean) => void
  incidents: Incident[]
  resolveIncident: (id: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('loading')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(backendConfig.requestedMode === 'local' ? 'local' : 'pending')
  const [syncMessage, setSyncMessage] = useState('Datos locales pendientes de cargar.')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [hubRevision, setHubRevision] = useState(0)
  const [hubDomainRevisions, setHubDomainRevisions] = useState<HubDomainRevisions>({ operations: 0, merchants: 0, admin: 0 })
  const [hubConnected, setHubConnected] = useState(false)
  const [lastHubSyncAt, setLastHubSyncAt] = useState<string | null>(null)
  const [networkMode, setNetworkModeState] = useState<NetworkMode>('online')
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([])
  const [technicalEvents, setTechnicalEvents] = useState<TechnicalEvent[]>([
    createTechnicalEvent('info', 'boot', 'Centro de resistencia inicializado.'),
  ])
  const [lastLifecycleState, setLastLifecycleState] = useState('active')
  const [reducedMotion, setReducedMotion] = useState(false)
  const criticalLocksRef = useRef<Map<string, number>>(new Map())
  const autoFlushSignatureRef = useRef('')
  const hubRequestInFlightRef = useRef(false)
  const hubRevisionRef = useRef(0)
  const hubConnectedRef = useRef(false)
  const snapshotRef = useRef<PersistedAppSnapshot | null>(null)
  const hubDomainRevisionsRef = useRef<HubDomainRevisions>({ operations: 0, merchants: 0, admin: 0 })
  const merchantDomainDirtyRef = useRef(false)
  const adminDomainDirtyRef = useRef(false)
  const lastSharedSignatureRef = useRef('')

  const [role, setRole] = useState<AppRole>('cliente')
  const [authenticated, setAuthenticated] = useState(false)
  const [guestSession, setGuestSession] = useState(false)
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [riderProfile] = useState<OperatorProfile>(defaultRiderProfile)
  const [adminProfile] = useState<OperatorProfile>(defaultAdminProfile)
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [payments, setPayments] = useState<PaymentMethod[]>(initialPayments)
  const [favorites, setFavorites] = useState<number[]>([1, 10])
  const [notices, setNotices] = useState<AppNotice[]>(initialNotices)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>(initialSupport)
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [desktopSessionActive, setDesktopSessionActive] = useState(true)
  const [walletBalance, setWalletBalance] = useState(180)

  const [cartLines, setCartLines] = useState<CartLine[]>([])
  const [activeCartStoreId, setActiveCartStoreId] = useState<number | null>(null)
  const [cartLastSavedAt, setCartLastSavedAt] = useState<string | null>(null)
  const [cartPersistenceStatus, setCartPersistenceStatus] = useState<PersistenceStatus>('loading')
  const [cartRecovered, setCartRecovered] = useState(false)
  const [promo, setPromo] = useState('')
  const [orderStage, setOrderStage] = useState(0)
  const [deliveryKind, setDeliveryKind] = useState<DeliveryKind>('order')
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null)
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null)
  const [operations, setOperations] = useState<IntegratedOperation[]>(initialIntegratedOperations)

  const [currentMerchantStoreId, setCurrentMerchantStoreId] = useState(1)
  const [merchantStates, setMerchantStates] = useState<Record<number, MerchantStoreState>>(createMerchantStates)

  const [riderOnline, setRiderOnline] = useState(false)
  const [riderVoiceNavigation, setRiderVoiceNavigation] = useState(true)
  const [riderRouteStage, setRiderRouteStage] = useState(0)
  const [activeRiderOffer, setActiveRiderOffer] = useState<RiderOffer | null>(null)

  const [adminMaintenance, setAdminMaintenanceState] = useState(false)
  const [adminBlockUndeclared, setAdminBlockUndeclaredState] = useState(true)
  const [adminEnhancedVerification, setAdminEnhancedVerificationState] = useState(true)
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents)

  const selectedAddress = addresses.find((item) => item.selected) ?? addresses[0]
  const address = selectedAddress?.line ?? 'Selecciona una dirección'
  const selectedPayment = payments.find((item) => item.selected) ?? payments[0]
  const activeOperation = operations.find((operation) => operation.id === activeOperationId) ?? null
  const operationStatusText = activeOperation ? operationStatusLabel(activeOperation.status) : 'Sin operación activa'
  const merchantProfile = useMemo(() => storeProfile(currentMerchantStoreId), [currentMerchantStoreId])
  const currentMerchantState = merchantStates[currentMerchantStoreId] ?? createMerchantStates()[currentMerchantStoreId]
  const merchantOpen = currentMerchantState.open
  const merchantAutoAccept = currentMerchantState.autoAccept
  const merchantStock = currentMerchantState.stock

  const ledger = useMemo(() => deriveLedger(operations), [operations])
  const history = useMemo(() => deriveCustomerHistory(operations), [operations])
  const merchantOrders = useMemo(() => deriveMerchantOrders(operations, currentMerchantStoreId), [operations, currentMerchantStoreId])
  const riderOffers = useMemo(() => deriveRiderOffers(operations, activeRiderOffer?.orderId), [operations, activeRiderOffer?.orderId])
  const riderHistory = useMemo(() => deriveRiderHistory(operations), [operations])
  const riderToday = useMemo(() => {
    const today = new Date().toDateString()
    return riderHistory.filter((record) => record.completedAtIso && new Date(record.completedAtIso).toDateString() === today).reduce((sum, record) => sum + record.pay, 0)
  }, [riderHistory])
  const walletEntries = useMemo(() => ledger.filter((entry) => entry.owner === 'customer'), [ledger])

  const financeSummary = useMemo(() => {
    const grossVolume = operations.filter((operation) => operation.status !== 'cancelled').reduce((sum, operation) => sum + operation.total, 0)
    const customerCharges = ledger.filter((entry) => entry.owner === 'customer' && entry.type === 'charge').reduce((sum, entry) => sum + entry.amount, 0)
    const refunds = ledger.filter((entry) => entry.type === 'refund').reduce((sum, entry) => sum + entry.amount, 0)
    const merchantCredits = ledger.filter((entry) => entry.type === 'merchant_credit').reduce((sum, entry) => sum + entry.amount, 0)
    const riderCredits = ledger.filter((entry) => entry.type === 'rider_credit').reduce((sum, entry) => sum + entry.amount, 0)
    const platformRevenue = ledger.filter((entry) => entry.type === 'platform_credit').reduce((sum, entry) => sum + entry.amount, 0)
    return { grossVolume, merchantCredits, riderCredits, platformRevenue, customerCharges, refunds }
  }, [ledger, operations])

  const resolvedActiveCartStoreId = useMemo(() => {
    if (!cartLines.length) return null
    if (activeCartStoreId && cartLines.some((line) => line.storeId === activeCartStoreId)) return activeCartStoreId
    return [...cartLines].sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))[0]?.storeId ?? cartLines[0].storeId
  }, [activeCartStoreId, cartLines])
  const cart = useMemo(() => resolvedActiveCartStoreId === null ? [] : cartLines.filter((line) => line.storeId === resolvedActiveCartStoreId), [cartLines, resolvedActiveCartStoreId])
  const cartStore = useMemo(() => stores.find((store) => store.id === resolvedActiveCartStoreId) ?? null, [resolvedActiveCartStoreId])
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const allCartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotal = cart.reduce((sum, line) => sum + cartLineSubtotal(line), 0)
  const deliveryFee = cartStore?.delivery ?? 0
  const serviceFee = subtotal > 0 ? 1.9 : 0
  const discount = promo === 'PRIMER20' ? Math.min(15, subtotal * 0.2)
    : promo === 'COMIDA10' && cartStore?.category === 'comida' ? Math.min(10, subtotal)
      : promo === 'MERCADO8' && cartStore?.category === 'mercado' ? Math.min(8, subtotal)
        : promo === 'CUIDADO5' && cartStore?.category === 'farmacia' ? Math.min(5, subtotal)
          : 0
  const total = Math.max(0, subtotal + deliveryFee + serviceFee - discount)
  const savedCarts = useMemo<SavedCartSummary[]>(() => {
    const grouped = new Map<number, CartLine[]>()
    for (const line of cartLines) grouped.set(line.storeId, [...(grouped.get(line.storeId) ?? []), line])
    return [...grouped.entries()].flatMap(([storeId, lines]) => {
      const store = stores.find((item) => item.id === storeId)
      if (!store) return []
      const groupSubtotal = lines.reduce((sum, line) => sum + cartLineSubtotal(line), 0)
      const groupService = groupSubtotal > 0 ? 1.9 : 0
      return [{
        storeId,
        store,
        itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
        lineCount: lines.length,
        subtotal: groupSubtotal,
        total: groupSubtotal + store.delivery + groupService,
        updatedAt: lines.reduce((latest, line) => Date.parse(line.updatedAt) > Date.parse(latest) ? line.updatedAt : latest, lines[0].updatedAt),
      }]
    }).sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))
  }, [cartLines])
  const cartStoreCount = savedCarts.length
  const unreadNotices = notices.filter((notice) => !notice.read).length

  useEffect(() => {
    if (resolvedActiveCartStoreId !== activeCartStoreId) setActiveCartStoreId(resolvedActiveCartStoreId)
  }, [activeCartStoreId, resolvedActiveCartStoreId])

  const logTechnicalEvent = useCallback((level: TechnicalLevel, scope: string, message: string) => {
    setTechnicalEvents((current) => [createTechnicalEvent(level, scope, message), ...current].slice(0, 80))
  }, [])

  const setNetworkMode = useCallback((mode: NetworkMode) => {
    setNetworkModeState(mode)
    logTechnicalEvent(
      mode === 'offline' ? 'warning' : mode === 'slow' ? 'info' : 'success',
      'network',
      mode === 'offline' ? 'Simulación sin red activada; las mutaciones se conservarán en cola.'
        : mode === 'slow' ? 'Simulación de red lenta activada.'
          : 'Simulación online activada.',
    )
  }, [logTechnicalEvent])

  const claimCriticalAction = useCallback((key: string): boolean => {
    const now = Date.now()
    const expiresAt = criticalLocksRef.current.get(key) ?? 0
    if (expiresAt > now) {
      logTechnicalEvent('warning', 'idempotency', `Acción duplicada bloqueada: ${key.slice(0, 42)}.`)
      return false
    }
    criticalLocksRef.current.set(key, now + 1800)
    setTimeout(() => {
      if ((criticalLocksRef.current.get(key) ?? 0) <= Date.now()) criticalLocksRef.current.delete(key)
    }, 1900)
    return true
  }, [logTechnicalEvent])

  const queueAction = useCallback((kind: QueuedActionKind, entityId: string, label: string, payload?: unknown) => {
    const action = createQueuedAction(kind, entityId, label, payload)
    setPendingActions((current) => current.some((item) => item.key === action.key) ? current : [...current, action])
    logTechnicalEvent(networkMode === 'offline' ? 'warning' : 'info', 'queue', `${label} · ${entityId}`)
  }, [logTechnicalEvent, networkMode])

  const snapshot = useMemo<PersistedAppSnapshot>(() => ({
    schemaVersion: 9,
    updatedAt: new Date().toISOString(),
    onboardingComplete,
    role,
    authenticated: guestSession ? false : authenticated,
    guestSession: false,
    profile,
    merchantProfile,
    riderProfile,
    adminProfile,
    addresses,
    payments,
    favorites,
    notices,
    supportMessages,
    settings,
    desktopSessionActive,
    walletBalance,
    cart: guestSession ? [] : cartLines,
    promo: guestSession ? '' : promo,
    activeCartStoreId: guestSession ? null : resolvedActiveCartStoreId,
    orderStage,
    deliveryKind,
    activeShipment,
    activeOrder,
    activeOperationId,
    operations,
    ledger,
    history,
    currentMerchantStoreId,
    merchantStates,
    merchantOpen,
    merchantAutoAccept,
    merchantOrders,
    merchantStock,
    riderOnline,
    riderVoiceNavigation,
    riderRouteStage,
    riderOffers,
    activeRiderOffer,
    riderToday,
    riderHistory,
    adminMaintenance,
    adminBlockUndeclared,
    adminEnhancedVerification,
    incidents,
    pendingActions,
    technicalEvents,
    hubRevision,
    hubDomainRevisions,
  }), [onboardingComplete, role, authenticated, guestSession, profile, merchantProfile, riderProfile, adminProfile, addresses, payments, favorites, notices, supportMessages, settings, desktopSessionActive, walletBalance, cartLines, promo, resolvedActiveCartStoreId, orderStage, deliveryKind, activeShipment, activeOrder, activeOperationId, operations, ledger, history, currentMerchantStoreId, merchantStates, merchantOpen, merchantAutoAccept, merchantOrders, merchantStock, riderOnline, riderVoiceNavigation, riderRouteStage, riderOffers, activeRiderOffer, riderToday, riderHistory, adminMaintenance, adminBlockUndeclared, adminEnhancedVerification, incidents, pendingActions, technicalEvents, hubRevision, hubDomainRevisions])

  useEffect(() => {
    snapshotRef.current = snapshot
    hubDomainRevisionsRef.current = hubDomainRevisions
    hubRevisionRef.current = hubRevision
  }, [hubDomainRevisions, hubRevision, snapshot])


  useEffect(() => {
    let mounted = true
    const hydrate = async () => {
      try {
        const [saved, cartDraftResult] = await Promise.all([loadAppSnapshot(), loadCartDraft()])
        if (!mounted) return
        const cartDraft = cartDraftResult.draft
        if (saved) {
          setOnboardingComplete(saved.onboardingComplete)
          setRole(saved.role)
          setAuthenticated(saved.authenticated)
          setGuestSession(false)
          const activePhotoUri = profilePhotoExists(saved.profile.photoUri) ? saved.profile.photoUri : null
          cleanupProfilePhotos(activePhotoUri ?? undefined)
          setProfile({ ...saved.profile, photoUri: activePhotoUri })
          setAddresses(saved.addresses)
          setPayments(saved.payments)
          setFavorites(saved.favorites)
          setNotices(saved.notices)
          setSupportMessages(saved.supportMessages)
          setSettings(saved.settings)
          setDesktopSessionActive(saved.desktopSessionActive)
          setWalletBalance(saved.walletBalance)
          // The independent cart draft is authoritative. The complete app snapshot may
          // finish an older asynchronous write after a cart mutation, so it must never
          // replace a valid dedicated draft during hydration.
          const restoredCart = cartDraft ? cartDraft.cart : saved.cart.map(normalizeCartLine)
          setCartLines(restoredCart)
          setActiveCartStoreId(cartDraft?.activeStoreId ?? saved.activeCartStoreId ?? restoredCart[0]?.storeId ?? null)
          setPromo(cartDraft ? cartDraft.promo : saved.promo)
          setCartLastSavedAt(cartDraft?.updatedAt ?? saved.updatedAt)
          setCartRecovered(cartDraftResult.recoveredFromBackup)
          setOrderStage(saved.orderStage)
          setDeliveryKind(saved.deliveryKind)
          setActiveShipment(saved.activeShipment)
          setActiveOrder(saved.activeOrder)
          setActiveOperationId(saved.activeOperationId)
          setOperations(saved.operations.length ? saved.operations : initialIntegratedOperations)
          setCurrentMerchantStoreId(saved.currentMerchantStoreId ?? 1)
          setMerchantStates(normalizeMerchantStates(saved.merchantStates))
          setRiderOnline(saved.riderOnline)
          setRiderVoiceNavigation(saved.riderVoiceNavigation)
          setRiderRouteStage(saved.riderRouteStage)
          setActiveRiderOffer(saved.activeRiderOffer)
          setAdminMaintenanceState(saved.adminMaintenance)
          setAdminBlockUndeclaredState(saved.adminBlockUndeclared)
          setAdminEnhancedVerificationState(saved.adminEnhancedVerification)
          setIncidents(saved.incidents)
          const savedActions = saved.pendingActions ?? []
          setPendingActions(savedActions)
          merchantDomainDirtyRef.current = savedActions.some((action) => action.kind === 'merchant_settings')
          adminDomainDirtyRef.current = savedActions.some((action) => action.kind === 'admin_policy' || action.kind === 'incident_resolve')
          const savedHubRevisions = saved.hubDomainRevisions ?? { operations: 0, merchants: 0, admin: 0 }
          setHubRevision(saved.hubRevision ?? 0)
          setHubDomainRevisions(savedHubRevisions)
          hubDomainRevisionsRef.current = savedHubRevisions
          setTechnicalEvents((saved.technicalEvents?.length ? saved.technicalEvents : [createTechnicalEvent('info', 'hydrate', 'Estado local restaurado.')]).slice(0, 80))
          setLastSavedAt(saved.updatedAt)
          setSyncMessage('Datos locales restaurados y reconciliados desde operaciones.')
        } else {
          if (cartDraft) {
            setCartLines(cartDraft.cart)
            setActiveCartStoreId(cartDraft.activeStoreId ?? cartDraft.cart[0]?.storeId ?? null)
            setPromo(cartDraft.promo)
            setCartLastSavedAt(cartDraft.updatedAt)
            setCartRecovered(cartDraftResult.recoveredFromBackup)
          }
          setSyncMessage('Primera ejecución: se creó el estado integrado local.')
        }
        setCartPersistenceStatus('ready')
        setPersistenceStatus('ready')
        setSyncStatus(backendConfig.requestedMode === 'local' ? 'local' : 'pending')
      } catch {
        if (!mounted) return
        setPersistenceStatus('error')
        setCartPersistenceStatus('error')
        setSyncStatus('error')
        setSyncMessage('No se pudo leer el almacenamiento local.')
      } finally {
        if (mounted) setHydrated(true)
      }
    }
    void hydrate()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!hydrated || guestSession) return
    setPersistenceStatus('saving')
    const timer = setTimeout(() => {
      void saveAppSnapshot(snapshot).then(() => {
        setLastSavedAt(snapshot.updatedAt)
        setPersistenceStatus('ready')
        if (backendConfig.requestedMode === 'local') {
          setSyncStatus('local')
          setSyncMessage('Guardado local automático activo.')
        } else {
          setSyncMessage(hubConnected ? `Guardado local y conectado al Sync Hub · revisión ${hubRevision}.` : 'Guardado local; esperando conexión con Sync Hub.')
        }
      }).catch(() => {
        setPersistenceStatus('error')
        setSyncStatus('error')
        setSyncMessage('Falló el guardado local.')
      })
    }, 350)
    return () => clearTimeout(timer)
  }, [guestSession, hubConnected, hubRevision, hydrated, snapshot])

  useEffect(() => {
    if (!hydrated || guestSession) return
    setCartPersistenceStatus('saving')
    const timer = setTimeout(() => {
      const updatedAt = new Date().toISOString()
      void saveCartDraft(cartLines, promo, resolvedActiveCartStoreId, updatedAt).then(() => {
        setCartLastSavedAt(updatedAt)
        setCartPersistenceStatus('ready')
      }).catch(() => {
        setCartPersistenceStatus('error')
        logTechnicalEvent('error', 'cart', 'No se pudo guardar el carrito independiente.')
      })
    }, 90)
    return () => clearTimeout(timer)
  }, [cartLines, guestSession, hydrated, logTechnicalEvent, promo, resolvedActiveCartStoreId])

  useEffect(() => {
    if (!hydrated || guestSession) return
    const subscription = NativeAppState.addEventListener('change', (nextState) => {
      setLastLifecycleState(nextState)
      logTechnicalEvent('info', 'lifecycle', `Android cambió a ${nextState}.`)
      if (nextState === 'background' || nextState === 'inactive') {
        const cartUpdatedAt = new Date().toISOString()
        void Promise.all([saveAppSnapshot(snapshot), saveCartDraft(cartLines, promo, resolvedActiveCartStoreId, cartUpdatedAt), flushCartWrites()]).then(() => {
          setLastSavedAt(snapshot.updatedAt)
          setCartLastSavedAt(cartUpdatedAt)
          setCartPersistenceStatus('ready')
          logTechnicalEvent('success', 'persistence', 'Estado y carrito guardados al salir de primer plano.')
        }).catch(() => {
          setPersistenceStatus('error')
          setCartPersistenceStatus('error')
          logTechnicalEvent('error', 'persistence', 'Falló el guardado al cambiar el ciclo de vida.')
        })
      }
    })
    return () => subscription.remove()
  }, [cartLines, hydrated, guestSession, logTechnicalEvent, promo, resolvedActiveCartStoreId, snapshot])

  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReducedMotion(value)
      logTechnicalEvent('info', 'accessibility', value ? 'Movimiento reducido activado.' : 'Movimiento reducido desactivado.')
    })
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [logTechnicalEvent])

  useEffect(() => {
    if (!activeOperation) return
    const nextStage = operationStatusToCustomerStage(activeOperation)
    if (nextStage !== orderStage) setOrderStage(nextStage)
  }, [activeOperation, orderStage])

  useEffect(() => {
    const detail = `Saldo demo S/ ${walletBalance.toFixed(2)}`
    setPayments((current) => current.map((method) => method.kind === 'wallet' && method.detail !== detail ? { ...method, detail } : method))
  }, [walletBalance])

  const saveNow = useCallback(async () => {
    if (guestSession) { setSyncMessage('La sesión invitada no persiste datos.'); return true }
    try {
      setPersistenceStatus('saving')
      setCartPersistenceStatus('saving')
      const cartUpdatedAt = new Date().toISOString()
      await Promise.all([saveAppSnapshot(snapshot), saveCartDraft(cartLines, promo, resolvedActiveCartStoreId, cartUpdatedAt)])
      setLastSavedAt(snapshot.updatedAt)
      setCartLastSavedAt(cartUpdatedAt)
      setPersistenceStatus('ready')
      setCartPersistenceStatus('ready')
      setSyncMessage('Guardado manual completado.')
      return true
    } catch {
      setPersistenceStatus('error')
      setSyncStatus('error')
      setSyncMessage('No se pudo guardar el estado.')
      return false
    }
  }, [cartLines, guestSession, promo, resolvedActiveCartStoreId, snapshot])

  const applyHubState = useCallback((state: SharedHubState, authoritative: boolean) => {
    const previousRevision = hubRevisionRef.current
    setHubRevision((current) => current === state.revision ? current : state.revision)
    hubRevisionRef.current = state.revision
    setHubDomainRevisions((current) => current.operations === state.domainRevisions.operations && current.merchants === state.domainRevisions.merchants && current.admin === state.domainRevisions.admin ? current : state.domainRevisions)
    hubDomainRevisionsRef.current = state.domainRevisions
    if (state.revision !== previousRevision || !hubConnectedRef.current) setLastHubSyncAt(new Date().toISOString())
    setHubConnected(true)
    hubConnectedRef.current = true
    setOperations((current) => {
      const merged = authoritative
        ? [...state.operations, ...current.filter((operation) => !state.operations.some((remote) => remote.id === operation.id))]
        : mergeIntegratedOperations(current, state.operations)
      return sameJson(current, merged) ? current : merged
    })

    if (state.merchantStates && (authoritative || !merchantDomainDirtyRef.current)) {
      setMerchantStates((current) => { const normalized = normalizeMerchantStates(state.merchantStates); return sameJson(current, normalized) ? current : normalized })
      if (authoritative) merchantDomainDirtyRef.current = false
    }
    if (state.admin && (authoritative || !adminDomainDirtyRef.current)) {
      setAdminMaintenanceState((current) => current === state.admin!.maintenance ? current : state.admin!.maintenance)
      setAdminBlockUndeclaredState((current) => current === state.admin!.blockUndeclared ? current : state.admin!.blockUndeclared)
      setAdminEnhancedVerificationState((current) => current === state.admin!.enhancedVerification ? current : state.admin!.enhancedVerification)
      setIncidents((current) => sameJson(current, state.admin!.incidents) ? current : state.admin!.incidents)
      if (authoritative) adminDomainDirtyRef.current = false
    }
    if (state.revision > previousRevision) {
      logTechnicalEvent('success', 'hub', `Estado global actualizado a revisión ${state.revision}.`)
    }
  }, [logTechnicalEvent])

  const performHubSync = useCallback(async (reason: 'auto' | 'manual' | 'queue', idempotencyKey?: string): Promise<boolean> => {
    if (backendConfig.requestedMode === 'local') {
      setSyncStatus('local')
      setSyncMessage('Modo local: no existe sincronización entre aplicaciones.')
      return true
    }
    if (networkMode === 'offline') {
      setSyncStatus('pending')
      setHubConnected(false)
      hubConnectedRef.current = false
      setSyncMessage('Sin red simulada: los cambios permanecen en la cola local.')
      return false
    }
    if (hubRequestInFlightRef.current) return false
    const currentSnapshot = snapshotRef.current
    if (!currentSnapshot) return false

    hubRequestInFlightRef.current = true
    setSyncStatus('pending')
    if (reason !== 'auto') setSyncMessage(reason === 'queue' ? 'Conciliando acciones pendientes…' : 'Sincronizando las cuatro aplicaciones…')
    const merchantWasDirty = merchantDomainDirtyRef.current
    const adminWasDirty = adminDomainDirtyRef.current
    try {
      const result = await syncSnapshot(currentSnapshot, {
        idempotencyKey,
        domainRevisions: hubDomainRevisionsRef.current,
        timeoutMs: networkMode === 'slow' ? 12000 : 7000,
        simulatedDelayMs: networkMode === 'slow' ? 1200 : 0,
        retries: 1,
      })
      if (!result.ok) {
        setHubConnected(false)
        hubConnectedRef.current = false
        setSyncStatus('error')
        setSyncMessage(`${result.message} Mantén abierto el Sync Hub en la PC.`)
        if (reason !== 'auto') logTechnicalEvent('error', 'hub', result.message)
        return false
      }

      if (merchantWasDirty && backendConfig.appId === 'business' && !result.accepted.merchants) {
        logTechnicalEvent('warning', 'conflict', 'El servidor conservó una configuración comercial más reciente.')
      }
      if (adminWasDirty && backendConfig.appId === 'control' && !result.accepted.admin) {
        logTechnicalEvent('warning', 'conflict', 'El servidor conservó políticas administrativas más recientes.')
      }

      applyHubState(result.state, true)
      setPendingActions([])
      merchantDomainDirtyRef.current = false
      adminDomainDirtyRef.current = false
      setSyncStatus(result.mode === 'local' ? 'local' : 'synced')
      setSyncMessage(result.mode === 'local'
        ? 'Estado local verificado.'
        : `Cuatro aplicaciones sincronizadas · revisión ${result.state.revision}.`)
      if (reason !== 'auto') logTechnicalEvent('success', 'hub', `Sincronización ${reason} completada en ${result.attempts} intento(s).`)
      return true
    } finally {
      hubRequestInFlightRef.current = false
    }
  }, [applyHubState, logTechnicalEvent, networkMode])

  const pullLatestHubState = useCallback(async (silent = true): Promise<boolean> => {
    if (backendConfig.requestedMode === 'local' || networkMode === 'offline' || hubRequestInFlightRef.current) return false
    hubRequestInFlightRef.current = true
    try {
      const result = await pullHubState({
        timeoutMs: networkMode === 'slow' ? 9000 : 4500,
        simulatedDelayMs: networkMode === 'slow' ? 700 : 0,
      })
      if (!result.ok) {
        setHubConnected(false)
        hubConnectedRef.current = false
        setSyncStatus('error')
        setSyncMessage(`${result.message} Ejecuta scripts\\start-hub.ps1.`)
        if (!silent) logTechnicalEvent('error', 'hub', result.message)
        return false
      }
      applyHubState(result.state, false)
      setSyncStatus('synced')
      setSyncMessage(`Estado global recibido · revisión ${result.state.revision}.`)
      return true
    } finally {
      hubRequestInFlightRef.current = false
    }
  }, [applyHubState, logTechnicalEvent, networkMode])

  const syncNow = useCallback(async () => {
    const saved = await saveNow()
    if (!saved) return false
    return performHubSync('manual', `manual-${backendConfig.appId}-${Date.now()}`)
  }, [performHubSync, saveNow])

  const retryPendingActions = useCallback(async (): Promise<boolean> => {
    if (!pendingActions.length) {
      const pulled = await pullLatestHubState(false)
      if (pulled) logTechnicalEvent('success', 'queue', 'Sin cola local; se descargó el estado global.')
      return pulled || backendConfig.requestedMode === 'local'
    }
    if (networkMode === 'offline') {
      setSyncStatus('pending')
      setSyncMessage('Sin red simulada: la cola permanece en el dispositivo.')
      logTechnicalEvent('warning', 'queue', 'Reintento omitido porque el simulador está sin red.')
      return false
    }
    const actionKeys = pendingActions.map((item) => item.key)
    const batchKey = createActionKey('merchant_transition', `${backendConfig.appId}-batch`, actionKeys)
    setPendingActions((current) => current.map((item) => ({ ...item, attempts: item.attempts + 1, lastError: undefined })))
    const ok = await performHubSync('queue', batchKey)
    if (!ok) setPendingActions((current) => current.map((item) => ({ ...item, lastError: 'Sync Hub no disponible' })))
    return ok
  }, [logTechnicalEvent, networkMode, pendingActions, performHubSync, pullLatestHubState])

  const clearTechnicalEvents = useCallback(() => {
    setTechnicalEvents([createTechnicalEvent('info', 'logs', 'Registro técnico reiniciado.')])
  }, [])

  const runHealthCheck = useCallback(async (): Promise<HealthCheck[]> => {
    let storageOk = true
    try {
      await saveAppSnapshot(snapshot)
    } catch {
      storageOk = false
    }

    const operationIds = operations.map((operation) => operation.id)
    const queueKeys = pendingActions.map((action) => action.key)
    const activeExists = !activeOperationId || operations.some((operation) => operation.id === activeOperationId)
    const hubOk = backendConfig.requestedMode === 'local' || hubConnected
    const checks: HealthCheck[] = [
      { id: 'storage', label: 'Persistencia local', ok: storageOk, detail: storageOk ? 'El snapshot puede escribirse.' : 'Falló la escritura local.' },
      { id: 'cart', label: 'Carrito independiente', ok: cartPersistenceStatus !== 'error', detail: cartPersistenceStatus === 'error' ? 'Falló la copia independiente.' : `${cartLines.length} líneas en ${cartStoreCount} carrito(s) · guardado ${cartLastSavedAt ? 'activo' : 'pendiente'}.` },
      { id: 'hub', label: 'Sync Hub central', ok: hubOk, detail: hubOk ? `Conectado · revisión ${hubRevision}.` : 'No responde en 127.0.0.1:9090.' },
      { id: 'operations', label: 'IDs de operaciones', ok: new Set(operationIds).size === operationIds.length, detail: `${operationIds.length} operaciones · ${new Set(operationIds).size} IDs únicos.` },
      { id: 'queue', label: 'Cola idempotente', ok: new Set(queueKeys).size === queueKeys.length, detail: `${queueKeys.length} acciones pendientes sin claves duplicadas.` },
      { id: 'active', label: 'Operación activa', ok: activeExists, detail: activeExists ? 'La referencia activa es válida.' : 'La operación activa no existe.' },
      { id: 'merchants', label: 'Estados de comercios', ok: Object.keys(merchantStates).length === stores.length, detail: `${Object.keys(merchantStates).length}/${stores.length} comercios configurados.` },
      { id: 'payments', label: 'Método seleccionado', ok: payments.some((payment) => payment.selected), detail: payments.some((payment) => payment.selected) ? 'Existe un método activo.' : 'No existe método activo.' },
      { id: 'addresses', label: 'Dirección seleccionada', ok: addresses.some((item) => item.selected), detail: addresses.some((item) => item.selected) ? 'Existe una dirección activa.' : 'No existe dirección activa.' },
      { id: 'accessibility', label: 'Preferencia de movimiento', ok: typeof reducedMotion === 'boolean', detail: reducedMotion ? 'Movimiento reducido activo.' : 'Movimiento normal.' },
    ]
    logTechnicalEvent(checks.every((item) => item.ok) ? 'success' : 'warning', 'health', `${checks.filter((item) => item.ok).length}/${checks.length} verificaciones aprobadas.`)
    return checks
  }, [activeOperationId, addresses, cartLines.length, cartLastSavedAt, cartPersistenceStatus, cartStoreCount, hubConnected, hubRevision, logTechnicalEvent, merchantStates, operations, payments, pendingActions, reducedMotion, snapshot])

  const sharedSignature = useMemo(() => JSON.stringify({
    operations: operations.map((operation) => ({
      id: operation.id,
      status: operation.status,
      updatedAt: operation.updatedAt,
      paymentState: operation.paymentState,
      riderId: operation.riderId,
      riderName: operation.riderName,
      offerAttempts: operation.offerAttempts,
      rated: operation.rated,
      events: operation.events.map((event) => event.id),
    })),
    merchantStates: backendConfig.appId === 'business' ? merchantStates : null,
    admin: backendConfig.appId === 'control' ? { adminMaintenance, adminBlockUndeclared, adminEnhancedVerification, incidents } : null,
  }), [adminBlockUndeclared, adminEnhancedVerification, adminMaintenance, incidents, merchantStates, operations])

  useEffect(() => {
    if (!hydrated || guestSession || backendConfig.requestedMode === 'local' || networkMode === 'offline') return
    const transmissionSignature = `${networkMode}:${hubConnected ? 'connected' : 'disconnected'}:${hubRevision}:${sharedSignature}:${pendingActions.map((item) => item.key).join('|')}`
    if (lastSharedSignatureRef.current === transmissionSignature) return
    lastSharedSignatureRef.current = transmissionSignature
    const timer = setTimeout(() => {
      const key = createActionKey('merchant_transition', `${backendConfig.appId}-state`, transmissionSignature)
      void performHubSync('auto', key)
    }, networkMode === 'slow' ? 1500 : 450)
    return () => clearTimeout(timer)
  }, [guestSession, hubConnected, hubRevision, hydrated, networkMode, pendingActions, performHubSync, sharedSignature])

  useEffect(() => {
    if (!hydrated || guestSession || lastLifecycleState !== 'active' || backendConfig.requestedMode === 'local' || networkMode === 'offline') return
    const first = setTimeout(() => { void pullLatestHubState(true) }, 800)
    const interval = setInterval(() => { void pullLatestHubState(true) }, networkMode === 'slow' ? 5500 : 3000)
    return () => { clearTimeout(first); clearInterval(interval) }
  }, [guestSession, hydrated, lastLifecycleState, networkMode, pullLatestHubState])

  useEffect(() => {
    if (!hydrated || guestSession || lastLifecycleState !== 'active' || backendConfig.requestedMode === 'local' || networkMode === 'offline') return
    const timer = setTimeout(() => {
      if (pendingActions.length) void retryPendingActions()
      else void pullLatestHubState(true)
    }, 260)
    return () => clearTimeout(timer)
  }, [guestSession, hydrated, lastLifecycleState, networkMode, pendingActions.length, pullLatestHubState, retryPendingActions])

  useEffect(() => {
    if (!activeRiderOffer?.orderId) return
    const operation = operations.find((item) => item.id === activeRiderOffer.orderId)
    if (!operation || ['cancelled', 'delivered'].includes(operation.status)) {
      setActiveRiderOffer(null)
      setRiderRouteStage(0)
    }
  }, [activeRiderOffer?.orderId, operations])

  const completeOnboarding = () => setOnboardingComplete(true)
  const updateProfile = (next: UserProfile) => setProfile(next)
  const setAddress = (value: string) => setAddresses((current) => current.map((item, index) => ({ ...item, line: index === 0 ? value : item.line, selected: index === 0 })))
  const addAddress = (item: Omit<Address, 'id' | 'selected'>) => setAddresses((current) => [...current.map((addressItem) => ({ ...addressItem, selected: false })), { ...item, id: `addr-${Date.now()}`, selected: true }])
  const selectAddress = (id: string) => setAddresses((current) => current.map((item) => ({ ...item, selected: item.id === id })))
  const deleteAddress = (id: string) => setAddresses((current) => {
    const next = current.filter((item) => item.id !== id)
    if (!next.length) return current
    if (!next.some((item) => item.selected)) next[0] = { ...next[0], selected: true }
    return next
  })
  const selectPayment = (id: string) => setPayments((current) => current.map((item) => ({ ...item, selected: item.id === id })))
  const addDemoCard = () => setPayments((current) => [...current.map((item) => ({ ...item, selected: false })), { id: `card-${Date.now()}`, kind: 'card', label: 'Mastercard •••• 8891', detail: 'Vence 11/30 · tarjeta demo', selected: true }])
  const deletePayment = (id: string) => setPayments((current) => {
    const next = current.filter((item) => item.id !== id)
    if (!next.length) return current
    if (!next.some((item) => item.selected)) next[0] = { ...next[0], selected: true }
    return next
  })
  const toggleFavorite = (storeId: number) => setFavorites((current) => current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId])
  const markNoticeRead = (id: string) => setNotices((current) => current.map((notice) => notice.id === id ? { ...notice, read: true } : notice))
  const markAllNoticesRead = () => setNotices((current) => current.map((notice) => ({ ...notice, read: true })))
  const sendSupportMessage = (text: string) => {
    const value = text.trim(); if (!value) return
    const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    setSupportMessages((current) => [...current, { id: `u-${Date.now()}`, from: 'user', text: value, time: now }, { id: `a-${Date.now()}`, from: 'support', text: 'Recibido. La conversación queda en el estado local del prototipo.', time: now }])
  }
  const toggleSetting = (key: keyof UserSettings) => setSettings((current) => ({ ...current, [key]: !current[key] }))
  const closeDesktopSession = () => setDesktopSessionActive(false)
  const isStoreOpen = (storeId: number) => merchantStates[storeId]?.open !== false
  const isProductAvailable = (storeId: number, productId: number) => isStoreOpen(storeId) && merchantStates[storeId]?.stock[productId] !== false
  const getProductImage = (storeId: number, productId: number) => merchantStates[storeId]?.productImages?.[productId] ?? null

  const selectCartStore = (storeId: number): boolean => {
    if (!cartLines.some((line) => line.storeId === storeId)) return false
    setActiveCartStoreId(storeId)
    setPromo('')
    return true
  }

  const addToCart = (store: Store, product: Product, quantity: number, note: string, extras: string[]): ActionResult => {
    if (adminMaintenance) return { ok: false, message: 'La plataforma está en mantenimiento. No se aceptan nuevos pedidos.' }
    if (store.category === 'envios') return { ok: false, message: 'Los envíos utilizan un flujo independiente.' }
    if (!isStoreOpen(store.id)) return { ok: false, message: `${store.name} está pausado y no recibe pedidos.` }
    if (!isProductAvailable(store.id, product.id)) return { ok: false, message: `${product.name} está agotado.` }
    const nextLine = createCartLine(store, product, quantity, note, extras)
    const hadOtherStore = cartLines.some((line) => line.storeId !== store.id)
    const switchingStore = resolvedActiveCartStoreId !== null && resolvedActiveCartStoreId !== store.id
    setCartLines((current) => addOrMergeCartLine(current, nextLine))
    setActiveCartStoreId(store.id)
    if (switchingStore) setPromo('')
    return {
      ok: true,
      message: hadOtherStore
        ? `Producto agregado a un carrito separado de ${store.name}. Tus otros carritos siguen guardados.`
        : 'Producto agregado y carrito guardado.',
    }
  }

  const replaceCartWithProduct = (store: Store, product: Product, quantity: number, note: string, extras: string[]): ActionResult => {
    if (adminMaintenance) return { ok: false, message: 'La plataforma está en mantenimiento. No se aceptan nuevos pedidos.' }
    if (!isStoreOpen(store.id) || !isProductAvailable(store.id, product.id)) return { ok: false, message: `${product.name} no está disponible.` }
    const line = createCartLine(store, product, quantity, note, extras)
    setCartLines((current) => [...current.filter((item) => item.storeId !== store.id), line])
    setActiveCartStoreId(store.id)
    setPromo('')
    return { ok: true, message: `El carrito de ${store.name} fue reiniciado sin borrar tus otros carritos.` }
  }

  const updateQuantity = (productId: number, delta: number, note = '', extras: string[] = []) => setCartLines((current) => {
    const storeId = resolvedActiveCartStoreId ?? 0
    const signature = cartLineSignature(storeId, productId, note, extras)
    const line = current.find((item) => item.signature === signature)
    return line ? updateCartLineById(current, line.id, delta) : current
  })
  const updateCartLineQuantity = (lineId: string, delta: number) => setCartLines((current) => updateCartLineById(current, lineId, delta))
  const removeCartLine = (lineId: string) => setCartLines((current) => current.filter((line) => line.id !== lineId))
  const clearCart = () => {
    if (resolvedActiveCartStoreId === null) return
    setCartLines((current) => current.filter((line) => line.storeId !== resolvedActiveCartStoreId))
    setPromo('')
  }
  const clearAllCarts = () => { setCartLines([]); setActiveCartStoreId(null); setPromo('') }
  const applyPromo = (code: string) => {
    const value = code.trim().toUpperCase()
    const valid = value === 'PRIMER20' || (value === 'COMIDA10' && cartStore?.category === 'comida') || (value === 'MERCADO8' && cartStore?.category === 'mercado') || (value === 'CUIDADO5' && cartStore?.category === 'farmacia')
    setPromo(valid ? value : '')
    return valid
  }

  const paymentFields = (): { paymentKind: PaymentKind; paymentState: IntegratedOperation['paymentState'] } => ({
    paymentKind: selectedPayment.kind,
    paymentState: selectedPayment.kind === 'cash' ? 'cash_due' : 'captured',
  })

  const startOrder = (): ActionResult => {
    if (adminMaintenance) return { ok: false, message: 'Mantenimiento activo: el checkout está temporalmente bloqueado.' }
    if (!cartStore || !cart.length) return { ok: false, message: 'El carrito está vacío.' }
    if (!isStoreOpen(cartStore.id)) return { ok: false, message: `${cartStore.name} cerró antes de confirmar. Conservamos tu carrito.` }
    const unavailable = cart.find((line) => !isProductAvailable(cartStore.id, line.product.id))
    if (unavailable) return { ok: false, message: `${unavailable.product.name} ya no está disponible. Retíralo para continuar.` }
    if (subtotal < cartStore.minimum) return { ok: false, message: `El mínimo de ${cartStore.name} es S/ ${cartStore.minimum.toFixed(2)}.` }
    if (selectedPayment.kind === 'wallet' && walletBalance < total) return { ok: false, message: 'Saldo insuficiente en la billetera DA.' }

    const criticalKey = createActionKey('create_order', String(cartStore.id), {
      cart: cart.map((line) => [line.product.id, line.quantity, line.note, line.extras]),
      address,
      payment: selectedPayment.id,
      total: total.toFixed(2),
    })
    if (!claimCriticalAction(criticalKey)) return { ok: false, message: 'La confirmación ya está en proceso. Evitamos crear un pedido duplicado.' }

    const createdAt = new Date().toISOString()
    const id = createOperationId('order')
    const state = merchantStates[cartStore.id] ?? createMerchantStates()[cartStore.id]
    const currentCart = cart
    const currentTotal = total
    const merchantNet = Number((subtotal * 0.85).toFixed(2))
    const riderPay = Number(Math.max(4, deliveryFee + 1.5).toFixed(2))
    const platformRevenue = Number(Math.max(0, currentTotal - merchantNet - riderPay).toFixed(2))
    const base: IntegratedOperation = {
      id, kind: 'order', category: cartStore.category, customerId, merchantId: `merchant-${cartStore.id}`, storeId: cartStore.id,
      customerName: profile.name, merchantName: cartStore.name, pickupAddress: `${cartStore.name} · Lima Central`, dropoffAddress: address,
      items: currentCart.map((line) => ({ productId: line.product.id, name: line.product.name, quantity: line.quantity, unitPrice: line.product.price, extras: line.extras, note: line.note })),
      itemSummary: currentCart.map((line) => `${line.quantity} ${line.product.name}`).join(' · '), total: currentTotal, subtotal, deliveryFee, serviceFee, discount,
      platformRevenue, merchantNet, riderPay, payment: selectedPayment.label, ...paymentFields(), status: 'created', createdAt, updatedAt: createdAt, offerAttempts: 0,
      events: [{ id: `${id}-created`, status: 'created', label: 'Operación creada por el cliente', at: createdAt, actor: 'customer' }],
    }
    const operation = state.autoAccept ? appendOperationEvent(base, 'accepted', 'system', createdAt, 'Aceptado automáticamente por la configuración del comercio') : base
    setOperations((current) => [operation, ...current])
    setActiveOperationId(id)
    setActiveOrder({ id, storeId: cartStore.id, lines: currentCart, total: currentTotal, payment: operation.payment, address })
    setDeliveryKind('order'); setActiveShipment(null); setOrderStage(operationStatusToCustomerStage(operation)); setCurrentMerchantStoreId(cartStore.id)
    if (selectedPayment.kind === 'wallet') setWalletBalance((current) => current - currentTotal)
    clearCart()
    queueAction('create_order', id, 'Pedido creado', { storeId: cartStore.id, total: currentTotal })
    return { ok: true, message: networkMode === 'offline' ? 'Pedido guardado en el dispositivo. Se enviará al recuperar conexión.' : 'Pedido creado y enviado al comercio.', operationId: id }
  }

  const startShipment = (shipment: Shipment): ActionResult => {
    if (adminMaintenance) return { ok: false, message: 'Mantenimiento activo: no se aceptan nuevos envíos.' }
    if (adminBlockUndeclared && suspiciousShipment(shipment.content)) return { ok: false, message: 'La declaración del contenido requiere más detalle antes de continuar.' }
    if (shipment.weightKg <= 0 || shipment.pieces < 1 || !shipment.dimensions.trim()) return { ok: false, message: 'Completa peso, piezas y dimensiones.' }
    if (selectedPayment.kind === 'wallet' && walletBalance < shipment.total) return { ok: false, message: 'Saldo insuficiente en la billetera DA.' }
    const provider = stores.find((store) => store.id === shipment.providerId && store.category === 'envios')
    const service = provider?.products.find((product) => product.id === shipment.serviceId)
    if (!provider || !service) return { ok: false, message: 'Servicio de envío no disponible.' }
    if (!isStoreOpen(provider.id)) return { ok: false, message: `${provider.name} está pausado y no recibe solicitudes.` }
    const criticalKey = createActionKey('create_shipment', String(provider.id), {
      serviceId: service.id,
      pickup: shipment.pickupAddress,
      dropoff: shipment.dropoffAddress,
      content: shipment.content,
      total: shipment.total.toFixed(2),
    })
    if (!claimCriticalAction(criticalKey)) return { ok: false, message: 'La solicitud ya está en proceso. Evitamos crear un envío duplicado.' }
    const createdAt = new Date().toISOString(); const id = createOperationId('shipment')
    const riderPay = Number((shipment.total * 0.65).toFixed(2))
    const details: ShipmentDetails = { senderName: shipment.senderName, senderPhone: shipment.senderPhone, recipientName: shipment.recipientName, recipientPhone: shipment.recipientPhone, content: shipment.content, weightKg: shipment.weightKg, pieces: shipment.pieces, dimensions: shipment.dimensions, declaredValue: shipment.declaredValue }
    const operation: IntegratedOperation = {
      id, kind: 'shipment', category: 'envios', customerId, merchantId: `merchant-${provider.id}`, providerId: provider.id, serviceId: service.id,
      customerName: profile.name, merchantName: provider.name, pickupAddress: shipment.pickupAddress, dropoffAddress: shipment.dropoffAddress,
      items: [{ productId: service.id, name: service.name, quantity: 1, unitPrice: shipment.total, extras: shipment.options, note: shipment.content }],
      itemSummary: `${service.name} · ${shipment.content}`, total: shipment.total, subtotal: shipment.baseTotal, deliveryFee: 0, serviceFee: 0, discount: shipment.discount,
      platformRevenue: Number((shipment.total - riderPay).toFixed(2)), merchantNet: 0, riderPay, payment: selectedPayment.label, ...paymentFields(),
      status: 'created', createdAt, updatedAt: createdAt, offerAttempts: 0, shipmentDetails: details,
      events: [{ id: `${id}-created`, status: 'created', label: 'Solicitud de envío enviada a validación', at: createdAt, actor: 'customer' }],
    }
    setOperations((current) => [operation, ...current]); setActiveOperationId(id); setDeliveryKind('shipment'); setActiveShipment(shipment); setActiveOrder(null); setOrderStage(1); setCurrentMerchantStoreId(provider.id)
    if (selectedPayment.kind === 'wallet') setWalletBalance((current) => current - shipment.total)
    clearCart()
    queueAction('create_shipment', id, 'Envío DA Express creado', { providerId: provider.id, total: shipment.total })
    return { ok: true, message: networkMode === 'offline' ? 'Envío guardado localmente. Se enviará al recuperar conexión.' : 'Solicitud creada. El proveedor debe validarla antes de asignar un repartidor.', operationId: id }
  }

  const advanceDelivery = () => { if (activeOperation) setOrderStage(operationStatusToCustomerStage(activeOperation)) }
  const finishDelivery = () => { if (activeOperation && !['delivered', 'cancelled'].includes(activeOperation.status)) return; setActiveShipment(null); setActiveOrder(null); setActiveOperationId(null); setOrderStage(0); setDeliveryKind('order') }

  const cancelOperation = (id: string, actor: 'customer' | 'merchant' | 'admin', reason: string): ActionResult => {
    const operation = operations.find((item) => item.id === id)
    if (!operation) return { ok: false, message: 'Operación no encontrada.' }
    if (['delivered', 'cancelled'].includes(operation.status)) return { ok: false, message: 'La operación ya no puede cancelarse.' }
    if (actor === 'customer' && !['created', 'accepted'].includes(operation.status)) return { ok: false, message: 'El pedido ya está en preparación. Contacta soporte.' }
    if (actor === 'merchant' && ['picked_up', 'in_transit'].includes(operation.status)) return { ok: false, message: 'El repartidor ya recogió la operación.' }
    const criticalKey = createActionKey('cancel_operation', id, { actor, status: operation.status })
    if (!claimCriticalAction(criticalKey)) return { ok: false, message: 'La cancelación ya está en proceso.' }
    const cancelled = cancelIntegratedOperation(operation, actor, reason.trim() || 'Sin motivo especificado')
    setOperations((current) => current.map((item) => item.id === id ? cancelled : item))
    if (operation.paymentKind === 'wallet' && operation.paymentState === 'captured') setWalletBalance((current) => current + operation.total)
    if (activeRiderOffer?.orderId === id) { setActiveRiderOffer(null); setRiderRouteStage(0) }
    setNotices((current) => [{ id: `cancel-${id}`, title: 'Operación cancelada', body: `${operation.merchantName}: ${reason}`, time: 'Ahora', read: false, tone: 'red', icon: 'close-circle' }, ...current])
    queueAction('cancel_operation', id, 'Operación cancelada', { actor, reason })
    return { ok: true, message: operation.paymentState === 'captured' ? 'Operación cancelada y reembolso registrado.' : 'Operación cancelada.' }
  }

  const reorder = (orderId: string) => {
    const operation = operations.find((item) => item.id === orderId)
    if (!operation || operation.kind !== 'order' || !operation.storeId) return false
    const store = stores.find((item) => item.id === operation.storeId)
    if (!store || !isStoreOpen(store.id)) return false
    const lines = operation.items.flatMap((item) => {
      const product = store.products.find((productItem) => productItem.id === item.productId)
      return product && isProductAvailable(store.id, product.id) ? [createCartLine(store, product, item.quantity, item.note, item.extras)] : []
    })
    if (!lines.length) return false
    setCartLines((current) => [...current.filter((line) => line.storeId !== store.id), ...lines]); setActiveCartStoreId(store.id); setPromo(''); return true
  }
  const rateOrder = (orderId: string) => setOperations((current) => current.map((operation) => operation.id === orderId ? { ...operation, rated: true } : operation))

  const authenticate = (nextRole: AppRole, guest = false) => { setRole(nextRole); setAuthenticated(true); setGuestSession(guest) }
  const logout = () => { setAuthenticated(false); setGuestSession(false); setRole('cliente') }
  const selectMerchantStore = (storeId: number) => { if (stores.some((store) => store.id === storeId)) setCurrentMerchantStoreId(storeId) }
  const updateMerchantState = (patch: Partial<Omit<MerchantStoreState, 'storeId'>>) => {
    merchantDomainDirtyRef.current = true
    setMerchantStates((current) => ({ ...current, [currentMerchantStoreId]: { ...current[currentMerchantStoreId], ...patch } }))
    queueAction('merchant_settings', String(currentMerchantStoreId), 'Configuración del comercio actualizada', patch)
  }
  const setMerchantOpen = (value: boolean) => updateMerchantState({ open: value })
  const setMerchantAutoAccept = (value: boolean) => updateMerchantState({ autoAccept: value })
  const toggleMerchantStock = (productId: number) => {
    merchantDomainDirtyRef.current = true
    setMerchantStates((current) => {
      const state = current[currentMerchantStoreId]
      return { ...current, [currentMerchantStoreId]: { ...state, stock: { ...state.stock, [productId]: state.stock[productId] === false } } }
    })
    queueAction('merchant_settings', String(currentMerchantStoreId), 'Inventario del comercio actualizado', { productId })
  }

  const moveMerchantOrder = (id: string, requestedState: MerchantOrderState) => {
    const operation = operations.find((item) => item.id === id)
    if (!operation || (operation.storeId ?? operation.providerId) !== currentMerchantStoreId) return
    if (requestedState === 'cancelado') { cancelOperation(id, 'merchant', operation.kind === 'shipment' ? 'Contenido o capacidad no validada' : 'Pedido rechazado por el comercio'); return }
    if (requestedState === 'entregado') return
    const status = merchantStateToOperationStatus(requestedState)
    const label = operation.kind === 'shipment' && status === 'accepted' ? 'Contenido y datos del envío validados' : undefined
    const criticalKey = createActionKey('merchant_transition', id, { from: operation.status, to: status })
    if (!claimCriticalAction(criticalKey)) return
    setOperations((current) => current.map((item) => item.id === id ? appendOperationEvent(item, status, 'merchant', undefined, label) : item))
    queueAction('merchant_transition', id, `Comercio cambió a ${requestedState}`, { status })
  }

  const addMerchantDemoOrder = () => {
    const store = stores.find((item) => item.id === currentMerchantStoreId) ?? stores[0]
    if (!isStoreOpen(store.id)) return
    const product = store.products.find((item) => isProductAvailable(store.id, item.id)) ?? store.products[0]
    const createdAt = new Date().toISOString(); const id = createOperationId(store.category === 'envios' ? 'shipment' : 'order')
    const totalValue = Number((product.price + (store.category === 'envios' ? 0 : store.delivery + 1.9)).toFixed(2))
    const base: IntegratedOperation = {
      id, kind: store.category === 'envios' ? 'shipment' : 'order', category: store.category, customerId: 'customer-simulated', merchantId: `merchant-${store.id}`,
      storeId: store.category === 'envios' ? undefined : store.id, providerId: store.category === 'envios' ? store.id : undefined, serviceId: store.category === 'envios' ? product.id : undefined,
      customerName: 'Nuevo cliente', merchantName: store.name, pickupAddress: `${store.name} · Lima Central`, dropoffAddress: 'Av. Pardo 620, Miraflores',
      items: [{ productId: product.id, name: product.name, quantity: 1, unitPrice: product.price, extras: [], note: '' }], itemSummary: `1 ${product.name}`,
      total: totalValue, subtotal: product.price, deliveryFee: store.category === 'envios' ? 0 : store.delivery, serviceFee: store.category === 'envios' ? 0 : 1.9, discount: 0,
      merchantNet: store.category === 'envios' ? 0 : Number((product.price * .85).toFixed(2)), riderPay: store.category === 'envios' ? Number((totalValue * .65).toFixed(2)) : 5,
      platformRevenue: 0, payment: 'Visa demo', paymentKind: 'card', paymentState: 'captured', status: 'created', createdAt, updatedAt: createdAt, offerAttempts: 0,
      events: [{ id: `${id}-created`, status: 'created', label: 'Operación simulada creada', at: createdAt, actor: 'system' }],
    }
    const state = merchantStates[store.id]
    const operation = state.autoAccept ? appendOperationEvent(base, 'accepted', 'system') : base
    operation.platformRevenue = Number(Math.max(0, operation.total - operation.merchantNet - operation.riderPay).toFixed(2))
    setOperations((current) => [operation, ...current])
    queueAction('create_order', id, 'Operación demo creada por el negocio', { storeId: store.id })
  }

  const acceptRiderOffer = (id: string): ActionResult => {
    if (!riderOnline) return { ok: false, message: 'Conéctate para aceptar ofertas.' }
    if (activeRiderOffer) return { ok: false, message: 'Completa la entrega activa antes de aceptar otra.' }
    const offer = riderOffers.find((item) => item.id === id)
    if (!offer?.orderId) return { ok: false, message: 'Oferta no disponible.' }
    const operation = operations.find((item) => item.id === offer.orderId)
    if (!operation || operation.status !== 'ready') return { ok: false, message: 'La oferta cambió de estado.' }
    const criticalKey = createActionKey('rider_accept', offer.orderId, { offerId: offer.id })
    if (!claimCriticalAction(criticalKey)) return { ok: false, message: 'La oferta ya se está aceptando.' }
    setActiveRiderOffer(offer); setRiderRouteStage(0)
    setOperations((current) => current.map((item) => item.id === offer.orderId ? { ...appendOperationEvent(item, 'rider_assigned', 'rider'), riderName: riderProfile.name, riderId } : item))
    queueAction('rider_accept', offer.orderId, 'Oferta aceptada por repartidor', { offerId: offer.id })
    return { ok: true, message: networkMode === 'offline' ? 'Oferta guardada localmente; queda pendiente de conciliación.' : 'Oferta aceptada.', operationId: offer.orderId }
  }

  const rejectRiderOffer = (id: string) => {
    const offer = riderOffers.find((item) => item.id === id)
    if (!offer?.orderId) return
    setOperations((current) => current.map((operation) => operation.id === offer.orderId ? {
      ...appendOperationEvent(operation, 'ready', 'rider', undefined, `Oferta rechazada; reasignación ${operation.offerAttempts + 1}`),
      offerAttempts: operation.offerAttempts + 1,
      riderPay: Number((operation.riderPay + (operation.offerAttempts >= 1 ? .75 : .25)).toFixed(2)),
    } : operation))
    queueAction('rider_reject', offer.orderId, 'Oferta rechazada y reasignada', { offerId: offer.id })
  }

  const advanceRiderRoute = () => {
    if (!activeRiderOffer?.orderId) return
    const nextStage = Math.min(3, riderRouteStage + 1); setRiderRouteStage(nextStage)
    if (nextStage === 1) setOperations((current) => current.map((operation) => operation.id === activeRiderOffer.orderId ? appendOperationEvent(operation, 'picked_up', 'rider') : operation))
    if (nextStage >= 2) setOperations((current) => current.map((operation) => operation.id === activeRiderOffer.orderId ? appendOperationEvent(operation, 'in_transit', 'rider') : operation))
    queueAction('rider_progress', activeRiderOffer.orderId, `Ruta avanzó a etapa ${nextStage}`, { stage: nextStage })
  }

  const completeRiderOffer = () => {
    if (!activeRiderOffer?.orderId || riderRouteStage < 3) return
    const criticalKey = createActionKey('rider_complete', activeRiderOffer.orderId, { stage: riderRouteStage })
    if (!claimCriticalAction(criticalKey)) return
    const completedAt = new Date().toISOString()
    setOperations((current) => current.map((operation) => operation.id === activeRiderOffer.orderId ? {
      ...appendOperationEvent(operation, 'delivered', 'rider', completedAt),
      paymentState: operation.paymentState === 'cash_due' ? 'captured' : operation.paymentState,
    } : operation))
    const operation = operations.find((item) => item.id === activeRiderOffer.orderId)
    if (operation) setNotices((current) => [{ id: `delivered-${operation.id}`, title: 'Entrega completada', body: `${operation.merchantName} llegó a ${operation.dropoffAddress}.`, time: 'Ahora', read: false, tone: 'mint', icon: 'checkmark' }, ...current])
    queueAction('rider_complete', activeRiderOffer.orderId, 'Entrega completada', { completedAt })
    setActiveRiderOffer(null); setRiderRouteStage(0)
  }

  const setAdminMaintenance = (value: boolean) => {
    adminDomainDirtyRef.current = true
    setAdminMaintenanceState(value)
    queueAction('admin_policy', 'maintenance', 'Política de mantenimiento actualizada', { value })
  }
  const setAdminBlockUndeclared = (value: boolean) => {
    adminDomainDirtyRef.current = true
    setAdminBlockUndeclaredState(value)
    queueAction('admin_policy', 'undeclared-content', 'Política de contenido actualizada', { value })
  }
  const setAdminEnhancedVerification = (value: boolean) => {
    adminDomainDirtyRef.current = true
    setAdminEnhancedVerificationState(value)
    queueAction('admin_policy', 'enhanced-verification', 'Verificación reforzada actualizada', { value })
  }
  const resolveIncident = (id: string) => {
    adminDomainDirtyRef.current = true
    setIncidents((current) => current.map((incident) => incident.id === id ? { ...incident, status: 'resuelto' } : incident))
    queueAction('incident_resolve', id, 'Incidente resuelto', { id })
  }

  const resetDemoData = useCallback(async () => {
    await Promise.all([clearAppSnapshot(), clearCartDraft()])
    setOnboardingComplete(false); setRole('cliente'); setAuthenticated(false); setGuestSession(false); setProfile(defaultProfile); setAddresses(initialAddresses); setPayments(initialPayments)
    setFavorites([1, 10]); setNotices(initialNotices); setSupportMessages(initialSupport); setSettings(defaultSettings); setDesktopSessionActive(true); setWalletBalance(180)
    setCartLines([]); setActiveCartStoreId(null); setPromo(''); setCartLastSavedAt(null); setCartPersistenceStatus('ready'); setCartRecovered(false); setOrderStage(0); setDeliveryKind('order'); setActiveShipment(null); setActiveOrder(null); setActiveOperationId(null); setOperations(initialIntegratedOperations)
    setCurrentMerchantStoreId(1); setMerchantStates(createMerchantStates()); setRiderOnline(false); setRiderVoiceNavigation(true); setRiderRouteStage(0); setActiveRiderOffer(null)
    setAdminMaintenanceState(false); setAdminBlockUndeclaredState(true); setAdminEnhancedVerificationState(true); setIncidents(initialIncidents); setLastSavedAt(null); setPersistenceStatus('ready')
    setNetworkModeState('online'); setPendingActions([]); setTechnicalEvents([createTechnicalEvent('info', 'reset', 'Datos demo y registro técnico restaurados.')]); setLastLifecycleState('active')
    setHubRevision(0); setHubDomainRevisions({ operations: 0, merchants: 0, admin: 0 }); setHubConnected(false); setLastHubSyncAt(null)
    hubRevisionRef.current = 0; hubConnectedRef.current = false; hubDomainRevisionsRef.current = { operations: 0, merchants: 0, admin: 0 }; merchantDomainDirtyRef.current = false; adminDomainDirtyRef.current = false
    criticalLocksRef.current.clear(); autoFlushSignatureRef.current = ''; lastSharedSignatureRef.current = ''
    setSyncStatus(backendConfig.requestedMode === 'local' ? 'local' : 'pending'); setSyncMessage('Datos demo integrados restaurados.')
  }, [])

  return <AppContext.Provider value={{
    hydrated, onboardingComplete, completeOnboarding, persistenceStatus, syncStatus, syncMessage, lastSavedAt, hubRevision, hubConnected, lastHubSyncAt, backendMode: backendConfig.requestedMode, backendConfigured: backendConfig.configured, saveNow, syncNow, resetDemoData,
    networkMode, setNetworkMode, pendingActions, technicalEvents, lastLifecycleState, reducedMotion, retryPendingActions, clearTechnicalEvents, runHealthCheck,
    role, authenticated, guestSession, setRole, authenticate, logout, profile, updateProfile, merchantProfile, riderProfile, adminProfile,
    address, setAddress, addresses, addAddress, selectAddress, deleteAddress, payments, selectPayment, addDemoCard, deletePayment, selectedPayment, walletBalance, walletEntries,
    favorites, toggleFavorite, notices, unreadNotices, markNoticeRead, markAllNoticesRead, supportMessages, sendSupportMessage, settings, toggleSetting, desktopSessionActive, closeDesktopSession,
    cart, allCartLines: cartLines, cartCount, allCartCount, cartStoreCount, savedCarts, activeCartStoreId: resolvedActiveCartStoreId, selectCartStore, cartStore, cartLastSavedAt, cartPersistenceStatus, cartRecovered, subtotal, deliveryFee, serviceFee, discount, total, promo, applyPromo, addToCart, replaceCartWithProduct, updateQuantity, updateCartLineQuantity, removeCartLine, clearCart, clearAllCarts,
    orderStage, setOrderStage, deliveryKind, activeShipment, activeOrder, activeOperation, operations, ledger, operationStatusText, financeSummary, startOrder, startShipment, advanceDelivery, finishDelivery, cancelOperation, history, reorder, rateOrder,
    currentMerchantStoreId, selectMerchantStore, merchantStates, isStoreOpen, isProductAvailable, getProductImage, merchantOpen, setMerchantOpen, merchantAutoAccept, setMerchantAutoAccept, merchantOrders, moveMerchantOrder, addMerchantDemoOrder, merchantStock, toggleMerchantStock,
    riderOnline, setRiderOnline, riderVoiceNavigation, setRiderVoiceNavigation, riderRouteStage, advanceRiderRoute, riderOffers, activeRiderOffer, acceptRiderOffer, rejectRiderOffer, completeRiderOffer, riderToday, riderHistory,
    adminMaintenance, setAdminMaintenance, adminBlockUndeclared, setAdminBlockUndeclared, adminEnhancedVerification, setAdminEnhancedVerification, incidents, resolveIncident,
  }}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp fuera de AppProvider')
  return value
}
