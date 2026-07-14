import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ProductPhoto } from '@/components/BusinessMedia'
import { useFeedback } from '@/components/FeedbackProvider'
import { Button, Header, Kicker } from '@/components/UI'
import { stores } from '@/data/catalog'
import type { BusinessProductMedia } from '@/data/businessProfile'
import { deleteProductImage, publishProductImage } from '@/services/backend'
import { persistProductMedia, removeBusinessMedia } from '@/services/businessMedia'
import { useApp } from '@/context/AppContext'
import { C, shadow } from '@/theme'

const PENDING_PRODUCT_MEDIA_KEY = '@deliver-assets/business-pending-product-media-v1'

function emptyMedia(productId: number): BusinessProductMedia {
  return { productId, localUri: null, publicUrl: null, status: 'empty', updatedAt: new Date(0).toISOString() }
}

export default function ProductEditor() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const productId = Number(id)
  const { showDialog, showToast } = useFeedback()
  const {
    currentMerchantStoreId,
    currentBusinessProfile,
    merchantStock,
    merchantProductImages,
    setMerchantProductAvailability,
    setMerchantProductImageUrl,
    updateBusinessProfile,
    hubConnected,
    syncNow,
  } = useApp()
  const store = stores.find((item) => item.id === currentMerchantStoreId) ?? stores[0]
  const product = store.products.find((item) => item.id === productId)
  const media = product ? currentBusinessProfile.productMedia[product.id] ?? emptyMedia(product.id) : null
  const available = product ? merchantStock[product.id] !== false : false
  const [busy, setBusy] = useState(false)

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
      showToast({ title: 'Foto guardada localmente', message: `${result.message} Puedes publicarla después con el Sync Hub activo.`, tone: 'warning', duration: 4500 })
      return false
    }
    setMerchantProductImageUrl(product.id, result.url)
    updateMedia({ ...(media ?? emptyMedia(product.id)), localUri, publicUrl: result.url, status: 'published', updatedAt: new Date().toISOString() })
    await syncNow()
    showToast({ title: 'Foto publicada', message: `${product.name} ya tiene una imagen disponible para el catálogo compartido.`, tone: 'success' })
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
    if (!permission.granted) {
      showDialog({ title: 'Acceso a tus fotos', message: 'Activa el permiso de Fotos en Android para elegir la imagen del producto.', tone: 'warning' })
      return
    }
    await AsyncStorage.setItem(PENDING_PRODUCT_MEDIA_KEY, `${currentMerchantStoreId}:${product.id}`)
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: .48 })
    await AsyncStorage.removeItem(PENDING_PRODUCT_MEDIA_KEY)
    if (!result.canceled && result.assets[0]) await applyAsset(result.assets[0])
  }

  const chooseGallery = () => showDialog({
    title: 'Elegir foto del producto',
    message: 'Usa una fotografía real, clara y actual del producto que recibirá el cliente.',
    tone: 'info',
    actions: [
      { label: 'Ahora no', tone: 'secondary' },
      { label: 'Abrir galería', tone: 'primary', onPress: () => void openGallery() },
    ],
  })

  const openCamera = async () => {
    if (!product) return
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      showDialog({ title: 'Acceso a la cámara', message: 'Activa el permiso de Cámara en Android para fotografiar el producto.', tone: 'warning' })
      return
    }
    await AsyncStorage.setItem(PENDING_PRODUCT_MEDIA_KEY, `${currentMerchantStoreId}:${product.id}`)
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: .48, cameraType: ImagePicker.CameraType.back })
    await AsyncStorage.removeItem(PENDING_PRODUCT_MEDIA_KEY)
    if (!result.canceled && result.assets[0]) await applyAsset(result.assets[0])
  }

  const chooseCamera = () => showDialog({
    title: 'Fotografiar producto',
    message: 'Coloca el plato o producto con buena iluminación y sin elementos que no formen parte de la compra.',
    tone: 'info',
    actions: [
      { label: 'Ahora no', tone: 'secondary' },
      { label: 'Abrir cámara', tone: 'primary', onPress: () => void openCamera() },
    ],
  })

  const removePhoto = () => {
    if (!product || (!media?.localUri && !merchantProductImages[product.id])) return
    showDialog({
      title: '¿Eliminar foto del producto?',
      message: 'Business volverá a mostrar el símbolo visual hasta que publiques otra fotografía.',
      tone: 'warning',
      actions: [
        { label: 'Cancelar', tone: 'secondary' },
        { label: 'Eliminar', tone: 'destructive', onPress: async () => {
          setBusy(true)
          const remote = await deleteProductImage(currentMerchantStoreId, product.id)
          removeBusinessMedia(media?.localUri)
          setMerchantProductImageUrl(product.id, null)
          updateMedia(emptyMedia(product.id))
          await syncNow()
          setBusy(false)
          showToast({
            title: 'Foto eliminada',
            message: remote.ok ? `${product.name} volvió al marcador predeterminado.` : `${product.name} dejó de mostrarse; el archivo remoto se limpiará al recuperar conexión.`,
            tone: remote.ok ? 'success' : 'warning',
          })
        } },
      ],
    })
  }

  const changeAvailability = () => {
    if (!product) return
    const result = setMerchantProductAvailability(product.id, !available)
    showToast({ title: !available ? 'Producto activado' : 'Producto agotado', message: result.message, tone: result.ok ? (!available ? 'success' : 'warning') : 'error' })
  }

  const status = useMemo(() => {
    if (!media) return 'SIN FOTO'
    if (busy || media.status === 'publishing') return 'PUBLICANDO…'
    if (media.status === 'published' || merchantProductImages[productId]) return 'PUBLICADA'
    if (media.localUri) return hubConnected ? 'PENDIENTE DE PUBLICAR' : 'GUARDADA EN EL TELÉFONO'
    return 'SIN FOTO'
  }, [busy, hubConnected, media, merchantProductImages, productId])

  if (!product) return <SafeAreaView style={styles.safe}><Header title="PRODUCTO" kicker="BUSINESS" onBack={() => router.back()}/><View style={styles.missing}><Text style={styles.missingTitle}>PRODUCTO NO ENCONTRADO</Text><Text style={styles.missingCopy}>La ruta no pertenece al catálogo del comercio activo.</Text><Button label="VOLVER AL CATÁLOGO" onPress={() => router.back()} color="black"/></View></SafeAreaView>

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="FICHA DEL PRODUCTO" kicker={`${store.name.toUpperCase()} · CATÁLOGO`} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <ProductPhoto uri={media?.localUri ?? merchantProductImages[product.id]} symbol={product.symbol} size={150}/>
        <View style={styles.heroCopy}>
          <Kicker light>{product.group.toUpperCase()}</Kicker>
          <Text style={styles.name}>{product.name.toUpperCase()}</Text>
          <Text style={styles.price}>S/ {product.price.toFixed(2)}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>

      <Text style={styles.section}>FOTOGRAFÍA COMERCIAL</Text>
      <View style={styles.actionGrid}>
        <MediaAction icon="images-outline" label={media?.localUri ? 'CAMBIAR' : 'GALERÍA'} onPress={chooseGallery} disabled={busy}/>
        <MediaAction icon="camera-outline" label="CÁMARA" onPress={chooseCamera} disabled={busy}/>
        <MediaAction icon="trash-outline" label="QUITAR" onPress={removePhoto} disabled={busy || (!media?.localUri && !merchantProductImages[product.id])}/>
      </View>
      {media?.localUri && media.status !== 'published' && <Button label="PUBLICAR AHORA" onPress={() => void publish(media.localUri!)} color="blue" disabled={busy || !hubConnected} icon="cloud-upload-outline"/>}

      <View style={styles.notice}>
        <Ionicons name="camera-outline" size={24}/>
        <View style={{ flex: 1 }}><Text style={styles.noticeTitle}>FOTO REAL DEL PRODUCTO</Text><Text style={styles.noticeCopy}>La imagen debe representar exactamente lo que recibe el cliente. Evita fotos engañosas, marcas ajenas o elementos que no están incluidos.</Text></View>
      </View>

      <Text style={styles.section}>DISPONIBILIDAD</Text>
      <Pressable onPress={changeAvailability} style={[styles.availability, available ? styles.available : styles.unavailable]}>
        <View><Text style={styles.availabilityTitle}>{available ? 'PRODUCTO ACTIVO' : 'PRODUCTO AGOTADO'}</Text><Text style={styles.availabilityCopy}>{available ? 'Cliente puede comprarlo.' : 'Cliente no debe poder añadirlo.'}</Text></View>
        <Text style={styles.availabilityAction}>{available ? 'DESACTIVAR' : 'ACTIVAR'}</Text>
      </Pressable>

      <Text style={styles.section}>INFORMACIÓN DEL CATÁLOGO</Text>
      <View style={styles.info}><Text style={styles.infoLabel}>NOMBRE</Text><Text style={styles.infoValue}>{product.name}</Text></View>
      <View style={styles.info}><Text style={styles.infoLabel}>DESCRIPCIÓN</Text><Text style={styles.infoValue}>{product.description}</Text></View>
      <View style={styles.info}><Text style={styles.infoLabel}>PRECIO</Text><Text style={styles.infoValue}>S/ {product.price.toFixed(2)}</Text></View>
      <View style={styles.info}><Text style={styles.infoLabel}>GRUPO</Text><Text style={styles.infoValue}>{product.group}</Text></View>
      <Text style={styles.locked}>Nombre, descripción y precio siguen bloqueados en esta fase para no alterar pedidos existentes. El próximo editor de catálogo utilizará versiones y auditoría de cambios.</Text>
    </ScrollView>
  </SafeAreaView>
}

