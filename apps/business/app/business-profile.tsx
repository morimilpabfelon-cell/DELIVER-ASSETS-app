import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BusinessCover, BusinessLogo } from '@/components/BusinessMedia'
import { useFeedback } from '@/components/FeedbackProvider'
import { Button, Header, Kicker } from '@/components/UI'
import { stores } from '@/data/catalog'
import { BusinessMediaKind, persistBusinessMedia, removeBusinessMedia } from '@/services/businessMedia'
import { useApp } from '@/context/AppContext'
import { C, shadow } from '@/theme'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PENDING_BUSINESS_MEDIA_KEY = '@deliver-assets/business-pending-media-v1'

export default function BusinessProfile() {
  const router = useRouter()
  const { showDialog, showToast } = useFeedback()
  const {
    currentMerchantStoreId,
    currentBusinessProfile,
    updateBusinessProfile,
    persistenceStatus,
  } = useApp()
  const store = stores.find((item) => item.id === currentMerchantStoreId) ?? stores[0]
  const [email, setEmail] = useState(currentBusinessProfile.email)
  const [phone, setPhone] = useState(currentBusinessProfile.phone)
  const [address, setAddress] = useState(currentBusinessProfile.address)
  const [description, setDescription] = useState(currentBusinessProfile.description)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEmail(currentBusinessProfile.email)
    setPhone(currentBusinessProfile.phone)
    setAddress(currentBusinessProfile.address)
    setDescription(currentBusinessProfile.description)
  }, [currentBusinessProfile.address, currentBusinessProfile.description, currentBusinessProfile.email, currentBusinessProfile.phone])

  const normalized = useMemo(() => ({
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    address: address.trim(),
    description: description.trim(),
  }), [address, description, email, phone])

  const dirty = normalized.email !== currentBusinessProfile.email.toLowerCase()
    || normalized.phone !== currentBusinessProfile.phone
    || normalized.address !== currentBusinessProfile.address
    || normalized.description !== currentBusinessProfile.description

  const leaveNow = useCallback(() => router.back(), [router])
  const requestLeave = useCallback(() => {
    if (!dirty) return leaveNow()
    showDialog({
      title: 'Cambios sin guardar',
      message: 'Todavía modificaste datos del local. Puedes continuar editando o salir sin guardar.',
      tone: 'warning',
      actions: [
        { label: 'Seguir editando', tone: 'secondary' },
        { label: 'Salir sin guardar', tone: 'destructive', onPress: leaveNow },
      ],
    })
  }, [dirty, leaveNow, showDialog])

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) return false
      requestLeave()
      return true
    })
    return () => subscription.remove()
  }, [dirty, requestLeave]))

  const applyAsset = useCallback(async (kind: BusinessMediaKind, asset: ImagePicker.ImagePickerAsset) => {
    try {
      setMediaBusy(true)
      const previous = kind === 'logo' ? currentBusinessProfile.logoUri : currentBusinessProfile.coverUri
      const uri = persistBusinessMedia(asset.uri, currentMerchantStoreId, kind, asset.mimeType, previous)
      updateBusinessProfile(currentMerchantStoreId, kind === 'logo' ? { logoUri: uri } : { coverUri: uri })
      showToast({
        title: kind === 'logo' ? 'Logo actualizado' : 'Foto del local actualizada',
        message: kind === 'logo' ? 'La nueva identidad ya aparece en Business.' : 'La portada del local quedó guardada.',
        tone: 'success',
      })
    } catch {
      showToast({
        title: 'No se guardó la imagen',
        message: 'Business no pudo copiar esa fotografía. Prueba con otra imagen.',
        tone: 'error',
        duration: 4200,
      })
    } finally {
      setMediaBusy(false)
    }
  }, [currentBusinessProfile.coverUri, currentBusinessProfile.logoUri, currentMerchantStoreId, showToast, updateBusinessProfile])

  useEffect(() => {
    let mounted = true
    void Promise.all([
      ImagePicker.getPendingResultAsync(),
      AsyncStorage.getItem(PENDING_BUSINESS_MEDIA_KEY),
    ]).then(([pending, savedKind]) => {
      void AsyncStorage.removeItem(PENDING_BUSINESS_MEDIA_KEY)
      if (!mounted || !pending || !('canceled' in pending) || pending.canceled || !pending.assets?.[0]) return
      const kind: BusinessMediaKind = savedKind === 'cover' ? 'cover' : 'logo'
      void applyAsset(kind, pending.assets[0])
    })
    return () => { mounted = false }
  }, [applyAsset])

  const openGallery = async (kind: BusinessMediaKind) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showDialog({
        title: 'Acceso a tus fotos',
        message: 'Activa el permiso de Fotos en Android para elegir imágenes del negocio.',
        tone: 'warning',
      })
      return
    }
    await AsyncStorage.setItem(PENDING_BUSINESS_MEDIA_KEY, kind)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'logo' ? [1, 1] : [16, 9],
      quality: kind === 'logo' ? .62 : .55,
    })
    await AsyncStorage.removeItem(PENDING_BUSINESS_MEDIA_KEY)
    if (!result.canceled && result.assets[0]) await applyAsset(kind, result.assets[0])
  }

  const chooseGallery = (kind: BusinessMediaKind) => showDialog({
    title: kind === 'logo' ? 'Elegir logo' : 'Elegir foto del local',
    message: `DELIVER ASSETS Business abrirá la galería únicamente para seleccionar ${kind === 'logo' ? 'el logo comercial' : 'la portada del local'}.`,
    tone: 'info',
    actions: [
      { label: 'Ahora no', tone: 'secondary' },
      { label: 'Continuar', tone: 'primary', onPress: () => void openGallery(kind) },
    ],
  })

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      showDialog({
        title: 'Acceso a la cámara',
        message: 'Activa el permiso de Cámara en Android para fotografiar el local.',
        tone: 'warning',
      })
      return
    }
    await AsyncStorage.setItem(PENDING_BUSINESS_MEDIA_KEY, 'cover')
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: .55,
      cameraType: ImagePicker.CameraType.back,
    })
    await AsyncStorage.removeItem(PENDING_BUSINESS_MEDIA_KEY)
    if (!result.canceled && result.assets[0]) await applyAsset('cover', result.assets[0])
  }

  const takeStorePhoto = () => showDialog({
    title: 'Fotografiar el local',
    message: 'DELIVER ASSETS Business abrirá la cámara para crear la portada comercial.',
    tone: 'info',
    actions: [
      { label: 'Ahora no', tone: 'secondary' },
      { label: 'Continuar', tone: 'primary', onPress: () => void openCamera() },
    ],
  })

  const deleteMedia = (kind: BusinessMediaKind) => {
    const uri = kind === 'logo' ? currentBusinessProfile.logoUri : currentBusinessProfile.coverUri
    if (!uri) return
    showDialog({
      title: kind === 'logo' ? '¿Eliminar logo?' : '¿Eliminar foto del local?',
      message: kind === 'logo' ? 'Business volverá a mostrar las iniciales del negocio.' : 'Business volverá a mostrar la portada visual predeterminada.',
      tone: 'warning',
      actions: [
        { label: 'Cancelar', tone: 'secondary' },
        {
          label: 'Eliminar',
          tone: 'destructive',
          onPress: () => {
            removeBusinessMedia(uri)
            updateBusinessProfile(currentMerchantStoreId, kind === 'logo' ? { logoUri: null } : { coverUri: null })
            showToast({ title: 'Imagen eliminada', message: 'La identidad predeterminada quedó restaurada.', tone: 'success' })
          },
        },
      ],
    })
  }

  const validate = (): string | null => {
    if (!emailPattern.test(normalized.email)) return 'Revisa el correo comercial.'
    const digits = normalized.phone.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) return 'El teléfono debe contener entre 7 y 15 números.'
    if (normalized.address.length < 5) return 'Escribe una dirección comercial válida.'
    if (normalized.description.length < 8) return 'La descripción debe tener al menos ocho caracteres.'
    if (normalized.description.length > 180) return 'La descripción no puede superar 180 caracteres.'
    return null
  }

  const save = () => {
    if (!dirty || saving) return
    const error = validate()
    if (error) {
      showToast({ title: 'Revisa el perfil comercial', message: error, tone: 'error', duration: 4200 })
      return
    }
    setSaving(true)
    updateBusinessProfile(currentMerchantStoreId, normalized)
    setTimeout(() => {
      setSaving(false)
      showDialog({
        title: 'Perfil comercial actualizado',
        message: 'Los datos del negocio quedaron guardados en Business.',
        tone: 'success',
        actions: [
          { label: 'Seguir aquí', tone: 'secondary' },
          { label: 'Volver a la tienda', tone: 'primary', onPress: leaveNow },
        ],
      })
    }, 180)
  }

  const initials = store.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  const status = mediaBusy
    ? 'PROCESANDO IMAGEN…'
    : saving || persistenceStatus === 'saving'
      ? 'GUARDANDO…'
      : dirty
        ? 'CAMBIOS PENDIENTES'
        : 'PERFIL ACTUALIZADO'

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="PERFIL COMERCIAL" kicker={`${store.name.toUpperCase()} · BUSINESS`} onBack={requestLeave}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BusinessCover uri={currentBusinessProfile.coverUri} height={224}>
        <View style={styles.coverTop}>
          <BusinessLogo uri={currentBusinessProfile.logoUri} initials={initials} size={78}/>
          <Text style={styles.status}>{status}</Text>
        </View>
        <View style={styles.coverBottom}>
          <Kicker light>IDENTIDAD DEL COMERCIO</Kicker>
          <Text style={styles.storeName}>{store.name.toUpperCase()}</Text>
          <Text style={styles.category}>{store.category.toUpperCase()}</Text>
        </View>
      </BusinessCover>

      <Text style={styles.section}>LOGO DE LA EMPRESA</Text>
      <View style={styles.actionsRow}>
        <MediaButton icon="images-outline" label={currentBusinessProfile.logoUri ? 'CAMBIAR' : 'GALERÍA'} onPress={() => chooseGallery('logo')} disabled={mediaBusy}/>
        <MediaButton icon="trash-outline" label="QUITAR" onPress={() => deleteMedia('logo')} disabled={!currentBusinessProfile.logoUri || mediaBusy}/>
      </View>

      <Text style={styles.section}>FOTO DEL LOCAL</Text>
      <View style={styles.actionsRow}>
        <MediaButton icon="images-outline" label={currentBusinessProfile.coverUri ? 'CAMBIAR' : 'GALERÍA'} onPress={() => chooseGallery('cover')} disabled={mediaBusy}/>
        <MediaButton icon="camera-outline" label="CÁMARA" onPress={takeStorePhoto} disabled={mediaBusy}/>
        <MediaButton icon="trash-outline" label="QUITAR" onPress={() => deleteMedia('cover')} disabled={!currentBusinessProfile.coverUri || mediaBusy}/>
      </View>
      <Text style={styles.note}>Business conserva una imagen activa por tipo y por comercio. Las copias anteriores se limpian automáticamente.</Text>

      <Text style={styles.label}>NOMBRE COMERCIAL</Text>
      <View style={styles.locked}><Text style={styles.lockedText}>{store.name}</Text><Ionicons name="lock-closed" size={17}/></View>
      <Text style={styles.lockedCopy}>El nombre canónico permanece bloqueado para no romper pedidos, catálogo ni sincronización.</Text>

      <Text style={styles.label}>CORREO COMERCIAL</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input}/>
      <Text style={styles.label}>TELÉFONO</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input}/>
      <Text style={styles.label}>DIRECCIÓN DEL LOCAL</Text>
      <TextInput value={address} onChangeText={setAddress} style={styles.input}/>
      <Text style={styles.label}>DESCRIPCIÓN PÚBLICA</Text>
      <TextInput value={description} onChangeText={setDescription} multiline maxLength={180} style={[styles.input, styles.textArea]}/>
      <Text style={styles.counter}>{description.length}/180</Text>

      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={24}/>
        <View style={{ flex: 1 }}><Text style={styles.noticeTitle}>IMÁGENES LOCALES DEL PROTOTIPO</Text><Text style={styles.noticeCopy}>El logo y la foto viven dentro de Business. Un backend real deberá subirlos y convertirlos en URLs públicas para Cliente.</Text></View>
      </View>

      <Button label={saving ? 'GUARDANDO…' : dirty ? 'GUARDAR CAMBIOS' : 'SIN CAMBIOS PENDIENTES'} onPress={save} color="black" disabled={!dirty || saving || mediaBusy}/>
    </ScrollView>
  </SafeAreaView>
}

function MediaButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.mediaButton, disabled && styles.disabled, pressed && { opacity: .7 }]}>
    <Ionicons name={icon} size={20}/><Text style={styles.mediaButtonText}>{label}</Text>
  </Pressable>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 38 },
  coverTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  coverBottom: { marginTop: 'auto' },
  status: { maxWidth: 145, color: C.yellow, fontSize: 7, fontWeight: '900', textAlign: 'right' },
  storeName: { marginTop: 7, color: C.white, fontSize: 30, lineHeight: 28, fontWeight: '900', letterSpacing: -1.5 },
  category: { marginTop: 5, color: C.yellow, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  section: { marginTop: 23, marginBottom: 8, fontSize: 10, fontWeight: '900', letterSpacing: .7 },
  actionsRow: { flexDirection: 'row', gap: 7 },
  mediaButton: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  disabled: { opacity: .35 },
  mediaButtonText: { fontSize: 7, fontWeight: '900' },
  note: { marginTop: 8, marginBottom: 18, color: C.gray, fontSize: 7, lineHeight: 11 },
  label: { marginTop: 13, marginBottom: 6, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  input: { minHeight: 51, paddingHorizontal: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, fontSize: 11, fontWeight: '700' },
  textArea: { minHeight: 105, paddingTop: 12, textAlignVertical: 'top' },
  counter: { marginTop: 5, color: C.gray, fontSize: 7, fontWeight: '800', textAlign: 'right' },
  locked: { minHeight: 51, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  lockedText: { fontSize: 11, fontWeight: '900' },
  lockedCopy: { marginTop: 5, color: C.gray, fontSize: 7, lineHeight: 11 },
  notice: { minHeight: 86, marginVertical: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint, ...shadow },
  noticeTitle: { fontSize: 8, fontWeight: '900' },
  noticeCopy: { marginTop: 4, fontSize: 8, lineHeight: 12 },
})
