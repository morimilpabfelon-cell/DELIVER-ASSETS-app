import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Button, Header, Kicker, Metric } from '@/components/UI'
import { useApp } from '@/context/AppContext'
import type { HealthCheck, NetworkMode, TechnicalLevel } from '@/data/resilience'
import { C, shadow } from '@/theme'

const modes: { id: NetworkMode; label: string; copy: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'online', label: 'ONLINE', copy: 'Respuesta normal', icon: 'wifi' },
  { id: 'slow', label: 'LENTA', copy: 'Retardo controlado', icon: 'speedometer-outline' },
  { id: 'offline', label: 'SIN RED', copy: 'Cola local', icon: 'cloud-offline-outline' },
]

const levelColor: Record<TechnicalLevel, string> = {
  info: C.blue,
  success: C.mint,
  warning: C.yellow,
  error: C.red,
}

function time(value: string) {
  return new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ResilienceCenter() {
  const router = useRouter()
  const {
    networkMode, setNetworkMode, pendingActions, technicalEvents, lastLifecycleState, reducedMotion,
    retryPendingActions, clearTechnicalEvents, runHealthCheck, persistenceStatus, syncStatus,
  } = useApp()
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [running, setRunning] = useState(false)

  const runChecks = async () => {
    setRunning(true)
    const result = await runHealthCheck()
    setChecks(result)
    setRunning(false)
    Alert.alert(result.every((item) => item.ok) ? 'Chequeo aprobado' : 'Chequeo con observaciones', `${result.filter((item) => item.ok).length}/${result.length} verificaciones correctas.`)
  }

  const retry = async () => {
    const ok = await retryPendingActions()
    Alert.alert(ok ? 'Cola procesada' : 'Cola pendiente', ok ? 'Las acciones pendientes fueron conciliadas.' : networkMode === 'offline' ? 'Cambia a ONLINE o LENTA para reintentar.' : 'No fue posible procesar la cola.')
  }

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="CENTRO DE RESISTENCIA" kicker="QA COORDINACIÓN · V2.5" onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="pulse" size={29} color={C.white}/></View>
        <Kicker light>ESTADOS, RECUPERACIÓN Y DIAGNÓSTICO</Kicker>
        <Text style={styles.heroTitle}>LA APP DEBE{'\n'}RESISTIR.</Text>
        <Text style={styles.heroCopy}>Este panel prueba colas, reintentos y conexión con el Sync Hub que mantiene coordinadas las cuatro aplicaciones. Los modos LENTA y SIN RED siguen siendo simulaciones locales.</Text>
      </View>

      <Text style={styles.section}>SIMULADOR DE CONEXIÓN</Text>
      <View style={styles.modeGrid}>
        {modes.map((mode) => <Pressable key={mode.id} onPress={() => setNetworkMode(mode.id)} style={({ pressed }) => [styles.mode, networkMode === mode.id && styles.modeActive, pressed && { opacity: .72 }]}>
          <Ionicons name={mode.icon} size={23} color={networkMode === mode.id ? C.white : C.black}/>
          <Text style={[styles.modeLabel, networkMode === mode.id && { color: C.white }]}>{mode.label}</Text>
          <Text style={[styles.modeCopy, networkMode === mode.id && { color: C.white }]}>{mode.copy}</Text>
        </Pressable>)}
      </View>

      <View style={styles.metrics}>
        <Metric label="ACCIONES PENDIENTES" value={String(pendingActions.length)} detail="Cola idempotente local" color={pendingActions.length ? 'yellow' : 'mint'}/>
        <Metric label="CICLO DE VIDA" value={lastLifecycleState.toUpperCase()} detail="Último estado Android" color="white"/>
        <Metric label="MOVIMIENTO REDUCIDO" value={reducedMotion ? 'ACTIVO' : 'NORMAL'} detail="Preferencia del sistema" color="blue"/>
        <Metric label="ESTADO LOCAL" value={persistenceStatus === 'error' || syncStatus === 'error' ? 'ERROR' : persistenceStatus === 'saving' ? 'GUARDANDO' : 'LISTO'} detail="Persistencia y sincronización" color={persistenceStatus === 'error' || syncStatus === 'error' ? 'red' : 'white'}/>
      </View>

      <Text style={styles.section}>COLA DE ACCIONES</Text>
      {pendingActions.length ? <View style={styles.stack}>
        {pendingActions.slice(0, 8).map((action) => <View key={action.id} style={styles.queueRow}>
          <View style={styles.queueIcon}><Ionicons name="time-outline" size={19}/></View>
          <View style={{ flex: 1 }}><Text style={styles.queueTitle}>{action.label}</Text><Text style={styles.queueCopy}>{action.entityId} · intento {action.attempts}</Text></View>
          <Text style={styles.queueTime}>{time(action.createdAt)}</Text>
        </View>)}
        <View style={styles.stackEnd}/>
      </View> : <View style={styles.empty}><Ionicons name="checkmark-circle" size={25}/><Text style={styles.emptyTitle}>SIN ACCIONES PENDIENTES</Text><Text style={styles.emptyCopy}>Todas las mutaciones locales están conciliadas.</Text></View>}
      <Button label="REINTENTAR COLA" onPress={() => void retry()} color="mint" icon="refresh-outline"/>

      <Text style={styles.section}>CHEQUEO DEL ESTADO</Text>
      <Button label={running ? 'EJECUTANDO…' : 'EJECUTAR CHEQUEO'} onPress={() => void runChecks()} color="black" disabled={running} icon="shield-checkmark-outline"/>
      {checks.length > 0 && <View style={[styles.stack, { marginTop: 10 }]}>
        {checks.map((check) => <View key={check.id} style={styles.checkRow}>
          <View style={[styles.checkIcon, { backgroundColor: check.ok ? C.mint : C.red }]}><Ionicons name={check.ok ? 'checkmark' : 'close'} size={18} color={check.ok ? C.black : C.white}/></View>
          <View style={{ flex: 1 }}><Text style={styles.queueTitle}>{check.label}</Text><Text style={styles.queueCopy}>{check.detail}</Text></View>
        </View>)}
        <View style={styles.stackEnd}/>
      </View>}

      <View style={styles.logHeader}><Text style={styles.section}>REGISTRO TÉCNICO</Text><Pressable onPress={clearTechnicalEvents}><Text style={styles.clear}>LIMPIAR</Text></Pressable></View>
      {technicalEvents.length ? <View style={styles.logs}>
        {technicalEvents.slice(0, 20).map((event) => <View key={event.id} style={styles.logRow}>
          <View style={[styles.logDot, { backgroundColor: levelColor[event.level] }]}/>
          <View style={{ flex: 1 }}><Text style={styles.logScope}>{event.scope.toUpperCase()} · {time(event.at)}</Text><Text style={styles.logMessage}>{event.message}</Text></View>
        </View>)}
      </View> : <View style={styles.empty}><Text style={styles.emptyTitle}>REGISTRO VACÍO</Text><Text style={styles.emptyCopy}>Las acciones técnicas aparecerán aquí.</Text></View>}

      <View style={styles.notice}><Ionicons name="information-circle-outline" size={22}/><Text style={styles.noticeText}>El Sync Hub sincroniza las cuatro apps instaladas durante el desarrollo. Para producción todavía se necesitará autenticación, base de datos y despliegue seguro en un servidor real.</Text></View>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 40 },
  hero: { minHeight: 250, padding: 18, borderWidth: 3, borderColor: C.black, backgroundColor: C.black, ...shadow },
  heroIcon: { width: 56, height: 56, marginBottom: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white, borderRadius: 28, backgroundColor: C.blue },
  heroTitle: { marginTop: 13, color: C.yellow, fontSize: 43, lineHeight: 39, fontWeight: '900', letterSpacing: -2 },
  heroCopy: { marginTop: 13, color: C.white, fontSize: 9, lineHeight: 14, opacity: .82 },
  section: { marginTop: 27, marginBottom: 10, fontSize: 17, fontWeight: '900' },
  modeGrid: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, minHeight: 112, padding: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  modeActive: { backgroundColor: C.black },
  modeLabel: { marginTop: 'auto', fontSize: 11, fontWeight: '900' },
  modeCopy: { marginTop: 3, fontSize: 7, lineHeight: 10 },
  metrics: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  stack: { marginBottom: 10 },
  queueRow: { minHeight: 67, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  queueIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  queueTitle: { fontSize: 10, fontWeight: '900' },
  queueCopy: { marginTop: 3, color: C.gray, fontSize: 7, lineHeight: 10 },
  queueTime: { fontSize: 7, fontWeight: '900' },
  stackEnd: { height: 2, backgroundColor: C.black },
  empty: { minHeight: 105, marginBottom: 10, padding: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  emptyTitle: { marginTop: 5, fontSize: 11, fontWeight: '900' },
  emptyCopy: { marginTop: 4, color: C.gray, fontSize: 8, textAlign: 'center' },
  checkRow: { minHeight: 62, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  checkIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { marginTop: 17, fontSize: 8, fontWeight: '900', color: C.red },
  logs: { borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  logRow: { minHeight: 58, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  logDot: { width: 11, height: 11, marginTop: 3, borderWidth: 1, borderColor: C.black, borderRadius: 6 },
  logScope: { fontSize: 6, fontWeight: '900', letterSpacing: .6 },
  logMessage: { marginTop: 4, fontSize: 8, lineHeight: 12 },
  notice: { minHeight: 85, marginTop: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  noticeText: { flex: 1, fontSize: 8, lineHeight: 12 },
})
