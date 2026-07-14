import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { paymentStateLabel } from '@/data/coordination'
import { OperationReceiptCard } from '@/components/OperationReceiptCard'
import { Header } from '@/components/UI'
import { C } from '@/theme'

export default function ReceiptScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { operations, getOperationCoordination } = useApp()
  const operation = operations.find((item) => item.id === id)
  const authorizedCoordination = id ? getOperationCoordination(id) : null

  if (!operation || !authorizedCoordination) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="BOLETA" onBack={() => router.back()}/>
      <View style={styles.missing}><Ionicons name="receipt-outline" size={46}/><Text style={styles.missingTitle}>BOLETA NO ENCONTRADA.</Text></View>
    </SafeAreaView>
  }

  const coordination = authorizedCoordination
  const receipt = coordination.receipt

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <Header title="BOLETA DEL PEDIDO" kicker={operation.id} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>DOCUMENTO GENERADO AUTOMÁTICAMENTE</Text>
        <Text style={styles.heroTitle}>{paymentStateLabel(receipt.paymentState)}</Text>
        <Text style={styles.heroCopy}>La boleta se deriva del pedido original y conserva sus importes. Un reembolso cambia el estado, no borra el documento.</Text>
      </View>
      <OperationReceiptCard receipt={receipt}/>
      <View style={styles.audit}>
        <Ionicons name="shield-checkmark-outline" size={23}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.auditTitle}>REGISTRO DEL PEDIDO</Text>
          <Text style={styles.auditCopy}>Emitida {new Date(receipt.issuedAt).toLocaleString('es-PE')} · {coordination.messages.length} eventos y mensajes vinculados.</Text>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 40 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingTitle: { marginTop: 10, fontSize: 23, fontWeight: '900' },
  hero: { minHeight: 170, marginBottom: 14, padding: 16, borderWidth: 2, borderColor: C.black, backgroundColor: C.blue },
  heroKicker: { color: C.white, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { marginTop: 16, color: C.yellow, fontSize: 30, lineHeight: 28, fontWeight: '900' },
  heroCopy: { marginTop: 9, color: C.white, fontSize: 8, lineHeight: 13 },
  audit: { minHeight: 78, marginTop: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  auditTitle: { fontSize: 8, fontWeight: '900' },
  auditCopy: { marginTop: 5, fontSize: 7, lineHeight: 11 },
})
