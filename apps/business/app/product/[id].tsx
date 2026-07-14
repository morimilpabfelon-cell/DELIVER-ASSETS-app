import type { ComponentProps } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ProductPhoto } from '@/components/BusinessMedia'
import { useFeedback } from '@/components/FeedbackProvider'
import { Button, Header, Kicker } from '@/components/UI'
import { businessTemplates, stores, type ProductStatus } from '@/data/catalog'
import type { BusinessProductMedia } from '@/data/businessProfile'
import { deleteProductImage, publishProductImage } from '@/services/backend'
import { persistProductMedia, removeBusinessMedia } from '@/services/businessMedia'
import { useApp } from '@/context/AppContext'
import { parseAttributes, parseVariants, productHints, serializeAttributes, serializeVariants } from '@/utils/productForm'
import { C, shadow, tone } from '@/theme'

const PENDING_PRODUCT_MEDIA_KEY = '@deliver-assets/business-pending-product-media-v1'

function emptyMedia(productId: number): BusinessProductMedia {
  return { productId, localUri: null, publicUrl: null, status: 'empty', updatedAt: new Date(0).toISOString() }
}

const statusLabels: Record<ProductStatus, string> = {
  draft: 'BORRADOR',
  published: 'PUBLICADO',
  paused: 'PAUSADO',
  out_of_stock: 'AGOTADO',
  archived: 'ARCHIVADO',
}

