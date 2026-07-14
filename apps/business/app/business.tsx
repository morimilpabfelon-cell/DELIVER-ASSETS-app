import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { stores } from '@/data/catalog'
import { MerchantOrderState } from '@/data/system'
import { useApp } from '@/context/AppContext'
import { useFeedback } from '@/components/FeedbackProvider'
import { BusinessCover, BusinessLogo, ProductPhoto } from '@/components/BusinessMedia'
import { Button, Header, Kicker, Metric, SectionTitle, ToggleRow } from '@/components/UI'
import { RoleDock, DockItem } from '@/components/RoleDock'
import { C, shadow } from '@/theme'

type ViewKey = 'resumen' | 'pedidos' | 'catalogo' | 'finanzas' | 'perfil'

const dock: DockItem<ViewKey>[] = [
  { key: 'resumen', label: 'INICIO', icon: 'grid-outline' },
  { key: 'pedidos', label: 'PEDIDOS', icon: 'receipt-outline' },
  { key: 'catalogo', label: 'CATÁLOGO', icon: 'fast-food-outline' },
  { key: 'finanzas', label: 'FINANZAS', icon: 'bar-chart-outline' },
  { key: 'perfil', label: 'TIENDA', icon: 'storefront-outline' },
]

const flow: MerchantOrderState[] = ['nuevo', 'aceptado', 'preparando', 'listo', 'entregado', 'cancelado']
const nextState = (state: MerchantOrderState) => state === 'listo' ? 'listo' : flow[Math.min(flow.length - 1, flow.indexOf(state) + 1)]

function initials(name: string) {
  return name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
}

