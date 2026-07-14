import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { categoryByKey, stores, templateForStore } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { useFeedback } from '@/components/FeedbackProvider'
import { CustomerBusinessLogo } from '@/components/CustomerBusinessMedia'
import { CustomerProductMedia } from '@/components/CustomerProductMedia'
import { Button } from '@/components/UI'
import { C, tone } from '@/theme'

const variantLabel = (label: string) => `VARIANTE · ${label}`

export default function Product() {
  const router = useRouter()
  const { showDialog } = useFeedback()
  const { id, storeId } = useLocalSearchParams<{ id: string; storeId: string }>()
  const {
    addToCart,
    isStoreOpen,
    isProductAvailable,
    getProductImage,
    getStoreProduct,
    getStorePublicProfile,
    adminMaintenance,
  } = useApp()
  const store = stores.find((item) => item.id === Number(storeId))
  const product = store ? getStoreProduct(store.id, Number(id)) : null
  const category = store ? categoryByKey(store.category) : null
  const template = store ? templateForStore(store) : null
  const publicProfile = store ? getStorePublicProfile(store.id) : null
  const options = product?.options ?? []
  const variants = product?.variants ?? []
  const availableVariants = variants.filter((variant) => variant.stock > 0)
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(availableVariants.length === 1 ? availableVariants[0].id : null)
  const [note, setNote] = useState('')
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null
  const optionPrice = selected.reduce((sum, label) => sum + (options.find((option) => option.label === label)?.price ?? 0), 0)
  const variantPrice = selectedVariant?.priceDelta ?? 0
  const total = useMemo(() => ((product?.price ?? 0) + optionPrice + variantPrice) * qty, [product?.price, optionPrice, variantPrice, qty])
  const available = Boolean(store && product && !adminMaintenance && isStoreOpen(store.id) && isProductAvailable(store.id, product.id) && (!variants.length || availableVariants.length))
  const toggle = (label: string) => setSelected((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label])

  const add = () => {
    if (!store || !product) {
      showDialog({ title: 'Producto no encontrado', message: 'Regresa al catálogo e inténtalo nuevamente.', tone: 'error' })
      return
    }
    if (variants.length && !selectedVariant) {
      showDialog({ title: 'Elige una variante', message: 'Selecciona talla, color, memoria o presentación antes de agregar.', tone: 'warning' })
      return
    }

    const variantOption = selectedVariant
      ? [{ label: variantLabel(selectedVariant.label), price: selectedVariant.priceDelta ?? 0 }]
      : []
    const cartProduct = {
      ...product,
      options: [...options, ...variantOption],
    }
    const cartExtras = selectedVariant
      ? [...selected, variantLabel(selectedVariant.label)]
      : selected
    const result = addToCart(store, cartProduct, qty, note, cartExtras)
    if (!result.ok) {
      showDialog({ title: 'No disponible', message: result.message, tone: 'warning' })
      return
    }
    showDialog({
      title: 'Producto agregado',
      message: result.message,
      tone: 'success',
      actions: [
        { label: 'Seguir comprando', tone: 'secondary', onPress: () => router.back() },
        { label: 'Ver carrito', tone: 'primary', onPress: () => router.replace('/cart') },
      ],
    })
  }

  if (!store || !product || !category || !template || !publicProfile) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.invalid}>
        <Text style={styles.invalidTitle}>PRODUCTO NO ENCONTRADO.</Text>
        <Text style={styles.invalidCopy}>La ruta no coincide con el catálogo publicado. Regresa y selecciona el producto otra vez.</Text>
        <Button label="VOLVER AL CATÁLOGO" onPress={() => router.back()} color="black"/>
      </View>
    </SafeAreaView>
  }

  const photo = getProductImage(store.id, product.id)
  const attributeEntries = Object.entries(product.attributes ?? {})

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Pressable accessibilityLabel="Cerrar producto" style={styles.close} onPress={() => router.back()}><Ionicons name="close" size={24}/></Pressable>
        <CustomerBusinessLogo profile={publicProfile} store={store} size={46}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{template.label.toUpperCase()} · {category.label.toUpperCase()}</Text>
          <Text numberOfLines={1} style={styles.store}>{publicProfile.name.toUpperCase()}</Text>
        </View>
      </View>

      <CustomerProductMedia uri={photo} symbol={product.symbol} style={[styles.art, { backgroundColor: tone(store.tone) }]}/>
      {photo && <View style={styles.realPhoto}><Ionicons name="camera" size={14}/><Text style={styles.realPhotoText}>FOTOGRAFÍA PUBLICADA POR EL NEGOCIO</Text></View>}
      {!available && <View style={styles.blocked}><Ionicons name="warning" size={19}/><Text style={styles.blockedText}>{adminMaintenance ? 'MANTENIMIENTO ACTIVO' : !isStoreOpen(store.id) ? 'COMERCIO PAUSADO' : variants.length && !availableVariants.length ? 'VARIANTES AGOTADAS' : 'PRODUCTO AGOTADO'}</Text></View>}

      <Text style={styles.group}>{product.group.toUpperCase()}</Text>
      <Text style={styles.title}>{product.name.toUpperCase()}</Text>
      <Text style={styles.desc}>{product.description}</Text>
      <Text style={styles.base}>DESDE S/ {product.price.toFixed(2)}</Text>

      <View style={[styles.templateCard, { backgroundColor: tone(template.accent) }]}>
        <Text style={styles.templateKicker}>{template.label.toUpperCase()}</Text>
        <Text style={styles.templateTitle}>{template.primaryField.toUpperCase()}</Text>
        <Text style={styles.templateCopy}>{template.catalogSubtitle}</Text>
      </View>

      {(product.brand || product.unit || product.presentation || attributeEntries.length > 0) && <>
        <Text style={styles.section}>DETALLES</Text>
        <View style={styles.details}>
          {product.brand && <View style={styles.detail}><Text style={styles.detailLabel}>MARCA</Text><Text style={styles.detailValue}>{product.brand}</Text></View>}
          {product.unit && <View style={styles.detail}><Text style={styles.detailLabel}>UNIDAD</Text><Text style={styles.detailValue}>{product.unit}</Text></View>}
          {product.presentation && <View style={styles.detail}><Text style={styles.detailLabel}>PRESENTACIÓN</Text><Text style={styles.detailValue}>{product.presentation}</Text></View>}
          {attributeEntries.map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.detailLabel}>{label.toUpperCase()}</Text><Text style={styles.detailValue}>{value}</Text></View>)}
        </View>
      </>}

      {variants.length > 0 && <>
        <Text style={styles.section}>{template.primaryField.toUpperCase()}</Text>
        <Text style={styles.help}>Selecciona una sola opción. Las variantes agotadas permanecen visibles para evitar confusión.</Text>
        {variants.map((variant) => {
          const selectedNow = selectedVariantId === variant.id
          const enabled = variant.stock > 0
          return <Pressable
            key={variant.id}
            disabled={!enabled}
            onPress={() => setSelectedVariantId(variant.id)}
            style={[styles.variant, selectedNow && styles.variantActive, !enabled && styles.variantDisabled]}
          >
            <View style={[styles.radio, selectedNow && styles.radioActive]}>{selectedNow && <View style={styles.radioDot}/>}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>{variant.label}</Text>
              <Text style={styles.variantStock}>{enabled ? `${variant.stock} disponibles` : 'AGOTADO'}</Text>
            </View>
            <Text style={styles.optionPrice}>{variant.priceDelta ? `+ S/ ${variant.priceDelta.toFixed(2)}` : 'INCLUIDO'}</Text>
          </Pressable>
        })}
      </>}

      {options.length > 0 && <>
        <Text style={styles.section}>{template.secondaryField.toUpperCase()}</Text>
        {options.map((option) => <Pressable key={option.label} onPress={() => toggle(option.label)} style={[styles.extra, selected.includes(option.label) && styles.extraActive]}>
          <View style={[styles.check, selected.includes(option.label) && styles.checkActive]}>{selected.includes(option.label) && <Ionicons name="checkmark" size={15} color={C.white}/>}</View>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionPrice}>{option.price > 0 ? `+ S/ ${option.price.toFixed(2)}` : 'SIN COSTO'}</Text>
        </Pressable>)}
      </>}

      {store.businessType === 'pharmacy' && <View style={styles.careNotice}><Ionicons name="information-circle-outline" size={20}/><Text style={styles.careText}>Información comercial. Para dudas de salud o productos sujetos a validación, consulta al profesional correspondiente.</Text></View>}

      <Text style={styles.section}>NOTA PARA EL NEGOCIO</Text>
      <TextInput multiline value={note} onChangeText={setNote} placeholder={product.notePlaceholder ?? 'Indicaciones para este producto'} placeholderTextColor={C.gray} style={styles.note}/>

      <View style={styles.bottom}>
        <View style={styles.qty}>
          <Pressable accessibilityLabel="Quitar una unidad" onPress={() => setQty(Math.max(1, qty - 1))}><Text style={styles.qtyBtn}>−</Text></Pressable>
          <Text style={styles.qtyValue}>{qty}</Text>
          <Pressable accessibilityLabel="Agregar una unidad" onPress={() => setQty(qty + 1)}><Text style={styles.qtyBtn}>+</Text></Pressable>
        </View>
        <View style={{ flex: 1 }}><Button label={available ? `AGREGAR · S/ ${total.toFixed(2)}` : 'NO DISPONIBLE'} onPress={add} disabled={!available}/></View>
      </View>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  invalid: { flex: 1, padding: 24, justifyContent: 'center' },
  invalidTitle: { fontSize: 38, lineHeight: 34, fontWeight: '900', letterSpacing: -2 },
  invalidCopy: { marginVertical: 15, color: C.gray, fontSize: 10, lineHeight: 16 },
  content: { padding: 18, paddingBottom: 25 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  close: { width: 44, height: 44, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  category: { color: C.red, fontSize: 7, fontWeight: '900', letterSpacing: .7 },
  store: { marginTop: 3, fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  art: { width: '100%', height: 240, marginTop: 18, borderWidth: 2, borderColor: C.black },
  realPhoto: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, backgroundColor: C.mint },
  realPhotoText: { fontSize: 7, fontWeight: '900' },
  blocked: { minHeight: 54, marginTop: 16, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.red },
  blockedText: { color: C.white, fontSize: 8, fontWeight: '900' },
  group: { marginTop: 19, color: C.red, fontSize: 8, fontWeight: '900' },
  title: { marginTop: 7, fontSize: 36, lineHeight: 33, fontWeight: '900', letterSpacing: -1.9 },
  desc: { marginTop: 9, color: C.gray, fontSize: 11, lineHeight: 17 },
  base: { marginTop: 11, fontSize: 15, fontWeight: '900' },
  templateCard: { marginTop: 18, padding: 13, borderWidth: 2, borderColor: C.black },
  templateKicker: { fontSize: 7, fontWeight: '900', letterSpacing: .8 },
  templateTitle: { marginTop: 7, fontSize: 18, fontWeight: '900' },
  templateCopy: { marginTop: 5, fontSize: 8, lineHeight: 12 },
  section: { marginTop: 24, marginBottom: 9, fontSize: 15, fontWeight: '900' },
  help: { marginTop: -4, marginBottom: 9, color: C.gray, fontSize: 8, lineHeight: 12 },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detail: { width: '48%', minHeight: 65, padding: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  detailLabel: { color: C.red, fontSize: 6, fontWeight: '900', letterSpacing: .6 },
  detailValue: { marginTop: 6, fontSize: 10, fontWeight: '900' },
  variant: { minHeight: 62, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, borderBottomWidth: 0, backgroundColor: C.white },
  variantActive: { backgroundColor: C.yellow },
  variantDisabled: { opacity: .5 },
  radio: { width: 24, height: 24, borderWidth: 2, borderColor: C.black, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  radioActive: { backgroundColor: C.black },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.white },
  variantStock: { marginTop: 3, color: C.gray, fontSize: 7, fontWeight: '800' },
  extra: { minHeight: 54, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, borderBottomWidth: 0, backgroundColor: C.white },
  extraActive: { backgroundColor: C.mint },
  check: { width: 24, height: 24, borderWidth: 2, borderColor: C.black, alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: C.black },
  optionLabel: { flex: 1, fontSize: 10, fontWeight: '800' },
  optionPrice: { fontSize: 8, fontWeight: '900' },
  careNotice: { minHeight: 70, marginTop: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: C.black, backgroundColor: C.blue },
  careText: { flex: 1, color: C.white, fontSize: 8, lineHeight: 12 },
  note: { minHeight: 75, padding: 11, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, textAlignVertical: 'top', fontSize: 11 },
  bottom: { marginTop: 20, flexDirection: 'row', gap: 10 },
  qty: { width: 118, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  qtyBtn: { fontSize: 23, fontWeight: '900' },
  qtyValue: { fontSize: 16, fontWeight: '900' },
})