export default function ProductEditor() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const productId = Number(id)
  const { showDialog, showToast } = useFeedback()
  const {
    currentMerchantStoreId,
    currentBusinessProfile,
    currentMerchantProducts,
    currentMerchantPublicProfile,
    merchantStock,
    merchantProductImages,
    setMerchantProductAvailability,
    setMerchantProductImageUrl,
    updateMerchantProduct,
    setMerchantProductStatus,
    archiveMerchantProduct,
    updateBusinessProfile,
    hubConnected,
    syncNow,
  } = useApp()
  const store = stores.find((item) => item.id === currentMerchantStoreId) ?? stores[0]
  const template = businessTemplates[currentMerchantPublicProfile.businessType]
  const hints = productHints(currentMerchantPublicProfile.businessType)
  const product = currentMerchantProducts.find((item) => item.id === productId)
  const media = product ? currentBusinessProfile.productMedia[product.id] ?? emptyMedia(product.id) : null
  const available = product ? merchantStock[product.id] !== false && product.status === 'published' : false
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [symbol, setSymbol] = useState(product?.symbol ?? '')
  const [group, setGroup] = useState(product?.group ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [unit, setUnit] = useState(product?.unit ?? '')
  const [presentation, setPresentation] = useState(product?.presentation ?? '')
  const [tags, setTags] = useState(product?.tags?.join(', ') ?? '')
  const [attributes, setAttributes] = useState(serializeAttributes(product?.attributes))
  const [variants, setVariants] = useState(serializeVariants(product?.variants))

  useEffect(() => {
    if (!product) return
    setName(product.name); setDescription(product.description); setPrice(String(product.price)); setSymbol(product.symbol)
    setGroup(product.group); setBrand(product.brand ?? ''); setUnit(product.unit ?? ''); setPresentation(product.presentation ?? '')
    setTags(product.tags?.join(', ') ?? ''); setAttributes(serializeAttributes(product.attributes)); setVariants(serializeVariants(product.variants))
  }, [product])

  const dirty = useMemo(() => Boolean(product) && (
    name.trim() !== product!.name || description.trim() !== product!.description || Number(price) !== product!.price
    || symbol.trim().toUpperCase() !== product!.symbol || group.trim() !== product!.group || brand.trim() !== (product!.brand ?? '')
    || unit.trim() !== (product!.unit ?? '') || presentation.trim() !== (product!.presentation ?? '')
    || tags.trim() !== (product!.tags?.join(', ') ?? '') || attributes.trim() !== serializeAttributes(product!.attributes)
    || variants.trim() !== serializeVariants(product!.variants)
  ), [attributes, brand, description, group, name, presentation, price, product, symbol, tags, unit, variants])

  const updateMedia = useCallback((next: BusinessProductMedia) => {
    updateBusinessProfile(currentMerchantStoreId, {
      productMedia: { ...currentBusinessProfile.productMedia, [next.productId]: next },
    })
  }, [currentBusinessProfile.productMedia, currentMerchantStoreId, updateBusinessProfile])

  const publish = useCallback(async (localUri: string, mimeType = 'image/jpeg') => {
    if (!product) return false
    updateMedia({ ...(media ?? emptyMedia(product.id)), localUri, status: 'publishing', updatedAt: new Date().toISOString() })
    const result = await publishProductImage(currentMerchantStoreId, product.id, localUri, mimeType)
    if (!result.ok) {
      updateMedia({ ...(media ?? emptyMedia(product.id)), localUri, publicUrl: merchantProductImages[product.id] ?? media?.publicUrl ?? null, status: 'error', updatedAt: new Date().toISOString() })
      showToast({ title: 'Foto guardada localmente', message: `${result.message} Puedes publicarla después con Sync Hub activo.`, tone: 'warning', duration: 4500 })
      return false
    }
    setMerchantProductImageUrl(product.id, result.url)
    updateMedia({ ...(media ?? emptyMedia(product.id)), localUri, publicUrl: result.url, status: 'published', updatedAt: new Date().toISOString() })
    await syncNow()
    showToast({ title: 'Foto publicada', message: `${product.name} ya tiene una imagen disponible para Customer.`, tone: 'success' })
    return true
  }, [currentMerchantStoreId, media, merchantProductImages, product, setMerchantProductImageUrl, showToast, syncNow, updateMedia])

  const applyAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!product) return
    try {
      setBusy(true)
      const localUri = persistProductMedia(asset.uri, currentMerchantStoreId, product.id, asset.mimeType, media?.localUri)
      updateMedia({ ...(media ?? emptyMedia(product.id)), localUri, status: 'local', updatedAt: new Date().toISOString() })
      await publish(localUri, asset.mimeType ?? 'image/jpeg')
    } catch (error) {
      showToast({ title: 'No se guardó la fotografía', message: error instanceof Error ? error.message : 'Prueba con otra imagen.', tone: 'error', duration: 4300 })
    } finally {
      setBusy(false)
    }
  }, [currentMerchantStoreId, media, product, publish, showToast, updateMedia])

  useEffect(() => {
    let mounted = true
    void Promise.all([ImagePicker.getPendingResultAsync(), AsyncStorage.getItem(PENDING_PRODUCT_MEDIA_KEY)]).then(([pending, saved]) => {
      void AsyncStorage.removeItem(PENDING_PRODUCT_MEDIA_KEY)
      if (!mounted || !product || saved !== `${currentMerchantStoreId}:${product.id}` || !pending || !('canceled' in pending) || pending.canceled || !pending.assets?.[0]) return
      void applyAsset(pending.assets[0])
    })
    return () => { mounted = false }
  }, [applyAsset, currentMerchantStoreId, product])

  const openGallery = async () => {
    if (!product) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) { showDialog({ title: 'Acceso a tus fotos', message: 'Activa el permiso de Fotos para elegir la imagen del producto.', tone: 'warning' }); return }
    await AsyncStorage.setItem(PENDING_PRODUCT_MEDIA_KEY, `${currentMerchantStoreId}:${product.id}`)
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: .48 })
    await AsyncStorage.removeItem(PENDING_PRODUCT_MEDIA_KEY)
    if (!result.canceled && result.assets[0]) await applyAsset(result.assets[0])
  }

  const openCamera = async () => {
    if (!product) return
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) { showDialog({ title: 'Acceso a la cámara', message: 'Activa el permiso de Cámara para fotografiar el producto.', tone: 'warning' }); return }
    await AsyncStorage.setItem(PENDING_PRODUCT_MEDIA_KEY, `${currentMerchantStoreId}:${product.id}`)
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: .48, cameraType: ImagePicker.CameraType.back })
    await AsyncStorage.removeItem(PENDING_PRODUCT_MEDIA_KEY)
    if (!result.canceled && result.assets[0]) await applyAsset(result.assets[0])
  }

  const removePhoto = () => {
    if (!product || (!media?.localUri && !merchantProductImages[product.id])) return
    showDialog({ title: '¿Eliminar foto del producto?', message: 'Customer volverá a mostrar el símbolo visual.', tone: 'warning', actions: [
      { label: 'Cancelar', tone: 'secondary' },
      { label: 'Eliminar', tone: 'destructive', onPress: () => void (async () => {
        setBusy(true)
        const remote = await deleteProductImage(currentMerchantStoreId, product.id)
        removeBusinessMedia(media?.localUri)
        setMerchantProductImageUrl(product.id, null)
        updateMedia(emptyMedia(product.id))
        await syncNow(); setBusy(false)
        showToast({ title: 'Foto eliminada', message: remote.ok ? `${product.name} volvió al marcador predeterminado.` : 'Se retiró del catálogo; el archivo remoto se limpiará después.', tone: remote.ok ? 'success' : 'warning' })
      })() },
    ] })
  }

  const saveFields = async () => {
    if (!product || saving || !dirty) return
    setSaving(true)
    const result = updateMerchantProduct(product.id, {
      name, description, price: Number(price), symbol, group, brand, unit, presentation,
      tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      attributes: parseAttributes(attributes), variants: parseVariants(variants),
    })
    if (result.ok) await syncNow()
    setSaving(false)
    showToast({ title: result.ok ? 'Producto actualizado' : 'No se guardaron los cambios', message: result.message, tone: result.ok ? 'success' : 'error' })
  }

  const changeAvailability = () => {
    if (!product) return
    const result = setMerchantProductAvailability(product.id, !available)
    showToast({ title: !available ? 'Producto activado' : 'Producto agotado', message: result.message, tone: result.ok ? (!available ? 'success' : 'warning') : 'error' })
  }

  const changeStatus = (status: ProductStatus) => {
    if (!product) return
    const result = setMerchantProductStatus(product.id, status)
    showToast({ title: statusLabels[status], message: result.message, tone: result.ok ? 'success' : 'error' })
    if (result.ok) void syncNow()
  }

  const archive = () => {
    if (!product) return
    showDialog({ title: '¿Archivar producto?', message: 'Desaparecerá para nuevos clientes, pero seguirá en pedidos y boletas anteriores.', tone: 'warning', actions: [
      { label: 'Cancelar', tone: 'secondary' },
      { label: 'Archivar', tone: 'destructive', onPress: () => { const result = archiveMerchantProduct(product.id); showToast({ title: 'Producto archivado', message: result.message, tone: result.ok ? 'success' : 'error' }); if (result.ok) { void syncNow(); router.back() } } },
    ] })
  }

  const mediaStatus = useMemo(() => {
    if (!media) return 'SIN FOTO'
    if (busy || media.status === 'publishing') return 'PUBLICANDO…'
    if (media.status === 'published' || merchantProductImages[productId]) return 'PUBLICADA'
    if (media.localUri) return hubConnected ? 'PENDIENTE DE PUBLICAR' : 'GUARDADA EN EL TELÉFONO'
    return 'SIN FOTO'
  }, [busy, hubConnected, media, merchantProductImages, productId])

  if (!product) return <SafeAreaView style={styles.safe}><Header title="PRODUCTO" kicker="BUSINESS" onBack={() => router.back()}/><View style={styles.missing}><Text style={styles.missingTitle}>PRODUCTO NO ENCONTRADO</Text><Text style={styles.missingCopy}>La ruta no pertenece al catálogo del comercio activo.</Text><Button label="VOLVER AL CATÁLOGO" onPress={() => router.back()} color="black"/></View></SafeAreaView>

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="FICHA DEL PRODUCTO" kicker={`${store.name.toUpperCase()} · ${template.label.toUpperCase()}`} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <ProductPhoto uri={media?.localUri ?? merchantProductImages[product.id]} symbol={product.symbol} size={142}/>
        <View style={styles.heroCopy}><Kicker light>{product.group.toUpperCase()}</Kicker><Text style={styles.name}>{product.name.toUpperCase()}</Text><Text style={styles.price}>S/ {product.price.toFixed(2)}</Text><Text style={styles.status}>{statusLabels[product.status]} · {mediaStatus}</Text></View>
      </View>

      <Text style={styles.section}>FOTOGRAFÍA COMERCIAL</Text>
      <View style={styles.actionGrid}>
        <MediaAction icon="images-outline" label={media?.localUri ? 'CAMBIAR' : 'GALERÍA'} onPress={() => showDialog({ title: 'Elegir foto', message: 'Usa una fotografía real y actual.', tone: 'info', actions: [{ label: 'Ahora no', tone: 'secondary' }, { label: 'Galería', tone: 'primary', onPress: () => void openGallery() }] })} disabled={busy}/>
        <MediaAction icon="camera-outline" label="CÁMARA" onPress={() => showDialog({ title: 'Fotografiar producto', message: 'Usa buena iluminación y muestra solo lo incluido.', tone: 'info', actions: [{ label: 'Ahora no', tone: 'secondary' }, { label: 'Cámara', tone: 'primary', onPress: () => void openCamera() }] })} disabled={busy}/>
        <MediaAction icon="trash-outline" label="QUITAR" onPress={removePhoto} disabled={busy || (!media?.localUri && !merchantProductImages[product.id])}/>
      </View>
      {media?.localUri && media.status !== 'published' && <Button label="PUBLICAR AHORA" onPress={() => void publish(media.localUri!)} color="blue" disabled={busy || !hubConnected} icon="cloud-upload-outline"/>}

      <Text style={styles.section}>ESTADO COMERCIAL</Text>
      <Pressable onPress={changeAvailability} style={[styles.availability, available ? styles.available : styles.unavailable]}><View><Text style={styles.availabilityTitle}>{available ? 'PRODUCTO ACTIVO' : 'PRODUCTO NO DISPONIBLE'}</Text><Text style={styles.availabilityCopy}>{available ? 'Customer puede comprarlo.' : statusLabels[product.status]}</Text></View><Text style={styles.availabilityAction}>{available ? 'AGOTAR' : 'ACTIVAR'}</Text></Pressable>
      <View style={styles.statusRow}><SmallAction label="BORRADOR" onPress={() => changeStatus('draft')}/><SmallAction label="PAUSAR" onPress={() => changeStatus('paused')}/><SmallAction label="PUBLICAR" onPress={() => changeStatus('published')}/></View>

      <Text style={styles.section}>INFORMACIÓN EDITABLE</Text>
      <Field label="NOMBRE" value={name} onChangeText={setName}/>
      <Field label="DESCRIPCIÓN" value={description} onChangeText={setDescription} multiline/>
      <View style={styles.twoCols}><View style={styles.col}><Field label="PRECIO" value={price} onChangeText={setPrice} keyboardType="decimal-pad"/></View><View style={styles.col}><Field label="SÍMBOLO" value={symbol} onChangeText={setSymbol} maxLength={5}/></View></View>
      <Field label={template.groupLabel} value={group} onChangeText={setGroup} placeholder={hints.group}/>
      <Field label="MARCA" value={brand} onChangeText={setBrand}/>
      <View style={styles.twoCols}><View style={styles.col}><Field label="UNIDAD / PESO" value={unit} onChangeText={setUnit}/></View><View style={styles.col}><Field label="PRESENTACIÓN" value={presentation} onChangeText={setPresentation}/></View></View>
      <Field label="ETIQUETAS" value={tags} onChangeText={setTags}/>
      <Field label="ATRIBUTOS" value={attributes} onChangeText={setAttributes} placeholder={`${hints.primary}\nEj. garantía: 12 meses`} multiline/>
      <Field label="VARIANTES" value={variants} onChangeText={setVariants} placeholder={`${hints.variants}\nFormato: nombre | stock | adicional`} multiline/>
      <Button label={saving ? 'GUARDANDO…' : dirty ? 'GUARDAR CAMBIOS' : 'SIN CAMBIOS'} onPress={() => void saveFields()} color="black" disabled={!dirty || saving}/>
      <Button label="ARCHIVAR PRODUCTO" onPress={archive} color="red" disabled={product.status === 'archived'}/>

      <View style={[styles.notice, { backgroundColor: tone(template.accent) }]}><Ionicons name="git-compare-outline" size={24}/><Text style={styles.noticeCopy}>Los cambios se publican por storeId y productId. Archivar no borra el historial ni altera pedidos anteriores.</Text></View>
    </ScrollView>
  </SafeAreaView>
}