function syncTime(value: string | null) {
  if (!value) return 'sin revisión todavía'
  return new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export default function Business() {
  const router = useRouter()
  const { showDialog, showToast } = useFeedback()
  const [view, setView] = useState<ViewKey>('resumen')
  const [query, setQuery] = useState('')
  const {
    role,
    authenticated,
    merchantProfile,
    currentBusinessProfile,
    currentMerchantStoreId,
    selectMerchantStore,
    merchantOpen,
    setMerchantOpen,
    merchantAutoAccept,
    setMerchantAutoAccept,
    merchantOrders,
    moveMerchantOrder,
    addMerchantDemoOrder,
    merchantStock,
    merchantProductImages,
    setMerchantProductAvailability,
    ledger,
    operations,
    hubConnected,
    pendingActions,
    lastHubSyncAt,
    syncNow,
  } = useApp()

  useEffect(() => {
    if (!authenticated || role !== 'negocio') router.replace('/auth')
  }, [authenticated, role, router])

  const store = stores.find((item) => item.id === currentMerchantStoreId)
    ?? stores.find((item) => item.name === merchantProfile.name)
    ?? stores[0]
  const relevantOrders = merchantOrders
  const pending = relevantOrders.filter((order) => !['entregado', 'cancelado'].includes(order.state))
  const gross = relevantOrders.filter((order) => order.state !== 'cancelado').reduce((sum, order) => sum + order.total, 0)
  const ticketAverage = relevantOrders.length ? gross / relevantOrders.length : 0
  const commission = gross * .15
  const settledNet = ledger
    .filter((entry) => entry.owner === 'merchant' && entry.type === 'merchant_credit' && entry.merchantId === `merchant-${store.id}`)
    .reduce((sum, entry) => sum + entry.amount, 0)
  const net = settledNet
  const linkedOrders = operations.filter((operation) => (operation.storeId ?? operation.providerId) === store.id).length
  const cancelledCount = relevantOrders.filter((order) => order.state === 'cancelado').length
  const deliveredCount = relevantOrders.filter((order) => order.state === 'entregado').length
  const acceptanceRate = relevantOrders.length ? Math.round(((relevantOrders.length - cancelledCount) / relevantOrders.length) * 100) : 100
  const cancellationRate = relevantOrders.length ? (cancelledCount / relevantOrders.length) * 100 : 0
  const completionRate = relevantOrders.length ? Math.round((deliveredCount / relevantOrders.length) * 100) : 0
  const operationalScore = Math.max(0, Math.min(100, Math.round(acceptanceRate * .55 + (100 - cancellationRate) * .25 + Math.min(100, completionRate + 20) * .2)))
  const etaValues = pending.map((order) => Number.parseInt(order.eta, 10)).filter(Number.isFinite)
  const averageEta = etaValues.length ? Math.round(etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length) : 0
  const filtered = useMemo(
    () => store.products.filter((product) => `${product.name} ${product.group}`.toLowerCase().includes(query.toLowerCase())),
    [query, store.products],
  )

  const toggleOpen = () => {
    const next = !merchantOpen
    setMerchantOpen(next)
    showToast({
      title: next ? 'Tienda abierta' : 'Tienda pausada',
      message: next ? 'El comercio vuelve a recibir pedidos.' : 'Se detuvieron los pedidos nuevos.',
      tone: next ? 'success' : 'warning',
    })
  }

  const confirmCancel = (id: string) => showDialog({
    title: '¿Rechazar pedido?',
    message: 'La operación será cancelada para este comercio. El cliente recibirá el cambio cuando se sincronice.',
    tone: 'warning',
    actions: [
      { label: 'Volver', tone: 'secondary' },
      { label: 'Rechazar pedido', tone: 'destructive', onPress: () => moveMerchantOrder(id, 'cancelado') },
    ],
  })

  const syncBusiness = async () => {
    const ok = await syncNow()
    showToast({
      title: ok ? 'Negocio sincronizado' : 'Sincronización pendiente',
      message: ok ? 'Pedidos, inventario y disponibilidad fueron conciliados.' : 'Business conservará los cambios y volverá a intentarlo.',
      tone: ok ? 'success' : 'warning',
      duration: 3800,
    })
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <Header
      title={merchantProfile.name.toUpperCase()}
      kicker="DELIVER BUSINESS"
      right={<Pressable accessibilityLabel="Abrir perfil comercial" style={styles.logoButton} onPress={() => router.push('/business-profile')}>
        <BusinessLogo uri={currentBusinessProfile.logoUri} initials={initials(store.name)} size={42}/>
      </Pressable>}
    />

    <View style={styles.session}>
      <View style={[styles.live, merchantOpen ? styles.liveOn : styles.liveOff]}/>
      <Text style={styles.sessionText}>{merchantOpen ? 'TIENDA ABIERTA · RECIBIENDO PEDIDOS' : 'TIENDA PAUSADA · PEDIDOS DETENIDOS'}</Text>
      <Pressable onPress={toggleOpen}><Text style={styles.sessionAction}>{merchantOpen ? 'PAUSAR' : 'ABRIR'}</Text></Pressable>
    </View>

    <View style={[styles.syncStrip, hubConnected ? styles.syncOn : styles.syncOff]}>
      <Ionicons name={hubConnected ? 'cloud-done-outline' : 'cloud-offline-outline'} size={17}/>
      <Text style={styles.syncText}>{hubConnected ? `SYNC HUB · ${syncTime(lastHubSyncAt)}` : `${pendingActions.length} CAMBIO(S) PENDIENTE(S)`}</Text>
      <Pressable onPress={() => void syncBusiness()}><Text style={styles.syncAction}>SYNC</Text></Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeSwitch} contentContainerStyle={styles.storeSwitchContent}>
      {stores.map((item) => <Pressable
        key={item.id}
        onPress={() => selectMerchantStore(item.id)}
        style={[styles.storeChip, currentMerchantStoreId === item.id && styles.storeChipActive]}
      >
        <Text style={[styles.storeChipText, currentMerchantStoreId === item.id && styles.storeChipTextActive]}>{item.name.toUpperCase()}</Text>
      </Pressable>)}
    </ScrollView>

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {view === 'resumen' && <>
        <View style={styles.hero}>
          <Kicker light>OPERACIÓN DE HOY</Kicker>
          <Text style={styles.heroTitle}>VENDE.{`\n`}PREPARA.{`\n`}CRECE.</Text>
          <View style={styles.heroStamp}><Text style={styles.heroStampValue}>{pending.length}</Text><Text style={styles.heroStampLabel}>ACTIVOS</Text></View>
        </View>
        <View style={styles.metrics}>
          <Metric label="VENTAS HOY" value={`S/ ${gross.toFixed(0)}`} color="yellow" detail={`${linkedOrders} integrados`}/>
          <Metric label="PEDIDOS" value={String(relevantOrders.length).padStart(2, '0')} color="white" detail={`${pending.length} activos`}/>
          <Metric label="TICKET MEDIO" value={`S/ ${ticketAverage.toFixed(0)}`} color="mint" detail="Órdenes cargadas"/>
          <Metric label="PREPARACIÓN" value={averageEta ? `${averageEta} min` : '—'} color="red" detail="Promedio de activos"/>
        </View>
        <SectionTitle title="PEDIDOS QUE NECESITAN ACCIÓN" action="VER TODOS →" onPress={() => setView('pedidos')}/>
        {pending.slice(0, 2).map((order) => <OrderCard key={order.id} order={order} onMove={() => moveMerchantOrder(order.id, nextState(order.state))} onCancel={() => confirmCancel(order.id)}/>) }
        <SectionTitle title="RENDIMIENTO"/>
        <View style={styles.performance}>
          <View style={styles.performanceHead}><Text style={styles.performanceTitle}>PUNTUACIÓN OPERATIVA</Text><Text style={styles.performanceValue}>{operationalScore}/100</Text></View>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${operationalScore}%` }]}/></View>
          <View style={styles.performanceGrid}>
            <Text style={styles.performanceItem}>ACEPTACIÓN{`\n`}{acceptanceRate}%</Text>
            <Text style={styles.performanceItem}>CANCELACIÓN{`\n`}{cancellationRate.toFixed(1)}%</Text>
            <Text style={styles.performanceItem}>COMPLETADOS{`\n`}{completionRate}%</Text>
          </View>
        </View>
      </>}

      {view === 'pedidos' && <>
        <Kicker>COLA OPERATIVA</Kicker>
        <Text style={styles.pageTitle}>PEDIDOS{`\n`}EN MOVIMIENTO.</Text>
        <View style={styles.orderFilters}>{flow.slice(0, 4).map((state) => <View key={state} style={styles.filter}><Text style={styles.filterValue}>{relevantOrders.filter((order) => order.state === state).length}</Text><Text style={styles.filterLabel}>{state.toUpperCase()}</Text></View>)}</View>
        {relevantOrders.map((order) => <OrderCard key={order.id} order={order} onMove={() => moveMerchantOrder(order.id, nextState(order.state))} onCancel={() => confirmCancel(order.id)}/>) }
        <Button
          label="SIMULAR NUEVA ORDEN"
          onPress={() => {
            addMerchantDemoOrder()
            showToast({
              title: 'Nueva orden creada',
              message: merchantAutoAccept ? 'Ingresó aceptada por la configuración actual.' : 'Ingresó como nueva y requiere acción.',
              tone: 'success',
            })
          }}
          color="black"
          icon="add"
        />
      </>}

      {view === 'catalogo' && <>
        <Kicker>MENÚ E INVENTARIO</Kicker>
        <Text style={styles.pageTitle}>CATÁLOGO{`\n`}CONTROLADO.</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Buscar producto o grupo" style={styles.search}/>
        <View style={styles.catalogNotice}><Ionicons name="shield-checkmark" size={21}/><Text style={styles.catalogNoticeText}>{store.name} mantiene un catálogo exclusivo de {store.category}; la disponibilidad se refleja en Cliente cuando Sync Hub está activo.</Text></View>
        {filtered.map((product) => {
          const stock = merchantStock[product.id] !== false
          const localMedia = currentBusinessProfile.productMedia[product.id]
          const imageUri = localMedia?.localUri ?? merchantProductImages[product.id]
          return <View key={product.id} style={[styles.product, !stock && styles.productUnavailable]}> 
            <Pressable accessibilityLabel={`Editar ${product.name}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}>
              <ProductPhoto uri={imageUri} symbol={product.symbol} size={66}/>
            </Pressable>
            <Pressable style={styles.productInfo} onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}>
              <Text style={styles.productGroup}>{product.group.toUpperCase()}</Text>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>S/ {product.price.toFixed(2)}</Text>
              <Text style={styles.productMediaStatus}>{imageUri ? localMedia?.status === 'published' || merchantProductImages[product.id] ? 'FOTO PUBLICADA' : 'FOTO LOCAL' : 'SIN FOTO · TOCA PARA EDITAR'}</Text>
            </Pressable>
            <View style={styles.productActions}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: stock }}
                onPress={() => {
                  const result = setMerchantProductAvailability(product.id, !stock)
                  showToast({ title: !stock ? 'Producto activado' : 'Producto agotado', message: result.message, tone: result.ok ? (!stock ? 'success' : 'warning') : 'error' })
                }}
                style={[styles.stock, stock ? styles.inStock : styles.outStock]}
              >
                <Text style={styles.stockText}>{stock ? 'ACTIVO' : 'AGOTADO'}</Text>
              </Pressable>
              <Pressable style={styles.editProduct} onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}><Text style={styles.editProductText}>EDITAR</Text></Pressable>
            </View>
          </View>
        })}
        <Button label="AGREGAR PRODUCTO" onPress={() => showDialog({ title: 'Nuevo producto', message: 'El alta de productos requiere versionado del catálogo, validación de categoría y publicación en Cliente. Se implementará como módulo auditado, no como un formulario aislado.', tone: 'info' })} color="yellow" icon="add"/>
      </>}

      {view === 'finanzas' && <>
        <Kicker>LIQUIDACIONES Y MÉTRICAS</Kicker>
        <Text style={styles.pageTitle}>DINERO{`\n`}CLARO.</Text>
        <View style={styles.balance}><Text style={styles.balanceLabel}>PRÓXIMA LIQUIDACIÓN</Text><Text style={styles.balanceValue}>S/ {net.toFixed(2)}</Text><Text style={styles.balanceDate}>Solo operaciones entregadas y conciliadas</Text><Text style={styles.balanceMark}>DA</Text></View>
        <View style={styles.metrics}><Metric label="VENTA BRUTA" value={`S/ ${gross.toFixed(0)}`} color="white"/><Metric label="COMISIÓN PROYECTADA" value={`− S/ ${commission.toFixed(0)}`} color="red"/><Metric label="AJUSTES" value="S/ 0" color="yellow"/><Metric label="NETO" value={`S/ ${net.toFixed(0)}`} color="mint"/></View>
        <SectionTitle title="ÚLTIMOS MOVIMIENTOS"/>
        {relevantOrders.slice(0, 3).map((order) => <View key={order.id} style={styles.movement}><Text style={styles.movementDate}>{order.id.replace('#', '')}</Text><Text style={styles.movementTitle}>{order.customer} · {order.state}</Text><Text style={styles.movementValue}>+ S/ {order.total.toFixed(2)}</Text></View>)}
        <Button label="DESCARGAR REPORTE DEMO" onPress={() => showDialog({ title: 'Reporte preparado', message: 'En producción se generará un PDF o CSV conciliado.', tone: 'info' })} color="black" icon="download-outline"/>
      </>}

      {view === 'perfil' && <>
        <Kicker>CONFIGURACIÓN DEL NEGOCIO</Kicker>
        <Text style={styles.pageTitle}>TU TIENDA.{`\n`}TUS REGLAS.</Text>
        <BusinessCover uri={currentBusinessProfile.coverUri} height={210}>
          <View style={styles.profileTop}><BusinessLogo uri={currentBusinessProfile.logoUri} initials={initials(store.name)} size={72}/><Text style={styles.profileStatus}>{merchantOpen ? 'ABIERTA' : 'PAUSADA'}</Text></View>
          <View style={styles.profileBottom}><Text style={styles.storeName}>{merchantProfile.name.toUpperCase()}</Text><Text style={styles.storeMeta}>{currentBusinessProfile.description}</Text></View>
        </BusinessCover>
        <Button label="EDITAR PERFIL COMERCIAL" onPress={() => router.push('/business-profile')} color="yellow" icon="create-outline"/>
        <View style={styles.contactCard}><Text style={styles.contactLabel}>CONTACTO DEL LOCAL</Text><Text style={styles.contactValue}>{currentBusinessProfile.email}</Text><Text style={styles.contactValue}>{currentBusinessProfile.phone}</Text><Text style={styles.contactValue}>{currentBusinessProfile.address}</Text></View>
        <View style={styles.settingGroup}>
          <ToggleRow title="Tienda abierta" copy="Permite recibir nuevos pedidos." value={merchantOpen} onPress={toggleOpen} color="red"/>
          <ToggleRow title="Aceptación automática" copy="Las nuevas órdenes demo ingresan aceptadas." value={merchantAutoAccept} onPress={() => setMerchantAutoAccept(!merchantAutoAccept)} color="yellow"/>
          <View style={styles.groupEnd}/>
        </View>
        {['Horarios y capacidad', 'Zonas de entrega', 'Promociones', 'Equipo y permisos', 'Datos fiscales', 'Cuenta bancaria'].map((item, index) => <Pressable
          key={item}
          style={styles.settingsRow}
          onPress={() => showDialog({ title: item, message: 'Módulo diseñado para conexión posterior.', tone: 'info' })}
        >
          <View style={[styles.settingsIcon, { backgroundColor: index % 2 ? C.mint : C.yellow }]}><Ionicons name={['time', 'map', 'pricetag', 'people', 'document-text', 'card'][index] as never} size={20}/></View>
          <Text style={styles.settingsText}>{item.toUpperCase()}</Text><Ionicons name="arrow-forward" size={18}/>
        </Pressable>)}
        <Button label="CENTRO DE RESISTENCIA" onPress={() => router.push('/resilience-center')} color="black" icon="pulse-outline"/>
      </>}
    </ScrollView>
    <RoleDock items={dock} active={view} onChange={setView}/>
  </SafeAreaView>
}

