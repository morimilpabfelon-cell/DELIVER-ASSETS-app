import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Button, Header, Kicker, Metric } from '@/components/UI'
import { useApp } from '@/context/AppContext'
import { getStoredBytes } from '@/services/persistence'
import { C, shadow } from '@/theme'

function formatSaved(value: string | null) {
  if (!value) return 'AÚN NO GUARDADO'
  return new Date(value).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()
}

export default function DataCenter() {
  const router = useRouter()
  const {
    persistenceStatus, syncStatus, syncMessage, lastSavedAt, hubRevision, hubConnected, lastHubSyncAt, backendMode, backendConfigured,
    saveNow, syncNow, resetDemoData, addresses, payments, favorites, history, notices, supportMessages, merchantOrders, riderHistory,
  } = useApp()
  const [bytes, setBytes] = useState(0)

  useEffect(() => {
    void getStoredBytes().then(setBytes).catch(() => setBytes(0))
  }, [lastSavedAt, persistenceStatus])

  const runSave = async () => {
    const ok = await saveNow()
    Alert.alert(ok ? 'Guardado completado' : 'Error de guardado', ok ? 'El estado actual quedó almacenado en el dispositivo.' : 'No fue posible guardar los datos locales.')
  }
  const runSync = async () => {
    const ok = await syncNow()
    const message = ok
      ? backendMode === 'local' ? 'El estado local fue verificado y permanece disponible en este dispositivo.' : 'El servidor confirmó la sincronización del estado actual.'
      : backendConfigured ? 'No se pudo completar la sincronización. Revisa la conexión e inténtalo nuevamente.' : 'Falta configurar la dirección del backend.'
    Alert.alert(ok ? 'Sincronización completada' : 'Sincronización pendiente', message)
  }
  const reset = () => Alert.alert('Restaurar datos demo', 'Se borrarán cambios, carrito, sesión, direcciones agregadas e historial nuevo.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Restaurar', style: 'destructive', onPress: () => void resetDemoData().then(() => router.replace('/onboarding')) },
  ])

  const stateColor = persistenceStatus === 'error' || syncStatus === 'error' ? C.red : persistenceStatus === 'saving' || syncStatus === 'pending' ? C.yellow : C.mint
  const sizeLabel = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}><Header title="DATOS Y SINCRONIZACIÓN" kicker="COORDINATION HUB · CONTROL V2.3" onBack={() => router.back()}/><ScrollView contentContainerStyle={styles.content}>
    <View style={[styles.status, { backgroundColor: stateColor }]}><View style={styles.statusIcon}><Ionicons name={syncStatus === 'error' ? 'warning' : 'cloud-done-outline'} size={26}/></View><View style={{ flex: 1 }}><Kicker>{backendMode === 'local' ? 'MODO LOCAL PERSISTENTE' : 'BACKEND REMOTO'}</Kicker><Text style={styles.statusTitle}>{persistenceStatus === 'saving' ? 'GUARDANDO CAMBIOS…' : syncStatus === 'pending' ? 'SINCRONIZACIÓN PENDIENTE' : syncStatus === 'error' ? 'REQUIERE ATENCIÓN' : 'DATOS PROTEGIDOS DEL CIERRE'}</Text><Text style={styles.statusCopy}>{syncMessage}</Text></View></View>

    <View style={styles.metrics}><Metric label="ÚLTIMO GUARDADO" value={formatSaved(lastSavedAt)} detail="Hora local del dispositivo" color="white"/><Metric label="REVISIÓN GLOBAL" value={String(hubRevision)} detail={hubConnected ? "Sync Hub conectado" : "Sync Hub sin conexión"} color={hubConnected ? "mint" : "red"}/><Metric label="ÚLTIMO HUB" value={formatSaved(lastHubSyncAt)} detail="Recepción o envío global" color="blue"/><Metric label="TAMAÑO LOCAL" value={sizeLabel} detail="Estado serializado" color="yellow"/></View>

    <Text style={styles.section}>DATOS CONSERVADOS</Text>
    <View style={styles.records}>
      {[
        ['location-outline', 'Direcciones', addresses.length, C.yellow],
        ['card-outline', 'Métodos de pago demo', payments.length, C.blue],
        ['heart-outline', 'Favoritos', favorites.length, C.red],
        ['receipt-outline', 'Pedidos e historias', history.length, C.mint],
        ['notifications-outline', 'Notificaciones', notices.length, C.yellow],
        ['chatbubbles-outline', 'Mensajes de soporte', supportMessages.length, C.blue],
        ['storefront-outline', 'Órdenes del negocio', merchantOrders.length, C.red],
        ['bicycle-outline', 'Entregas del repartidor', riderHistory.length, C.mint],
      ].map(([icon, label, value, color]) => <View key={String(label)} style={styles.record}><View style={[styles.recordIcon, { backgroundColor: String(color) }]}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={19}/></View><Text style={styles.recordLabel}>{label}</Text><Text style={styles.recordValue}>{value}</Text></View>)}
      <View style={styles.recordsEnd}/>
    </View>

    <Text style={styles.section}>CONEXIÓN DEL BACKEND</Text>
    <View style={styles.backend}><View style={styles.backendTop}><Text style={styles.backendMode}>{backendMode === 'local' ? 'LOCAL' : 'REMOTE'}</Text><Text style={styles.backendBadge}>{backendConfigured ? 'CONFIGURADO' : 'FALTA URL'}</Text></View><Text style={styles.backendTitle}>{backendMode === 'local' ? 'ASYNCHRONOUS STORAGE' : 'DELIVER ASSETS SYNC HUB'}</Text><Text style={styles.backendCopy}>{backendMode === 'local' ? 'Los datos sobreviven al cierre de la aplicación y permanecen en este dispositivo.' : 'Las cuatro aplicaciones intercambian operaciones, disponibilidad comercial y políticas mediante el Sync Hub local en el puerto 9090.'}</Text></View>

    <View style={styles.actions}><Button label="GUARDAR AHORA" onPress={() => void runSave()} color="black" icon="save-outline"/><Button label={backendMode === 'local' ? 'VERIFICAR DATOS LOCALES' : 'SINCRONIZAR CON SERVIDOR'} onPress={() => void runSync()} color="mint" icon="sync-outline"/><Button label="RESTAURAR DATOS DEMO" onPress={reset} color="red" icon="refresh-outline"/></View>

    <View style={styles.warning}><Ionicons name="lock-open-outline" size={23}/><View style={{ flex: 1 }}><Text style={styles.warningTitle}>NO GUARDAR SECRETOS AQUÍ</Text><Text style={styles.warningCopy}>AsyncStorage no cifra datos. La app conserva solo información demo; tokens y credenciales reales deberán usar almacenamiento seguro y un backend.</Text></View></View>
  </ScrollView></SafeAreaView>
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 38 }, status: { minHeight: 148, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 2, borderColor: C.black, ...shadow }, statusIcon: { width: 57, height: 57, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 29, backgroundColor: C.white }, statusTitle: { marginTop: 7, fontSize: 21, lineHeight: 20, fontWeight: '900', letterSpacing: -1 }, statusCopy: { marginTop: 7, fontSize: 8, lineHeight: 12 }, metrics: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, section: { marginTop: 27, marginBottom: 10, fontSize: 17, fontWeight: '900' }, records: { marginBottom: 4 }, record: { minHeight: 64, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white }, recordIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black }, recordLabel: { flex: 1, fontSize: 10, fontWeight: '900' }, recordValue: { fontSize: 20, fontWeight: '900' }, recordsEnd: { height: 2, backgroundColor: C.black }, backend: { padding: 15, borderWidth: 2, borderColor: C.black, backgroundColor: C.black }, backendTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, backendMode: { color: C.yellow, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, backendBadge: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: C.white, color: C.white, fontSize: 7, fontWeight: '900' }, backendTitle: { marginTop: 18, color: C.white, fontSize: 25, lineHeight: 23, fontWeight: '900', letterSpacing: -1 }, backendCopy: { marginTop: 8, color: C.white, fontSize: 8, lineHeight: 12, opacity: .78 }, actions: { marginTop: 15, gap: 9 }, warning: { minHeight: 83, marginTop: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow }, warningTitle: { fontSize: 9, fontWeight: '900' }, warningCopy: { marginTop: 4, fontSize: 8, lineHeight: 11 } })
