import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { stores } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { Button, EmptyState } from '@/components/UI'
import { C, shadow } from '@/theme'

function syncTime(value: string | null) {
  if (!value) return 'esperando primera revisión'
  return new Date(value).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Orders() {
  const router = useRouter()
  const {
    cartStore,
    total,
    allCartCount,
    cartStoreCount,
    orderStage,
    deliveryKind,
    activeShipment,
    activeOrder,
    activeOperation,
    operations,
    getOperationCoordination,
    history,
    hubConnected,
    pendingActions,
    syncStatus,
    lastHubSyncAt,
    syncNow,
  } = useApp()

  const isShipment = deliveryKind === 'shipment'
  const provider = isShipment
    ? stores.find((store) => store.id === activeShipment?.providerId)
    : null
  const service = isShipment
    ? provider?.products.find((product) => product.id === activeShipment?.serviceId)
    : null
  const activeName = isShipment
    ? `${provider?.name ?? 'DA Express'} · ${service?.name ?? 'Envío'}`
    : (stores.find((store) => store.id === activeOrder?.storeId)?.name ?? 'Pedido')

  const stageLabels = isShipment
    ? ['', 'CONFIRMADO', 'ASIGNADO', 'RECOGIDO', 'EN CAMINO', 'ENTREGADO']
    : ['', 'CONFIRMADO', 'PREPARANDO', 'EN CAMINO', 'LLEGANDO']
  const stageMax = isShipment ? 5 : 4
  const pendingCount = pendingActions.length
  const otherActiveOperations = operations.filter((operation) =>
    operation.id !== activeOperation?.id
    && !['delivered', 'cancelled'].includes(operation.status)
    && Boolean(getOperationCoordination(operation.id)),
  )

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>PEDIDOS Y ENVÍOS</Text>
      <Text style={styles.title}>TODO TU{'\n'}HISTORIAL.</Text>

      <View style={[styles.sync, hubConnected && styles.syncConnected]}>
        <View style={[styles.syncDot, hubConnected && styles.syncDotConnected]}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.syncTitle}>
            {hubConnected
              ? 'SYNC HUB CONECTADO'
              : pendingCount
                ? 'PEDIDOS PENDIENTES'
                : 'TRABAJANDO EN LOCAL'}
          </Text>
          <Text style={styles.syncCopy}>
            {hubConnected
              ? `Última revisión ${syncTime(lastHubSyncAt)}.`
              : pendingCount
                ? `${pendingCount} cambio(s) se enviarán al recuperar la conexión.`
                : `Estado ${syncStatus}. Inicia el Sync Hub para compartir pedidos.`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sincronizar pedidos ahora"
          onPress={() => void syncNow()}
          style={({ pressed }) => [styles.syncButton, pressed && { opacity: .65 }]}
        >
          <Text style={styles.syncButtonText}>SYNC</Text>
        </Pressable>
      </View>

      {orderStage > 0 && <Pressable
        onPress={() => router.push('/tracking')}
        style={[styles.active, isShipment && { backgroundColor: C.mint }]}
      >
        <Text style={[styles.activeSmall, isShipment && { color: C.black }]}>
          {isShipment ? 'ENVÍO ACTIVO' : 'PEDIDO ACTIVO'}
        </Text>
        <Text style={[styles.activeStore, isShipment && { color: C.black }]}>
          {activeName.toUpperCase()}
        </Text>
        <Text style={[styles.activeState, isShipment && { color: C.blue }]}>
          {stageLabels[orderStage]}
        </Text>
        <View style={styles.progress}>
          <View style={[styles.fill, {
            width: `${Math.min(100, orderStage * (100 / stageMax))}%`,
          }]}/>
        </View>
        <Text style={[styles.action, isShipment && { color: C.black }]}>
          VER SEGUIMIENTO →
        </Text>
      </Pressable>}

      {otherActiveOperations.length > 0 && <>
        <Text style={styles.section}>OTROS PEDIDOS EN CURSO</Text>
        {otherActiveOperations.map((operation) => {
          const coordination = getOperationCoordination(operation.id)
          return <View key={operation.id} style={styles.liveOrder}>
            <View style={{ flex: 1 }}>
              <Text style={styles.liveOrderId}>{operation.id}</Text>
              <Text style={styles.liveOrderTitle}>{operation.merchantName.toUpperCase()}</Text>
              <Text style={styles.liveOrderCopy}>{operation.itemSummary}</Text>
              <Text style={styles.liveOrderMeta}>{operation.status.toUpperCase()} · {coordination?.messages.length ?? 0} mensajes</Text>
            </View>
            <View style={styles.liveOrderActions}>
              <Pressable onPress={() => router.push({ pathname: '/order-chat/[id]', params: { id: operation.id } } as never)} style={styles.liveOrderButton}><Text style={styles.liveOrderButtonText}>CHAT</Text></Pressable>
              <Pressable onPress={() => router.push({ pathname: '/order/[id]', params: { id: operation.id } } as never)} style={[styles.liveOrderButton, { backgroundColor: C.mint }]}><Text style={styles.liveOrderButtonText}>ABRIR</Text></Pressable>
            </View>
          </View>
        })}
      </>}

      {allCartCount > 0 && <View style={styles.cart}>
        <Text style={styles.cartSmall}>{cartStoreCount > 1 ? `${cartStoreCount} CARRITOS GUARDADOS` : 'CARRITO GUARDADO'}</Text>
        <Text style={styles.cartTitle}>{cartStoreCount > 1 ? 'TUS COMPRAS' : cartStore?.name}</Text>
        <Text style={styles.cartMeta}>
          {allCartCount} productos en {cartStoreCount} comercio(s) · carrito abierto S/ {total.toFixed(2)}
        </Text>
        <Button label="ABRIR CARRITOS" onPress={() => router.push('/cart')}/>
      </View>}

      <Text style={styles.section}>COMPLETADOS</Text>
      {history.length === 0
        ? <EmptyState title="SIN PEDIDOS." copy="Tus pedidos y envíos aparecerán aquí."/>
        : history.map((record) => <Pressable
            key={record.id}
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: record.id } })}
            style={styles.order}
          >
            <View style={[styles.orderIcon, record.kind === 'shipment' && { backgroundColor: C.yellow }]}>
              <Text style={styles.orderIconText}>
                {record.kind === 'shipment'
                  ? 'DX'
                  : record.title.split(' ').map((word) => word[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderId}>{record.id} · {record.date}</Text>
              <Text style={styles.orderStore}>{record.title.toUpperCase()}</Text>
              <Text style={styles.orderState}>{record.status.toUpperCase()} ✓</Text>
              <Text style={styles.orderSummary}>{record.summary}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.orderTotal}>S/ {record.total.toFixed(2)}</Text>
              <Text style={styles.open}>ABRIR →</Text>
            </View>
          </Pressable>)}
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 110 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 10, fontSize: 47, lineHeight: 39, fontWeight: '900', letterSpacing: -2.4 },
  sync: {
    minHeight: 70,
    marginTop: 20,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.yellow,
  },
  syncConnected: { backgroundColor: C.mint },
  syncDot: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: C.black,
    borderRadius: 6,
    backgroundColor: C.red,
  },
  syncDotConnected: { backgroundColor: C.blue },
  syncTitle: { fontSize: 9, fontWeight: '900', letterSpacing: .5 },
  syncCopy: { marginTop: 4, color: C.gray, fontSize: 7, lineHeight: 10 },
  syncButton: {
    minWidth: 50,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  syncButtonText: { fontSize: 8, fontWeight: '900' },
  active: {
    marginTop: 18,
    padding: 17,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.blue,
    ...shadow,
  },
  activeSmall: { color: C.white, fontSize: 8, fontWeight: '900' },
  activeStore: { marginTop: 15, color: C.white, fontSize: 25, fontWeight: '900' },
  activeState: { marginTop: 4, color: C.yellow, fontSize: 15, fontWeight: '900' },
  progress: {
    height: 12,
    marginTop: 17,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  fill: { height: '100%', backgroundColor: C.mint },
  action: { marginTop: 13, color: C.white, fontSize: 9, fontWeight: '900' },
  liveOrder: { minHeight: 116, marginBottom: 9, padding: 12, flexDirection: 'row', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  liveOrderId: { fontSize: 7, fontWeight: '900', color: C.gray },
  liveOrderTitle: { marginTop: 5, fontSize: 16, fontWeight: '900' },
  liveOrderCopy: { marginTop: 4, color: C.gray, fontSize: 8 },
  liveOrderMeta: { marginTop: 7, color: C.blue, fontSize: 7, fontWeight: '900' },
  liveOrderActions: { width: 62, gap: 6, justifyContent: 'center' },
  liveOrderButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  liveOrderButtonText: { fontSize: 6, fontWeight: '900' },
  cart: {
    marginTop: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  cartSmall: { fontSize: 8, fontWeight: '900' },
  cartTitle: { marginTop: 8, fontSize: 24, fontWeight: '900' },
  cartMeta: { marginVertical: 12, color: C.gray, fontSize: 10 },
  section: { marginTop: 30, marginBottom: 11, fontSize: 20, fontWeight: '900' },
  order: {
    minHeight: 95,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
    marginBottom: 9,
  },
  orderIcon: {
    width: 55,
    height: 55,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIconText: { fontWeight: '900' },
  orderId: { fontSize: 7, fontWeight: '800', color: C.gray },
  orderStore: { marginTop: 4, fontSize: 14, fontWeight: '900' },
  orderState: { marginTop: 4, fontSize: 7, fontWeight: '900', color: '#087457' },
  orderSummary: { marginTop: 3, color: C.gray, fontSize: 7 },
  orderTotal: { fontSize: 13, fontWeight: '900' },
  open: { marginTop: 8, color: C.blue, fontSize: 7, fontWeight: '900' },
})
