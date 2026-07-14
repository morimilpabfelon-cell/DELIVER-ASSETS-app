import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Button, Header, Kicker } from '@/components/UI'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { useFeedback } from '@/components/FeedbackProvider'
import { useApp } from '@/context/AppContext'
import { persistProfilePhoto, removeProfilePhoto } from '@/services/profilePhoto'
import { C, shadow } from '@/theme'
import { profileInitials } from '@/utils/profile'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Profile() {
  const router = useRouter()
  const { showDialog, showToast } = useFeedback()
  const { profile, updateProfile, persistenceStatus } = useApp()
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
    setPhone(profile.phone)
  }, [profile.email, profile.name, profile.phone])

  const normalized = useMemo(() => ({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
  }), [email, name, phone])

  const dirty = normalized.name !== profile.name
    || normalized.email !== profile.email.toLowerCase()
    || normalized.phone !== profile.phone

  const leaveNow = useCallback(() => router.back(), [router])
  const requestLeave = useCallback(() => {
    if (!dirty) {
      leaveNow()
      return
    }
    showDialog({
      title: 'Cambios sin guardar',
      message: 'Todavía modificaste datos del perfil. Puedes continuar editando o salir sin guardar esos cambios.',
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

  const applyAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setPhotoBusy(true)
      const photoUri = persistProfilePhoto(asset.uri, asset.mimeType, profile.photoUri)
      updateProfile({ ...profile, photoUri })
      showToast({
        title: 'Foto actualizada',
        message: 'La nueva imagen ya aparece en tu cuenta.',
        tone: 'success',
      })
    } catch {
      showToast({
        title: 'No se guardó la foto',
        message: 'Customer no pudo copiar esa imagen. Prueba con otra fotografía.',
        tone: 'error',
        duration: 4200,
      })
    } finally {
      setPhotoBusy(false)
    }
  }, [profile, showToast, updateProfile])

  useEffect(() => {
    let mounted = true
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!mounted || !pending || !('canceled' in pending) || pending.canceled || !pending.assets?.[0]) return
      void applyAsset(pending.assets[0])
    })
    return () => { mounted = false }
  }, [applyAsset])

  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showDialog({
        title: 'Acceso a tus fotos',
        message: 'Activa el permiso de Fotos en Android para elegir una imagen de perfil.',
        tone: 'warning',
      })
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: .58,
    })
    if (!result.canceled && result.assets[0]) await applyAsset(result.assets[0])
  }

  const pickFromGallery = () => showDialog({
    title: 'Acceso a tus fotos',
    message: 'DELIVER ASSETS abrirá la galería únicamente para seleccionar tu imagen de perfil.',
    tone: 'info',
    actions: [
      { label: 'Ahora no', tone: 'secondary' },
      { label: 'Continuar', tone: 'primary', onPress: () => void openGallery() },
    ],
  })

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      showDialog({
        title: 'Acceso a la cámara',
        message: 'Activa el permiso de Cámara en Android para tomar tu foto de perfil.',
        tone: 'warning',
      })
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: .58,
      cameraType: ImagePicker.CameraType.front,
    })
    if (!result.canceled && result.assets[0]) await applyAsset(result.assets[0])
  }

  const takePhoto = () => showDialog({
    title: 'Usar la cámara',
    message: 'DELIVER ASSETS abrirá la cámara para crear una nueva imagen de perfil.',
    tone: 'info',
    actions: [
      { label: 'Ahora no', tone: 'secondary' },
      { label: 'Continuar', tone: 'primary', onPress: () => void openCamera() },
    ],
  })

  const deletePhoto = () => {
    if (!profile.photoUri) return
    showDialog({
      title: '¿Eliminar foto?',
      message: 'La cuenta volverá a mostrar tus iniciales. Esta acción no modifica tu nombre ni otros datos.',
      tone: 'warning',
      actions: [
        { label: 'Cancelar', tone: 'secondary' },
        {
          label: 'Eliminar',
          tone: 'destructive',
          onPress: () => {
            removeProfilePhoto(profile.photoUri)
            updateProfile({ ...profile, photoUri: null })
            showToast({ title: 'Foto eliminada', message: 'Tu cuenta volvió a mostrar las iniciales.', tone: 'success' })
          },
        },
      ],
    })
  }

  const validate = (): string | null => {
    if (normalized.name.length < 2) return 'Escribe un nombre válido de al menos dos caracteres.'
    if (!emailPattern.test(normalized.email)) return 'Revisa el correo. Debe tener un formato como nombre@correo.com.'
    const digits = normalized.phone.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) return 'Revisa el teléfono. Debe contener entre 7 y 15 números.'
    return null
  }

  const save = () => {
    if (!dirty || saving) return
    const error = validate()
    if (error) {
      showToast({ title: 'Revisa tus datos', message: error, tone: 'error', duration: 4200 })
      return
    }
    setSaving(true)
    updateProfile({ ...profile, ...normalized })
    setTimeout(() => {
      setSaving(false)
      showDialog({
        title: 'Perfil actualizado',
        message: 'Tus datos quedaron guardados correctamente.',
        tone: 'success',
        actions: [
          { label: 'Seguir aquí', tone: 'secondary' },
          { label: 'Ver cuenta', tone: 'primary', onPress: () => router.replace('/(tabs)/account') },
        ],
      })
    }, 180)
  }

  const initials = profileInitials(name)
  const status = photoBusy
    ? 'PROCESANDO FOTO…'
    : saving || persistenceStatus === 'saving'
      ? 'GUARDANDO…'
      : dirty
        ? 'CAMBIOS PENDIENTES'
        : 'PERFIL ACTUALIZADO'

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="PERFIL" kicker="DATOS PERSONALES" onBack={requestLeave}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <ProfileAvatar photoUri={profile.photoUri} initials={initials} size={82}/>
          <View style={styles.cameraBadge}><Ionicons name="camera" size={16} color={C.white}/></View>
        </View>
        <View style={{ flex: 1 }}>
          <Kicker>CLIENTE · PERFIL PERSONAL</Kicker>
          <Text numberOfLines={2} style={styles.heroName}>{name.toUpperCase()}.</Text>
          <Text style={[styles.saved, dirty && { color: C.red }]}>{status}</Text>
        </View>
      </View>

      <Text style={styles.label}>FOTO DE PERFIL</Text>
      <View style={styles.photoActions}>
        <Pressable disabled={photoBusy} onPress={pickFromGallery} style={({ pressed }) => [styles.photoButton, pressed && { opacity: .7 }]}>
          <Ionicons name="images-outline" size={20}/><Text style={styles.photoButtonText}>{profile.photoUri ? 'CAMBIAR' : 'GALERÍA'}</Text>
        </Pressable>
        <Pressable disabled={photoBusy} onPress={takePhoto} style={({ pressed }) => [styles.photoButton, pressed && { opacity: .7 }]}>
          <Ionicons name="camera-outline" size={20}/><Text style={styles.photoButtonText}>CÁMARA</Text>
        </Pressable>
        <Pressable disabled={!profile.photoUri || photoBusy} onPress={deletePhoto} style={({ pressed }) => [styles.photoButton, !profile.photoUri && styles.photoDisabled, pressed && { opacity: .7 }]}>
          <Ionicons name="trash-outline" size={20}/><Text style={styles.photoButtonText}>QUITAR</Text>
        </Pressable>
      </View>
      <Text style={styles.photoNote}>Customer conserva una sola foto activa y elimina las copias anteriores para evitar archivos residuales.</Text>

      <Text style={styles.label}>NOMBRE COMPLETO</Text>
      <TextInput value={name} onChangeText={setName} autoComplete="name" returnKeyType="next" style={styles.input}/>
      <Text style={styles.label}>CORREO</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="next" style={styles.input}/>
      <Text style={styles.label}>TELÉFONO</Text>
      <TextInput value={phone} onChangeText={setPhone} autoComplete="tel" keyboardType="phone-pad" returnKeyType="done" style={styles.input}/>

      <View style={styles.verified}>
        <Text style={styles.verifiedMark}>✓</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.verifiedTitle}>IDENTIDAD DEMO VERIFICADA</Text>
          <Text style={styles.verifiedCopy}>Los datos se guardan en Customer. La verificación real se conectará al backend.</Text>
        </View>
      </View>
      <Button label={saving ? 'GUARDANDO…' : dirty ? 'GUARDAR CAMBIOS' : 'SIN CAMBIOS PENDIENTES'} onPress={save} color="black" disabled={!dirty || saving || photoBusy}/>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 35 },
  hero: { minHeight: 170, marginBottom: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow, ...shadow },
  avatarWrap: { position: 'relative' }, cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 15, backgroundColor: C.black },
  heroName: { marginTop: 7, fontSize: 27, lineHeight: 25, fontWeight: '900', letterSpacing: -1.5 }, saved: { marginTop: 7, fontSize: 7, fontWeight: '900' },
  label: { marginBottom: 6, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  photoActions: { marginBottom: 8, flexDirection: 'row', gap: 7 },
  photoButton: { flex: 1, minHeight: 61, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  photoDisabled: { opacity: .35 }, photoButtonText: { fontSize: 7, fontWeight: '900' },
  photoNote: { marginBottom: 18, color: C.gray, fontSize: 7, lineHeight: 11 },
  input: { minHeight: 51, marginBottom: 15, paddingHorizontal: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, fontSize: 11, fontWeight: '700' },
  verified: { minHeight: 77, marginBottom: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  verifiedMark: { width: 39, height: 39, paddingTop: 4, borderWidth: 2, borderColor: C.black, borderRadius: 20, backgroundColor: C.white, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  verifiedTitle: { fontSize: 9, fontWeight: '900' }, verifiedCopy: { marginTop: 4, fontSize: 8, lineHeight: 11 },
})
