import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { paymentStateLabel } from '@/data/coordination'
import { OperationReceiptCard } from '@/components/OperationReceiptCard'
import { Header } from '@/components/UI'
import { C } from '@/theme'

export default function ControlReceipt() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { operations, getOperationCoordination } = useApp()
  const operation = operations.find((item) => item.id === id)
  const coordination = id ? getOperationCoordination(id) : null

  if (!operation || !coordination) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="BOLETA DEL CASO" onBack={() => router.back()}/>
      <View style={styles.missing}>
        <Ionicons name="shield-outline" size={44}/>
        <Text style={styles.missingTitle}>CASO NO AUTORIZADO.</Text>
        <Text style={styles.missingCopy}>Control puede revisar la boleta cuando la conversación fue escalada.</Text>
      </View>
    </SafeAreaView>
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <Header title="BOLETA DEL CASO" kicker={operation.id} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>AUDITORÍA FINANCIERA DEL PEDIDO</Text>
        <Text style={styles.heroTitle}>{paymentStateLabel(operation.paymentState)}</Text>
        <Text style={styles.heroCopy}>Control consulta este documento para resolver reclamos. La boleta original conserva sus importes y el estado financiero se actualiza por eventos.</Text>
      </View>
      <OperationReceiptCard receipt={coordination.receipt} role="admin"/>
      <View style={styles.audit}>
        <Ionicons name="shield-checkmark-outline" size={23}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.auditTitle}>TRAZABILIDAD ACTIVA</Text>
          <Text style={styles.auditCopy}>{coordination.messages.length} mensajes y eventos vinculados · {coordination.participants.length} participantes registrados.</Text>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 40 },
  missing: { flex: 1, padding: 25, alignItems: 'center', justifyContent: 'center' },
  missingTitle: { marginTop: 10, fontSize: 24, fontWeight: '900' },
  missingCopy: { marginTop: 7, color: C.gray, fontSize: 9, lineHeight: 14, textAlign: 'center' },
  hero: { minHeight: 185, marginBottom: 14, padding: 16, borderWidth: 2, borderColor: C.black, backgroundColor: C.red },
  heroKicker: { color: C.white, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { marginTop: 16, color: C.yellow, fontSize: 30, lineHeight: 28, fontWeight: '900' },
  heroCopy: { marginTop: 9, color: C.white, fontSize: 8, lineHeight: 13 },
  audit: { minHeight: 82, marginTop: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  auditTitle: { fontSize: 8, fontWeight: '900' },
  auditCopy: { marginTop: 5, fontSize: 7, lineHeight: 11 },
})
