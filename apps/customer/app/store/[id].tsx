import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { categoryByKey, stores, templateForStore } from '@/data/catalog'
import type { SharedCatalogProduct } from '@/data/merchantCatalog'
import { useApp } from '@/context/AppContext'
import { CartDock } from '@/components/CartDock'
import { CustomerBusinessCover, CustomerBusinessLogo } from '@/components/CustomerBusinessMedia'
import { CustomerProductMedia } from '@/components/CustomerProductMedia'
import { Button } from '@/components/UI'
import { C, shadow, tone } from '@/theme'

function productFacts(product: SharedCatalogProduct, mode: ReturnType<typeof templateForStore>['customerMode']) {
  if (mode === 'menu') return [product.group, product.popular ? 'Popular' : 'Preparado al pedir']
  if (mode === 'aisles') return [product.unit || product.presentation || 'Unidad', product.brand || product.group]
  if (mode === 'care') return [product.presentation || 'Presentación', product.brand || product.group]
  if (mode === 'collection') return [product.brand || product.group, product.attributes?.material || `${product.variants?.length ?? 0} variantes`]
  if (mode === 'sizes') return [product.presentation || 'Par', `${product.variants?.filter((item) => item.stock > 0).length ?? 0} tallas/colores`]
  if (mode === 'specs') return [product.brand || product.group, product.attributes?.garantía || product.presentation || 'Ficha técnica']
  return [product.group, product.presentation || 'Servicio']
}