function OrderCard({ order, onMove, onCancel }: { order: { id: string; customer: string; items: string; total: number; eta: string; state: MerchantOrderState }; onMove: () => void; onCancel: () => void }) {
  const color = order.state === 'nuevo' ? C.yellow : order.state === 'listo' ? C.mint : C.white
  return <View style={[styles.order, { backgroundColor: color }]}> 
    <View style={styles.orderTop}><Text style={styles.orderId}>{order.id}</Text><Text style={styles.orderState}>{order.state.toUpperCase()}</Text></View>
    <Text style={styles.orderCustomer}>{order.customer.toUpperCase()}</Text>
    <Text style={styles.orderItems}>{order.items}</Text>
    <View style={styles.orderBottom}>
      <View><Text style={styles.orderEta}>{order.eta}</Text><Text style={styles.orderTotal}>S/ {order.total.toFixed(2)}</Text></View>
      {order.state === 'listo'
        ? <Text style={styles.orderWaiting}>ESPERANDO REPARTIDOR</Text>
        : order.state === 'cancelado'
          ? <Text style={[styles.orderWaiting, { color: C.red }]}>CANCELADO</Text>
          : order.state !== 'entregado' && <View style={styles.orderButtons}>
            {order.state === 'nuevo' && <Pressable onPress={onCancel} style={styles.orderReject}><Text style={styles.orderRejectText}>RECHAZAR</Text></Pressable>}
            <Pressable onPress={onMove} style={styles.orderAction}><Text style={styles.orderActionText}>{order.state === 'nuevo' ? 'ACEPTAR' : 'AVANZAR'} →</Text></Pressable>
          </View>}
    </View>
  </View>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  logoButton: { width: 44, height: 44 },
  session: { minHeight: 39, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, borderColor: C.black, backgroundColor: C.black },
  live: { width: 10, height: 10, borderRadius: 5 }, liveOn: { backgroundColor: C.mint }, liveOff: { backgroundColor: C.red },
  sessionText: { flex: 1, color: C.white, fontSize: 7, fontWeight: '900' }, sessionAction: { color: C.yellow, fontSize: 7, fontWeight: '900' },
  syncStrip: { minHeight: 34, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, borderColor: C.black },
  syncOn: { backgroundColor: C.mint }, syncOff: { backgroundColor: C.yellow }, syncText: { flex: 1, fontSize: 7, fontWeight: '900' }, syncAction: { fontSize: 7, fontWeight: '900', color: C.blue },
  storeSwitch: { maxHeight: 48, borderBottomWidth: 2, borderColor: C.black, backgroundColor: C.white },
  storeSwitchContent: { paddingHorizontal: 10, alignItems: 'center', gap: 7 },
  storeChip: { minHeight: 31, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.black, backgroundColor: C.paper },
  storeChipActive: { backgroundColor: C.black }, storeChipText: { fontSize: 6, fontWeight: '900' }, storeChipTextActive: { color: C.yellow },
  content: { padding: 16, paddingBottom: 28 },
  hero: { minHeight: 270, padding: 17, borderWidth: 2, borderColor: C.black, backgroundColor: C.red, overflow: 'hidden', ...shadow },
  heroTitle: { marginTop: 13, color: C.white, fontSize: 43, lineHeight: 35, fontWeight: '900', letterSpacing: -2.3 },
  heroStamp: { position: 'absolute', right: 16, bottom: 15, width: 96, height: 96, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, borderRadius: 48, backgroundColor: C.yellow, transform: [{ rotate: '-8deg' }] },
  heroStampValue: { fontSize: 35, fontWeight: '900' }, heroStampLabel: { fontSize: 7, fontWeight: '900' },
  metrics: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  performance: { padding: 14, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, performanceHead: { flexDirection: 'row', justifyContent: 'space-between' },
  performanceTitle: { fontSize: 8, fontWeight: '900' }, performanceValue: { fontSize: 16, fontWeight: '900' },
  bar: { height: 14, marginVertical: 13, borderWidth: 2, borderColor: C.black, backgroundColor: C.paper }, barFill: { height: '100%', backgroundColor: C.mint },
  performanceGrid: { flexDirection: 'row', justifyContent: 'space-between' }, performanceItem: { fontSize: 7, fontWeight: '900', lineHeight: 11 },
  pageTitle: { marginTop: 9, marginBottom: 20, fontSize: 43, lineHeight: 37, fontWeight: '900', letterSpacing: -2.2 },
  orderFilters: { marginBottom: 14, flexDirection: 'row', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  filter: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: C.black }, filterValue: { fontSize: 21, fontWeight: '900' }, filterLabel: { marginTop: 3, fontSize: 6, fontWeight: '900' },
  order: { marginBottom: 11, padding: 14, borderWidth: 2, borderColor: C.black }, orderTop: { flexDirection: 'row', justifyContent: 'space-between' }, orderId: { fontSize: 8, fontWeight: '900' }, orderState: { fontSize: 7, fontWeight: '900' },
  orderCustomer: { marginTop: 13, fontSize: 22, fontWeight: '900' }, orderItems: { marginTop: 5, color: C.gray, fontSize: 9 },
  orderBottom: { marginTop: 15, paddingTop: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.black },
  orderEta: { fontSize: 8, fontWeight: '900' }, orderTotal: { marginTop: 3, fontSize: 17, fontWeight: '900' }, orderButtons: { flexDirection: 'row', gap: 6 },
  orderReject: { minHeight: 39, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, orderRejectText: { fontSize: 6, fontWeight: '900', color: C.red },
  orderAction: { minHeight: 39, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.black }, orderActionText: { color: C.white, fontSize: 7, fontWeight: '900' },
  orderWaiting: { fontSize: 7, fontWeight: '900', color: C.blue },
  search: { minHeight: 49, marginBottom: 11, paddingHorizontal: 11, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, fontSize: 10 },
  catalogNotice: { minHeight: 65, marginBottom: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow }, catalogNoticeText: { flex: 1, fontSize: 8, fontWeight: '800', lineHeight: 12 },
  product: { minHeight: 96, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  productUnavailable: { backgroundColor: '#F1EEE7' },
  productInfo: { flex: 1, minHeight: 66, justifyContent: 'center' },
  productGroup: { fontSize: 6, fontWeight: '900', color: C.red }, productName: { marginTop: 3, fontSize: 12, fontWeight: '900' }, productPrice: { marginTop: 4, fontSize: 9, fontWeight: '800' },
  productMediaStatus: { marginTop: 5, color: C.gray, fontSize: 6, fontWeight: '900' },
  productActions: { width: 70, gap: 6 },
  stock: { minWidth: 68, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black }, inStock: { backgroundColor: C.mint }, outStock: { backgroundColor: C.red }, stockText: { fontSize: 6, fontWeight: '900' },
  editProduct: { minHeight: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, editProductText: { fontSize: 6, fontWeight: '900' },
  balance: { minHeight: 220, padding: 17, borderWidth: 2, borderColor: C.black, backgroundColor: C.blue, overflow: 'hidden', ...shadow }, balanceLabel: { color: C.white, fontSize: 8, fontWeight: '900' },
  balanceValue: { marginTop: 20, color: C.yellow, fontSize: 42, fontWeight: '900', letterSpacing: -2 }, balanceDate: { marginTop: 6, color: C.white, fontSize: 8 }, balanceMark: { position: 'absolute', right: -10, bottom: -25, color: 'rgba(255,255,255,.16)', fontSize: 100, fontWeight: '900' },
  movement: { minHeight: 65, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white }, movementDate: { width: 42, fontSize: 7, fontWeight: '900' }, movementTitle: { flex: 1, fontSize: 9, fontWeight: '800' }, movementValue: { fontSize: 10, fontWeight: '900' },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, profileStatus: { paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: C.white, color: C.white, fontSize: 7, fontWeight: '900' }, profileBottom: { marginTop: 'auto' },
  storeName: { color: C.white, fontSize: 25, fontWeight: '900' }, storeMeta: { marginTop: 5, color: C.yellow, fontSize: 8 },
  contactCard: { marginTop: 10, marginBottom: 18, padding: 13, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, contactLabel: { marginBottom: 8, fontSize: 8, fontWeight: '900' }, contactValue: { marginTop: 4, fontSize: 9, fontWeight: '700' },
  settingGroup: { marginBottom: 18 }, groupEnd: { height: 2, backgroundColor: C.black },
  settingsRow: { minHeight: 66, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  settingsIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black }, settingsText: { flex: 1, fontSize: 9, fontWeight: '900' },
})