function Field({ label, multiline, ...props }: ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.textArea]} textAlignVertical={multiline ? 'top' : 'center'}/></View> }
function MediaAction({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.mediaAction, disabled && styles.disabled, pressed && { opacity: .7 }]}><Ionicons name={icon} size={21}/><Text style={styles.mediaActionText}>{label}</Text></Pressable> }
function SmallAction({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.smallAction}><Text style={styles.smallActionText}>{label}</Text></Pressable> }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 42 },
  hero: { minHeight: 180, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 3, borderColor: C.black, backgroundColor: C.black, ...shadow }, heroCopy: { flex: 1 },
  name: { marginTop: 8, color: C.white, fontSize: 23, lineHeight: 22, fontWeight: '900', letterSpacing: -1 }, price: { marginTop: 9, color: C.yellow, fontSize: 18, fontWeight: '900' }, status: { marginTop: 11, color: C.mint, fontSize: 7, fontWeight: '900' },
  section: { marginTop: 25, marginBottom: 9, fontSize: 11, fontWeight: '900', letterSpacing: .6 }, actionGrid: { flexDirection: 'row', gap: 7, marginBottom: 9 },
  mediaAction: { flex: 1, minHeight: 65, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, mediaActionText: { fontSize: 7, fontWeight: '900' }, disabled: { opacity: .35 },
  availability: { minHeight: 78, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black }, available: { backgroundColor: C.mint }, unavailable: { backgroundColor: C.red }, availabilityTitle: { fontSize: 11, fontWeight: '900' }, availabilityCopy: { marginTop: 4, fontSize: 8 }, availabilityAction: { fontSize: 8, fontWeight: '900', textDecorationLine: 'underline' },
  statusRow: { marginTop: 8, flexDirection: 'row', gap: 6 }, smallAction: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, smallActionText: { fontSize: 7, fontWeight: '900' },
  field: { marginTop: 13 }, label: { marginBottom: 6, fontSize: 7, fontWeight: '900', letterSpacing: .7 }, input: { minHeight: 50, paddingHorizontal: 11, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, fontSize: 10, fontWeight: '700' }, textArea: { minHeight: 100, paddingTop: 11 }, twoCols: { flexDirection: 'row', gap: 8 }, col: { flex: 1 },
  notice: { minHeight: 82, marginTop: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black }, noticeCopy: { flex: 1, fontSize: 8, lineHeight: 12 },
  missing: { flex: 1, padding: 20, justifyContent: 'center' }, missingTitle: { fontSize: 28, fontWeight: '900' }, missingCopy: { marginVertical: 12, fontSize: 10, lineHeight: 16 },
})