export default function Store() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const {
    favorites,
    toggleFavorite,
    isStoreOpen,
    isProductAvailable,
    getProductImage,
    getStoreProducts,
    getStorePublicProfile,
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
  const template = templateForStore(store)
  const publicProfile = getStorePublicProfile(store.id)
  const products = getStoreProducts(store.id)
  const isShipping = store.category === 'envios'
  const storeOpen = isStoreOpen(store.id) && !adminMaintenance
  const prices = products.map((item) => item.price).filter(Number.isFinite)
  const startingPrice = prices.length ? Math.min(...prices) : 0
  const openItem = (productId: number) => router.push({
    pathname: isShipping ? '/shipment/[id]' : '/product/[id]',
    params: { id: String(productId), storeId: String(store.id) },
  } as never)

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <CustomerBusinessCover profile={publicProfile} store={store} style={styles.hero}>
        <View style={styles.top}>
          <Pressable accessibilityLabel="Volver" style={styles.round} onPress={() => router.back()}><Ionicons name="arrow-back" size={22}/></Pressable>
          <Pressable accessibilityLabel={favorites.includes(store.id) ? 'Quitar favorito' : 'Agregar favorito'} style={styles.round} onPress={() => toggleFavorite(store.id)}>
            <Ionicons name={favorites.includes(store.id) ? 'heart' : 'heart-outline'} size={22} color={favorites.includes(store.id) ? C.red : C.black}/>
          </Pressable>
        </View>
        <View style={styles.heroIdentity}>
          <CustomerBusinessLogo profile={publicProfile} store={store} size={72}/>
          <View style={{ flex: 1 }}>
            <Text style={[styles.category, publicProfile.coverUrl && styles.lightText]}>{template.label.toUpperCase()} · {meta.label.toUpperCase()}</Text>
            <Text style={[styles.featured, publicProfile.coverUrl && styles.lightText]}>{store.featured}</Text>
          </View>
        </View>
      </CustomerBusinessCover>

      <View style={styles.info}>
        <Text style={styles.name}>{publicProfile.name.toUpperCase()}</Text>
        <Text style={styles.desc}>{publicProfile.descriptor || store.descriptor}</Text>
        <Text style={styles.description}>{publicProfile.description}</Text>
        <View style={styles.meta}>
          <Text style={styles.pill}>★ {store.rating}</Text>
          <Text style={styles.metaText}>{store.eta}</Text>
          {!isShipping && <Text style={styles.metaText}>Envío S/ {store.delivery.toFixed(2)}</Text>}
        </View>
      </View>

      <View style={[styles.architecture, { backgroundColor: tone(template.accent) }]}>
        <Text style={styles.architectureKicker}>{template.label.toUpperCase()}</Text>
        <Text style={styles.architectureTitle}>{template.catalogTitle}</Text>
        <Text style={styles.architectureCopy}>{template.catalogSubtitle}</Text>
      </View>

      <View style={styles.purity}><Ionicons name="checkmark-circle" size={18}/><Text style={styles.purityText}>{meta.purity}</Text></View>
      {!storeOpen && <View style={styles.closed}><Ionicons name="pause-circle" size={20}/><View style={{ flex: 1 }}><Text style={styles.closedTitle}>{adminMaintenance ? 'PLATAFORMA EN MANTENIMIENTO' : 'COMERCIO PAUSADO'}</Text><Text style={styles.closedCopy}>Puedes revisar el catálogo, pero no crear nuevas operaciones.</Text></View></View>}
      <View style={styles.minimum}>
        <Text style={styles.minLabel}>{isShipping ? 'TARIFA DESDE' : 'PEDIDO MÍNIMO'}</Text>
        <Text style={styles.minValue}>{isShipping ? `S/ ${startingPrice.toFixed(2)}` : `S/ ${store.minimum.toFixed(2)}`}</Text>
      </View>

      <Text style={styles.section}>{template.catalogTitle}</Text>
      <Text style={styles.sectionCopy}>{products.length} productos publicados · {template.groupLabel.toLowerCase()}</Text>

      {products.length === 0 && <View style={styles.empty}>
        <Ionicons name="cube-outline" size={31}/>
        <Text style={styles.emptyTitle}>CATÁLOGO EN PREPARACIÓN.</Text>
        <Text style={styles.emptyCopy}>El negocio todavía no publicó productos para clientes.</Text>
      </View>}

      {products.map((product) => {
        const available = storeOpen && isProductAvailable(store.id, product.id)
        const photo = getProductImage(store.id, product.id)
        const facts = productFacts(product, template.customerMode)
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
              <View style={styles.factRow}>
                {facts.filter(Boolean).map((fact) => <Text key={fact} style={styles.fact}>{String(fact).toUpperCase()}</Text>)}
              </View>
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
  hero: { minHeight: 230, padding: 16, borderBottomWidth: 2, borderColor: C.black },
  top: { zIndex: 4, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 22, backgroundColor: C.white },
  heroIdentity: { zIndex: 3, marginTop: 58, flexDirection: 'row', alignItems: 'center', gap: 13 },
  category: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  featured: { marginTop: 7, fontSize: 11, fontWeight: '900' },
  lightText: { color: C.white, textShadowColor: C.black, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  info: { padding: 16 },
  name: { fontSize: 31, lineHeight: 29, fontWeight: '900', letterSpacing: -1.3 },
  desc: { marginTop: 7, color: C.gray, fontSize: 10, fontWeight: '800' },
  description: { marginTop: 7, color: C.gray, fontSize: 9, lineHeight: 14 },
  meta: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: C.black, backgroundColor: C.mint, fontSize: 8, fontWeight: '900' },
  metaText: { fontSize: 8, fontWeight: '800' },
  architecture: { marginHorizontal: 16, padding: 15, borderWidth: 2, borderColor: C.black, ...shadow },
  architectureKicker: { fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  architectureTitle: { marginTop: 7, fontSize: 20, lineHeight: 19, fontWeight: '900' },
  architectureCopy: { marginTop: 6, fontSize: 8, lineHeight: 12 },
  purity: { minHeight: 52, margin: 16, marginBottom: 0, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  purityText: { flex: 1, fontSize: 8, fontWeight: '800', lineHeight: 12 },
  closed: { minHeight: 62, marginHorizontal: 16, marginTop: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.red },
  closedTitle: { color: C.white, fontSize: 9, fontWeight: '900' },
  closedCopy: { marginTop: 4, color: C.white, fontSize: 7, lineHeight: 10 },
  minimum: { margin: 16, marginBottom: 0, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  minLabel: { fontSize: 8, fontWeight: '900' },
  minValue: { fontSize: 15, fontWeight: '900' },
  section: { marginHorizontal: 16, marginTop: 27, fontSize: 22, lineHeight: 21, fontWeight: '900' },
  sectionCopy: { marginHorizontal: 16, marginTop: 5, marginBottom: 11, color: C.gray, fontSize: 8 },
  empty: { minHeight: 180, marginHorizontal: 16, padding: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  emptyTitle: { marginTop: 8, fontSize: 18, fontWeight: '900' },
  emptyCopy: { marginTop: 5, color: C.gray, fontSize: 8, textAlign: 'center' },
  product: { marginHorizontal: 16, marginBottom: 13, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, overflow: 'hidden' },
  productDisabled: { opacity: .62 },
  productArt: { height: 150, borderBottomWidth: 2, borderColor: C.black },
  popular: { position: 'absolute', left: 9, top: 9, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: C.black, backgroundColor: C.yellow, fontSize: 7, fontWeight: '900' },
  unavailable: { position: 'absolute', right: 9, top: 9, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: C.black, backgroundColor: C.red, color: C.white, fontSize: 7, fontWeight: '900' },
  productBody: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  group: { color: C.red, fontSize: 7, fontWeight: '900' },
  productName: { marginTop: 4, fontSize: 19, fontWeight: '900' },
  productDesc: { marginTop: 4, color: C.gray, fontSize: 9, lineHeight: 13 },
  factRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  fact: { paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: C.black, backgroundColor: C.paper, fontSize: 6, fontWeight: '900' },
  price: { marginTop: 10, fontSize: 16, fontWeight: '900' },
  addDisabled: { backgroundColor: C.line },
  add: { width: 44, height: 44, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', ...shadow },
  addText: { fontSize: 25, fontWeight: '900' },
  shippingNote: { marginHorizontal: 16, padding: 15, borderWidth: 2, borderColor: C.black, backgroundColor: C.black },
  shippingNoteTitle: { color: C.mint, fontSize: 10, fontWeight: '900' },
  shippingNoteCopy: { marginTop: 7, color: C.white, fontSize: 8, lineHeight: 13 },
})
