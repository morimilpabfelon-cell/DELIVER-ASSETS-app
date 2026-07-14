import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Button, Header, Kicker } from '@/components/UI'
import { CustomerProductMedia } from '@/components/CustomerProductMedia'
import { useApp } from '@/context/AppContext'
import { C, shadow, tone } from '@/theme'

function savedTime(value: string | null) {
  if (!value) return 'PENDIENTE'
  return new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export default function Cart() {
  const router = useRouter()
  const {
    cart, allCartLines, cartCount, allCartCount, cartStoreCount, savedCarts,
    activeCartStoreId, selectCartStore, cartStore, cartLastSavedAt,
    cartPersistenceStatus, cartRecovered, subtotal, deliveryFee, serviceFee,
    discount, total, promo, updateCartLineQuantity, removeCartLine, clearCart,
    clearAllCarts, isStoreOpen, isProductAvailable, getProductImage,
  } = useApp()

  if (!allCartLines.length) {
    return <SafeAreaView style={styles.empty} edges={['top','bottom']}>
      <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={42}/></View>
      <Text style={styles.emptyTitle}>TUS CARRITOS{`\n`}ESTÁN VACÍOS.</Text>
      <Text style={styles.emptyCopy}>Puedes guardar productos de varios comercios. Cada comercio mantiene su propio carrito y su propio checkout.</Text>
      <Button label="EXPLORAR TIENDAS" onPress={() => router.replace('/(tabs)')} color="black" icon="arrow-forward"/>
    </SafeAreaView>
  }

  if (!cartStore || !cart.length) return null

  const unavailable = cart.filter((line) => !isStoreOpen(line.storeId) || !isProductAvailable(line.storeId, line.product.id))
  const minimumRemaining = Math.max(0, cartStore.minimum - subtotal)
  const canCheckout = unavailable.length === 0 && minimumRemaining <= 0

  const confirmClear = () => Alert.alert(
    'Vaciar este carrito',
    `Se eliminarán los ${cartCount} productos guardados de ${cartStore.name}. Tus otros carritos no cambiarán.`,
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Vaciar', style: 'destructive', onPress: clearCart }],
  )

  const confirmClearAll = () => Alert.alert(
    'Vaciar todos los carritos',
    `Se eliminarán ${allCartCount} productos guardados en ${cartStoreCount} comercio(s).`,
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Vaciar todos', style: 'destructive', onPress: clearAllCarts }],
  )

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="TUS CARRITOS" kicker={`${cartStoreCount} COMERCIO${cartStoreCount === 1 ? '' : 'S'} GUARDADO${cartStoreCount === 1 ? '' : 'S'}`} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.saveStrip}>
        <View style={[styles.saveDot, cartPersistenceStatus === 'error' && { backgroundColor: C.red }]}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.saveTitle}>{cartPersistenceStatus === 'saving' ? 'GUARDANDO CAMBIOS…' : cartPersistenceStatus === 'error' ? 'ERROR DE GUARDADO' : 'CARRITOS PROTEGIDOS'}</Text>
          <Text style={styles.saveCopy}>Último guardado: {savedTime(cartLastSavedAt)} · {allCartCount} productos en {cartStoreCount} carrito(s)</Text>
        </View>
        <Ionicons name="cloud-done-outline" size={23}/>
      </View>

      {cartRecovered && <View style={styles.recovered}><Ionicons name="refresh-circle" size={23}/><View style={{ flex: 1 }}><Text style={styles.recoveredTitle}>CARRITOS RECUPERADOS</Text><Text style={styles.recoveredCopy}>La copia principal falló y se restauró la copia de seguridad.</Text></View></View>}

      {savedCarts.length > 1 && <>
        <View style={styles.cartsHeader}><Text style={styles.section}>MIS CARRITOS</Text><Pressable onPress={confirmClearAll}><Text style={styles.clear}>VACIAR TODOS</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cartTabs}>
          {savedCarts.map((summary) => {
            const active = summary.storeId === activeCartStoreId
            return <Pressable
              key={summary.storeId}
              accessibilityRole="button"
              accessibilityLabel={`Abrir carrito de ${summary.store.name}`}
              onPress={() => selectCartStore(summary.storeId)}
              style={[styles.cartTab, active && styles.cartTabActive, { backgroundColor: active ? tone(summary.store.tone) : C.white }]}
            >
              <View style={styles.cartTabTop}><Text style={styles.cartTabSymbol}>{summary.store.symbol}</Text><Text style={styles.cartTabCount}>{summary.itemCount}</Text></View>
              <Text numberOfLines={1} style={styles.cartTabName}>{summary.store.name.toUpperCase()}</Text>
              <Text style={styles.cartTabMeta}>{summary.lineCount} línea{summary.lineCount === 1 ? '' : 's'}</Text>
              <Text style={styles.cartTabPrice}>S/ {summary.total.toFixed(2)}</Text>
              {active && <Text style={styles.cartTabActiveText}>ABIERTO</Text>}
            </Pressable>
          })}
        </ScrollView>
      </>}

      <View style={[styles.storeCard, { backgroundColor: tone(cartStore.tone) }]}>
        <View style={styles.storeSymbol}><Text style={styles.storeSymbolText}>{cartStore.symbol}</Text></View>
        <View style={{ flex: 1 }}><Kicker>{cartStore.category.toUpperCase()} · CHECKOUT SEPARADO</Kicker><Text style={styles.storeName}>{cartStore.name.toUpperCase()}</Text><Text style={styles.storeCopy}>{cartCount} productos guardados · S/ {total.toFixed(2)}</Text></View>
        <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: String(cartStore.id) } })} style={styles.storeArrow}><Ionicons name="arrow-forward" size={20}/></Pressable>
      </View>

      {minimumRemaining > 0 && <View style={styles.minimum}>
        <View style={{ flex: 1 }}><Text style={styles.minimumTitle}>FALTA PARA EL PEDIDO MÍNIMO</Text><Text style={styles.minimumCopy}>Agrega S/ {minimumRemaining.toFixed(2)} más en {cartStore.name}.</Text></View>
        <Text style={styles.minimumValue}>S/ {cartStore.minimum.toFixed(2)}</Text>
      </View>}

      {unavailable.length > 0 && <View style={styles.warning}><Ionicons name="warning" size={22} color={C.white}/><View style={{ flex: 1 }}><Text style={styles.warningTitle}>REVISA ESTE CARRITO</Text><Text style={styles.warningCopy}>{unavailable.length} producto(s) ya no están disponibles. Retíralos para continuar.</Text></View></View>}

      <View style={styles.sectionHead}><Text style={styles.section}>PRODUCTOS DE {cartStore.name.toUpperCase()}</Text><Pressable onPress={confirmClear}><Text style={styles.clear}>VACIAR ESTE</Text></Pressable></View>
      <View style={styles.lines}>
        {cart.map((line) => {
          const extrasTotal = line.extras.reduce((sum, label) => sum + (line.product.options?.find((option) => option.label === label)?.price ?? 0), 0)
          const lineTotal = (line.product.price + extrasTotal) * line.quantity
          const available = isStoreOpen(line.storeId) && isProductAvailable(line.storeId, line.product.id)
          return <View key={line.id} style={[styles.line, !available && styles.lineUnavailable]}>
            <CustomerProductMedia uri={getProductImage(line.storeId, line.product.id)} symbol={line.product.symbol} style={[styles.productArt, { backgroundColor: tone(cartStore.tone) }]}/>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineName}>{line.product.name}</Text>
              <Text style={styles.lineMeta}>{line.extras.join(' · ') || 'Sin extras'}{line.note ? ` · ${line.note}` : ''}</Text>
              {!available && <Text style={styles.unavailable}>NO DISPONIBLE</Text>}
              <View style={styles.lineBottom}>
                <View style={styles.qty}>
                  <Pressable accessibilityLabel={`Quitar una unidad de ${line.product.name}`} onPress={() => updateCartLineQuantity(line.id, -1)}><Text style={styles.qtyButton}>−</Text></Pressable>
                  <Text style={styles.qtyValue}>{line.quantity}</Text>
                  <Pressable accessibilityLabel={`Agregar una unidad de ${line.product.name}`} onPress={() => updateCartLineQuantity(line.id, 1)}><Text style={styles.qtyButton}>+</Text></Pressable>
                </View>
                <Text style={styles.linePrice}>S/ {lineTotal.toFixed(2)}</Text>
              </View>
            </View>
            <Pressable accessibilityLabel={`Eliminar ${line.product.name}`} onPress={() => removeCartLine(line.id)} style={styles.remove}><Ionicons name="trash-outline" size={18}/></Pressable>
          </View>
        })}
        <View style={styles.linesEnd}/>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: String(cartStore.id) } })} style={styles.continueShopping}>
        <Ionicons name="add-circle-outline" size={21}/><Text style={styles.continueText}>AGREGAR MÁS DE {cartStore.name.toUpperCase()}</Text><Text style={styles.continueArrow}>→</Text>
      </Pressable>

      <View style={styles.summary}>
        <View style={styles.sumRow}><Text style={styles.sumLabel}>Productos</Text><Text style={styles.sumValue}>S/ {subtotal.toFixed(2)}</Text></View>
        <View style={styles.sumRow}><Text style={styles.sumLabel}>Envío</Text><Text style={styles.sumValue}>S/ {deliveryFee.toFixed(2)}</Text></View>
        <View style={styles.sumRow}><Text style={styles.sumLabel}>Servicio</Text><Text style={styles.sumValue}>S/ {serviceFee.toFixed(2)}</Text></View>
        {discount > 0 && <View style={styles.sumRow}><Text style={styles.discount}>Descuento {promo}</Text><Text style={styles.discount}>− S/ {discount.toFixed(2)}</Text></View>}
        <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL DE ESTE COMERCIO</Text><Text style={styles.totalValue}>S/ {total.toFixed(2)}</Text></View>
      </View>

      <Button label={canCheckout ? `COMPRAR EN ${cartStore.name.toUpperCase()}` : unavailable.length ? 'RETIRA PRODUCTOS NO DISPONIBLES' : `FALTAN S/ ${minimumRemaining.toFixed(2)}`} onPress={() => router.push('/checkout')} disabled={!canCheckout} color="black" icon="arrow-forward-circle-outline"/>
      <Text style={styles.footnote}>Cada comercio mantiene un carrito independiente. Puedes guardar varios, pero cada pedido se confirma y entrega por separado.</Text>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 36 },
  saveStrip: { minHeight: 66, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  saveDot: { width: 12, height: 12, borderWidth: 1, borderColor: C.black, borderRadius: 7, backgroundColor: C.mint },
  saveTitle: { fontSize: 8, fontWeight: '900' },
  saveCopy: { marginTop: 4, color: C.gray, fontSize: 7 },
  recovered: { minHeight: 67, marginTop: 10, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  recoveredTitle: { fontSize: 9, fontWeight: '900' },
  recoveredCopy: { marginTop: 3, fontSize: 7, lineHeight: 10 },
  cartsHeader: { marginTop: 24, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartTabs: { gap: 10, paddingRight: 8 },
  cartTab: { width: 154, minHeight: 150, padding: 11, borderWidth: 2, borderColor: C.black },
  cartTabActive: { borderWidth: 3, ...shadow },
  cartTabTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartTabSymbol: { fontSize: 25, fontWeight: '900' },
  cartTabCount: { minWidth: 29, height: 29, paddingHorizontal: 5, textAlign: 'center', textAlignVertical: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 15, backgroundColor: C.white, fontSize: 9, fontWeight: '900' },
  cartTabName: { marginTop: 14, fontSize: 12, fontWeight: '900' },
  cartTabMeta: { marginTop: 3, color: C.gray, fontSize: 7 },
  cartTabPrice: { marginTop: 'auto', fontSize: 17, fontWeight: '900' },
  cartTabActiveText: { marginTop: 5, fontSize: 6, fontWeight: '900', letterSpacing: .7 },
  storeCard: { minHeight: 125, marginTop: 15, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: C.black, ...shadow },
  storeSymbol: { width: 65, height: 65, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  storeSymbolText: { fontSize: 21, fontWeight: '900' },
  storeName: { marginTop: 6, fontSize: 20, fontWeight: '900' },
  storeCopy: { marginTop: 4, fontSize: 8, fontWeight: '700' },
  storeArrow: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  minimum: { minHeight: 72, marginTop: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  minimumTitle: { fontSize: 8, fontWeight: '900' },
  minimumCopy: { marginTop: 4, fontSize: 8 },
  minimumValue: { fontSize: 17, fontWeight: '900' },
  warning: { minHeight: 72, marginTop: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.red },
  warningTitle: { color: C.white, fontSize: 9, fontWeight: '900' },
  warningCopy: { marginTop: 4, color: C.white, fontSize: 8, lineHeight: 11 },
  sectionHead: { marginTop: 25, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  section: { flex: 1, fontSize: 18, fontWeight: '900' },
  clear: { color: C.red, fontSize: 8, fontWeight: '900' },
  lines: {},
  line: { minHeight: 126, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  lineUnavailable: { backgroundColor: '#F1ECE4' },
  productArt: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black },
  productSymbol: { fontSize: 20, fontWeight: '900' },
  lineName: { fontSize: 12, fontWeight: '900' },
  lineMeta: { marginTop: 4, color: C.gray, fontSize: 7, lineHeight: 10 },
  unavailable: { marginTop: 5, color: C.red, fontSize: 7, fontWeight: '900' },
  lineBottom: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qty: { width: 92, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: C.black },
  qtyButton: { fontSize: 18, fontWeight: '900' },
  qtyValue: { fontSize: 10, fontWeight: '900' },
  linePrice: { fontSize: 11, fontWeight: '900' },
  remove: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.black, backgroundColor: C.white },
  linesEnd: { height: 2, backgroundColor: C.black },
  continueShopping: { minHeight: 55, marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  continueText: { flex: 1, fontSize: 8, fontWeight: '900' },
  continueArrow: { fontSize: 20, fontWeight: '900' },
  summary: { marginVertical: 18, padding: 14, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  sumRow: { minHeight: 28, flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontSize: 9 },
  sumValue: { fontSize: 9, fontWeight: '800' },
  discount: { color: '#087457', fontSize: 9, fontWeight: '900' },
  totalRow: { marginTop: 9, paddingTop: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 2, borderColor: C.black },
  totalLabel: { fontSize: 9, fontWeight: '900' },
  totalValue: { fontSize: 25, fontWeight: '900' },
  footnote: { marginTop: 12, paddingHorizontal: 10, color: C.gray, fontSize: 7, lineHeight: 11, textAlign: 'center' },
  empty: { flex: 1, padding: 28, justifyContent: 'center', gap: 18, backgroundColor: C.paper },
  emptyIcon: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, borderRadius: 40, backgroundColor: C.yellow },
  emptyTitle: { fontSize: 44, lineHeight: 38, fontWeight: '900', letterSpacing: -2 },
  emptyCopy: { color: C.gray, fontSize: 10, lineHeight: 15 },
})