function MediaAction({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.mediaAction, disabled && styles.disabled, pressed && { opacity: .7 }]}><Ionicons name={icon} size={21}/><Text style={styles.mediaActionText}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 42 },
  hero: { minHeight: 190, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 3, borderColor: C.black, backgroundColor: C.black, ...shadow },
  heroCopy: { flex: 1 },
  name: { marginTop: 8, color: C.white, fontSize: 25, lineHeight: 24, fontWeight: '900', letterSpacing: -1 },
  price: { marginTop: 9, color: C.yellow, fontSize: 19, fontWeight: '900' },
  status: { marginTop: 13, color: C.mint, fontSize: 7, fontWeight: '900', letterSpacing: .7 },
  section: { marginTop: 25, marginBottom: 9, fontSize: 11, fontWeight: '900', letterSpacing: .6 },
  actionGrid: { flexDirection: 'row', gap: 7, marginBottom: 9 },
  mediaAction: { flex: 1, minHeight: 65, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  mediaActionText: { fontSize: 7, fontWeight: '900' },
  disabled: { opacity: .35 },
  notice: { minHeight: 92, marginTop: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  noticeTitle: { fontSize: 8, fontWeight: '900' },
  noticeCopy: { marginTop: 4, fontSize: 8, lineHeight: 12 },
  availability: { minHeight: 78, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black },
  available: { backgroundColor: C.mint },
  unavailable: { backgroundColor: C.red },
  availabilityTitle: { fontSize: 11, fontWeight: '900' },
  availabilityCopy: { marginTop: 4, fontSize: 8 },
  availabilityAction: { fontSize: 8, fontWeight: '900', textDecorationLine: 'underline' },
  info: { minHeight: 60, padding: 11, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  infoLabel: { fontSize: 7, fontWeight: '900', color: C.gray },
  infoValue: { marginTop: 5, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  locked: { padding: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint, fontSize: 8, lineHeight: 12 },
  missing: { flex: 1, padding: 20, justifyContent: 'center' },
  missingTitle: { fontSize: 28, fontWeight: '900' },
  missingCopy: { marginVertical: 12, fontSize: 10, lineHeight: 16 },
})
