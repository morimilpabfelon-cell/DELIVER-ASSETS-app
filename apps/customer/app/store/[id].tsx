import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { categoryByKey, stores } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { CartDock } from '@/components/CartDock'
import { CustomerProductMedia } from '@/components/CustomerProductMedia'
import { Button } from '@/components/UI'
import { C, shadow, tone } from '@/theme'

export default function Store() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const {
    favorites,
    toggleFavorite,
    isStoreOpen,
    isProductAvailable,
    getProductImage,
    adminMaintenance,
  } = useApp()
  const store = stores.find((item) => item.id === Number(id))

  if (!store) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.invalid}>
        <Text style={styles.invalidTitle}>COMERCIO NO ENCONTRADO.</Text>
        <Text style={styles.invalidCopy}>La ruta no coincide con un comercio vigente. Regresa al inicio y selecciónalo otra vez.</Text>
        <Button label="VOLVER AL INICIO" onPress={() => router.replace('/(tabs)')} color="black"/>
      </View>
    </SafeAreaView>
  }

  const meta = categoryByKey(store.category)
  const isShipping = store.category === 'envios'
  const storeOpen = isStoreOpen(store.id) && !adminMaintenance
  const openItem = (productId: number) => router.push({
    pathname: isShipping ? '/shipment/[id]' : '/product/[id]',
    params: { id: String(productId), storeId: String(store.id) },
  } as never)

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: tone(store.tone) }]}>
        <View style={styles.top}>
          <Pressable accessibilityLabel="Volver" style={styles.round} onPress={() => router.back()}><Ionicons name="arrow-back" size={22}/></Pressable>
          <Pressable accessibilityLabel={favorites.includes(store.id) ? 'Quitar favorito' : 'Agregar favorito'} style={styles.round} onPress={() => toggleFavorite(store.id)}>
            <Ionicons name={favorites.includes(store.id) ? 'heart' : 'heart-outline'} size={22} color={favorites.includes(store.id) ? C.red : C.black}/>
          </Pressable>
        </View>
        <Text style={styles.category}>{meta.label.toUpperCase()}</Text>
        <Text style={styles.symbol}>{store.symbol}</Text>
        <Text style={styles.featured}>{store.featured}</Text>
        <View style={styles.ringA}/><View style={styles.ringB}/>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{store.name.toUpperCase()}</Text>
        <Text style={styles.desc}>{store.descriptor}</Text>
        <View style={styles.meta}>
          <Text style={styles.pill}>★ {store.rating}</Text>
          <Text style={styles.metaText}>{store.eta}</Text>
          {!isShipping && <Text style={styles.metaText}>Envío S/ {store.delivery.toFixed(2)}</Text>}
        </View>
      </View>

      <View style={styles.purity}><Ionicons name="checkmark-circle" size={18}/><Text style={styles.purityText}>{meta.purity}</Text></View>
      {!storeOpen && <View style={styles.closed}><Ionicons name="pause-circle" size={20}/><View style={{ flex: 1 }}><Text style={styles.closedTitle}>{adminMaintenance ? 'PLATAFORMA EN MANTENIMIENTO' : 'COMERCIO PAUSADO'}</Text><Text style={styles.closedCopy}>Puedes revisar el catálogo, pero no crear nuevas operaciones.</Text></View></View>}
      <View style={styles.minimum}><Text style={styles.minLabel}>{isShipping ? 'TARIFA DESDE' : 'PEDIDO MÍNIMO'}</Text><Text style={styles.minValue}>{isShipping ? `S/ ${Math.min(...store.products.map((item) => item.price)).toFixed(2)}` : `S/ ${store.minimum.toFixed(2)}`}</Text></View>

      <Text style={styles.section}>{meta.catalogLabel}</Text>
      {store.products.map((product) => {
        const available = storeOpen && isProductAvailable(store.id, product.id)
        const photo = getProductImage(store.id, product.id)
        return <Pressable
          key={product.id}
          disabled={!available}
          onPress={() => openItem(product.id)}
          style={[styles.product, !available && styles.productDisabled]}
        >
          <CustomerProductMedia uri={photo} symbol={product.symbol} style={[styles.productArt, { backgroundColor: tone(store.tone) }]}/>
          {product.popular && <Text style={styles.popular}>POPULAR</Text>}
          {!available && <Text style={styles.unavailable}>{storeOpen ? 'AGOTADO' : 'PAUSADO'}</Text>}
          <View style={styles.productBody}>
            <View style={{ flex: 1 }}>
              <Text style={styles.group}>{product.group.toUpperCase()}</Text>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDesc}>{product.description}</Text>
              <Text style={styles.price}>{isShipping ? 'DESDE ' : ''}S/ {product.price.toFixed(2)}</Text>
            </View>
            <View style={[styles.add, !available && styles.addDisabled]}><Text style={styles.addText}>{available ? (isShipping ? '→' : '+') : '×'}</Text></View>
          </View>
        </Pressable>
      })}

      {isShipping && <View style={styles.shippingNote}><Text style={styles.shippingNoteTitle}>MENSAJERÍA SEPARADA</Text><Text style={styles.shippingNoteCopy}>Los servicios de esta sección solo aceptan documentos, sobres, paquetes y rutas declaradas. No utilizan el carrito comercial.</Text></View>}
    </ScrollView>
    {!isShipping && <CartDock storeId={store.id}/>} 
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 105 },
  invalid: { flex: 1, padding: 24, justifyContent: 'center' },
  invalidTitle: { fontSize: 38, lineHeight: 34, fontWeight: '900', letterSpacing: -2 },
  invalidCopy: { marginVertical: 15, color: C.gray, fontSize: 10, lineHeight: 16 },
  hero: { height: 230, padding: 16, overflow: 'hidden', borderBottomWidth: 2, borderColor: C.black },
  top: { zIndex: 4, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 22, backgroundColor: C.white },
  category: { zIndex: 3, marginTop: 28, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  symbol: { zIndex: 3, marginTop: 7, fontSize: 62, lineHeight: 64, fontWeight: '900' },
  featured: { zIndex: 3, marginTop: 2, fontSize: 9, fontWeight: '900' },
  ringA: { position: 'absolute', right: -35, bottom: 15, width: 190, height: 70, borderWidth: 6, borderColor: C.black, borderRadius: 50, transform: [{ rotate: '-24deg' }] },
  ringB: { position: 'absolute', right: 5, top: 70, width: 105, height: 105, borderWidth: 4, borderColor: C.black, borderRadius: 55 },
  info: { padding: 16 },
  name: { fontSize: 31, lineHeight: 29, fontWeight: '900', letterSpacing: -1.3 },
  desc: { marginTop: 7, color: C.gray, fontSize: 10, lineHeight: 15 },
  meta: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: C.black, backgroundColor: C.yellow, fontSize: 8, fontWeight: '900' },
  metaText: { fontSize: 8, fontWeight: '900' },
  purity: { marginHorizontal: 16, minHeight: 55, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  purityText: { flex: 1, fontSize: 8, fontWeight: '800', lineHeight: 12 },
  closed: { marginHorizontal: 16, marginTop: 10, minHeight: 66, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.red },
  closedTitle: { color: C.white, fontSize: 9, fontWeight: '900' },
  closedCopy: { marginTop: 4, color: C.white, fontSize: 8, lineHeight: 11 },
  minimum: { margin: 16, padding: 11, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  minLabel: { fontSize: 8, fontWeight: '900' },
  minValue: { fontSize: 11, fontWeight: '900' },
  section: { marginHorizontal: 16, marginBottom: 10, fontSize: 22, fontWeight: '900' },
  product: { position: 'relative', marginHorizontal: 16, marginBottom: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  productDisabled: { opacity: .58 },
  productArt: { width: '100%', height: 148 },
  unavailable: { position: 'absolute', left: 10, top: 108, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.black, backgroundColor: C.white, fontSize: 7, fontWeight: '900' },
  popular: { position: 'absolute', right: 10, top: 10, zIndex: 3, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: C.black, backgroundColor: C.white, fontSize: 7, fontWeight: '900' },
  productBody: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  group: { color: C.red, fontSize: 7, fontWeight: '900' },
  productName: { marginTop: 4, fontSize: 19, fontWeight: '900' },
  productDesc: { marginTop: 4, color: C.gray, fontSize: 9, lineHeight: 13 },
  price: { marginTop: 10, fontSize: 16, fontWeight: '900' },
  addDisabled: { backgroundColor: C.line },
  add: { width: 44, height: 44, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', ...shadow },
  addText: { fontSize: 25, fontWeight: '900' },
  shippingNote: { marginHorizontal: 16, padding: 15, borderWidth: 2, borderColor: C.black, backgroundColor: C.black },
  shippingNoteTitle: { color: C.mint, fontSize: 10, fontWeight: '900' },
  shippingNoteCopy: { marginTop: 7, color: C.white, fontSize: 8, lineHeight: 13 },
})
