import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Alert, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { C, shadow } from '@/theme'

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info'
export type FeedbackActionTone = 'primary' | 'secondary' | 'destructive'

export type FeedbackAction = {
  label: string
  tone?: FeedbackActionTone
  onPress?: () => void | Promise<void>
}

export type DialogRequest = {
  title: string
  message: string
  tone?: FeedbackTone
  actions?: FeedbackAction[]
  dismissible?: boolean
}

export type ToastRequest = {
  title: string
  message?: string
  tone?: FeedbackTone
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export type BannerRequest = {
  title: string
  message: string
  tone?: FeedbackTone
  duration?: number
}

type FeedbackContextValue = {
  showToast: (request: ToastRequest) => void
  showDialog: (request: DialogRequest) => void
  showBanner: (request: BannerRequest) => void
  dismissToast: () => void
  dismissDialog: () => void
  dismissBanner: () => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

const toneMeta: Record<FeedbackTone, { background: string; foreground: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { background: C.mint, foreground: C.black, icon: 'checkmark-circle' },
  error: { background: C.red, foreground: C.white, icon: 'close-circle' },
  warning: { background: C.yellow, foreground: C.black, icon: 'warning' },
  info: { background: C.blue, foreground: C.white, icon: 'information-circle' },
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastRequest | null>(null)
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const [banner, setBanner] = useState<BannerRequest | null>(null)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const toastOffset = useRef(new Animated.Value(-18)).current
  const bannerOpacity = useRef(new Animated.Value(0)).current
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearToastTimer = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = null
  }, [])

  const clearBannerTimer = useCallback(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current)
    bannerTimer.current = null
  }, [])

  const dismissToast = useCallback(() => {
    clearToastTimer()
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(toastOffset, { toValue: -12, duration: 150, useNativeDriver: true }),
    ]).start(() => setToast(null))
  }, [clearToastTimer, toastOffset, toastOpacity])

  const dismissBanner = useCallback(() => {
    clearBannerTimer()
    Animated.timing(bannerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setBanner(null))
  }, [bannerOpacity, clearBannerTimer])

  const dismissDialog = useCallback(() => setDialog(null), [])

  const showToast = useCallback((request: ToastRequest) => {
    clearToastTimer()
    setToast(request)
    toastOpacity.setValue(0)
    toastOffset.setValue(-18)
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(toastOpacity, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 180 }),
        Animated.spring(toastOffset, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }),
      ]).start()
    })
    const spoken = request.message ? `${request.title}. ${request.message}` : request.title
    void AccessibilityInfo.announceForAccessibility(spoken)
    toastTimer.current = setTimeout(dismissToast, request.duration ?? 2800)
  }, [clearToastTimer, dismissToast, toastOffset, toastOpacity])

  const showDialog = useCallback((request: DialogRequest) => {
    setDialog(request)
    void AccessibilityInfo.announceForAccessibility(`${request.title}. ${request.message}`)
  }, [])

  const showBanner = useCallback((request: BannerRequest) => {
    clearBannerTimer()
    setBanner(request)
    bannerOpacity.setValue(0)
    requestAnimationFrame(() => {
      Animated.timing(bannerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    })
    void AccessibilityInfo.announceForAccessibility(`${request.title}. ${request.message}`)
    if ((request.duration ?? 0) > 0) bannerTimer.current = setTimeout(dismissBanner, request.duration)
  }, [bannerOpacity, clearBannerTimer, dismissBanner])

  useEffect(() => {
    const nativeAlert = Alert.alert
    Alert.alert = (title, message, buttons, options) => {
      const actions: FeedbackAction[] = (buttons?.length ? buttons : [{ text: 'Entendido' }]).map((button, index, source) => ({
        label: button.text ?? 'Entendido',
        tone: button.style === 'destructive'
          ? 'destructive'
          : button.style === 'cancel'
            ? 'secondary'
            : index === source.length - 1
              ? 'primary'
              : 'secondary',
        onPress: button.onPress,
      }))
      showDialog({
        title,
        message: message ?? '',
        actions,
        dismissible: options?.cancelable !== false,
        tone: actions.some((action) => action.tone === 'destructive') ? 'warning' : 'info',
      })
    }
    return () => { Alert.alert = nativeAlert }
  }, [showDialog])

  useEffect(() => () => {
    clearToastTimer()
    clearBannerTimer()
  }, [clearBannerTimer, clearToastTimer])

  const value = useMemo<FeedbackContextValue>(() => ({
    showToast,
    showDialog,
    showBanner,
    dismissToast,
    dismissDialog,
    dismissBanner,
  }), [dismissBanner, dismissDialog, dismissToast, showBanner, showDialog, showToast])

  const toastTone = toneMeta[toast?.tone ?? 'success']
  const bannerTone = toneMeta[banner?.tone ?? 'info']
  const dialogTone = toneMeta[dialog?.tone ?? 'info']
  const dialogActions = dialog?.actions?.length ? dialog.actions : [{ label: 'ENTENDIDO', tone: 'primary' as const }]

  return <FeedbackContext.Provider value={value}>
    {children}

    {banner && <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.bannerLayer}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[styles.banner, { backgroundColor: bannerTone.background, opacity: bannerOpacity }]}
      >
        <Ionicons name={bannerTone.icon} size={22} color={bannerTone.foreground}/>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: bannerTone.foreground }]}>{banner.title.toUpperCase()}</Text>
          <Text style={[styles.bannerMessage, { color: bannerTone.foreground }]}>{banner.message}</Text>
        </View>
        <Pressable accessibilityLabel="Cerrar aviso" onPress={dismissBanner} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={bannerTone.foreground}/>
        </Pressable>
      </Animated.View>
    </SafeAreaView>}

    {toast && <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.toastLayer}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          {
            backgroundColor: toastTone.background,
            opacity: toastOpacity,
            transform: [{ translateY: toastOffset }],
          },
        ]}
      >
        <View style={[styles.toastIcon, { backgroundColor: C.white }]}>
          <Ionicons name={toastTone.icon} size={22} color={C.black}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toastTitle, { color: toastTone.foreground }]}>{toast.title.toUpperCase()}</Text>
          {toast.message ? <Text style={[styles.toastMessage, { color: toastTone.foreground }]}>{toast.message}</Text> : null}
        </View>
        {toast.actionLabel && <Pressable onPress={() => { dismissToast(); toast.onAction?.() }} style={styles.toastAction}>
          <Text style={[styles.toastActionText, { color: toastTone.foreground }]}>{toast.actionLabel.toUpperCase()}</Text>
        </Pressable>}
      </Animated.View>
    </SafeAreaView>}

    <Modal
      visible={Boolean(dialog)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (dialog?.dismissible !== false) dismissDialog()
      }}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="Cerrar mensaje"
          disabled={dialog?.dismissible === false}
          onPress={dismissDialog}
          style={StyleSheet.absoluteFill}
        />
        {dialog && <View accessibilityViewIsModal style={styles.dialog}>
          <View style={[styles.dialogTop, { backgroundColor: dialogTone.background }]}>
            <View style={styles.dialogIcon}><Ionicons name={dialogTone.icon} size={26} color={C.black}/></View>
            <Text style={[styles.dialogKicker, { color: dialogTone.foreground }]}>DELIVER ASSETS</Text>
          </View>
          <View style={styles.dialogBody}>
            <Text style={styles.dialogTitle}>{dialog.title.toUpperCase()}</Text>
            <Text style={styles.dialogMessage}>{dialog.message}</Text>
            <View style={styles.dialogActions}>
              {dialogActions.map((action, index) => {
                const tone = action.tone ?? (index === dialogActions.length - 1 ? 'primary' : 'secondary')
                const backgroundColor = tone === 'destructive' ? C.red : tone === 'primary' ? C.black : C.white
                const color = tone === 'secondary' ? C.black : C.white
                return <Pressable
                  key={`${action.label}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    dismissDialog()
                    requestAnimationFrame(() => { void action.onPress?.() })
                  }}
                  style={({ pressed }) => [styles.dialogButton, { backgroundColor, opacity: pressed ? .72 : 1 }]}
                >
                  <Text style={[styles.dialogButtonText, { color }]}>{action.label.toUpperCase()}</Text>
                </Pressable>
              })}
            </View>
          </View>
        </View>}
      </View>
    </Modal>
  </FeedbackContext.Provider>
}

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider')
  return value
}

const styles = StyleSheet.create({
  bannerLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 90, paddingHorizontal: 12 },
  banner: { minHeight: 68, marginTop: 8, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, ...shadow },
  bannerTitle: { fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  bannerMessage: { marginTop: 3, fontSize: 8, lineHeight: 11 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  toastLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 12 },
  toast: { minHeight: 78, marginTop: 8, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, ...shadow },
  toastIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black },
  toastTitle: { fontSize: 10, fontWeight: '900', letterSpacing: .7 },
  toastMessage: { marginTop: 4, fontSize: 8, lineHeight: 11 },
  toastAction: { minHeight: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: C.black },
  toastActionText: { fontSize: 8, fontWeight: '900' },
  modalBackdrop: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.68)' },
  dialog: { width: '100%', maxWidth: 460, borderWidth: 3, borderColor: C.black, backgroundColor: C.white, ...shadow },
  dialogTop: { minHeight: 76, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 3, borderColor: C.black },
  dialogIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 22, backgroundColor: C.white },
  dialogKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  dialogBody: { padding: 16 },
  dialogTitle: { fontSize: 26, lineHeight: 24, fontWeight: '900', letterSpacing: -1.1 },
  dialogMessage: { marginTop: 10, color: C.gray, fontSize: 10, lineHeight: 15 },
  dialogActions: { marginTop: 18, gap: 8 },
  dialogButton: { minHeight: 50, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black },
  dialogButtonText: { fontSize: 9, fontWeight: '900', letterSpacing: .8 },
})
