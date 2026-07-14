import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { paymentStateLabel } from '@/data/coordination'
import { OperationReceiptCard } from '@/components/OperationReceiptCard'
import { Header } from '@/components/UI'
import { C } from '@/theme'

export default function RiderReceipt() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { operations, getOperationCoordination } = useApp()
  const operation = operations.find((item) => item.id === id)
  const coordination = id ? getOperationCoordination(id) : null

  if (!operation || !coordination) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="RESUMEN DE COBRO" onBack={() => router.back()}/>
      <View style={styles.missing}>
        <Ionicons name="shield-outline" size={44}/>
        <Text style={styles.missingTitle}>SIN ACCESO.</Text>
        <Text style={styles.missingCopy}>Solo el repartidor asignado puede consultar la información operativa de cobro.</Text>
      </View>
    </SafeAreaView>
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <Header title="COBRO DE ENTREGA" kicker={operation.id} onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>INSTRUCCIÓN FINANCIERA OPERATIVA</Text>
        <Text style={styles.heroTitle}>{paymentStateLabel(operation.paymentState)}</Text>
        <Text style={styles.heroCopy}>
          {operation.paymentState === 'cash_due'
            ? `Debes cobrar S/ ${operation.total.toFixed(2)} al completar la entrega.`
            : 'El pedido ya fue pagado. No solicites dinero adicional al cliente.'}
        </Text>
      </View>

      <OperationReceiptCard receipt={coordination.receipt} role="rider"/>

      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={22}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.privacyTitle}>DATOS LIMITADOS POR ROL</Text>
          <Text style={styles.privacyCopy}>Rider no recibe números de tarjeta, correo ni información financiera completa del cliente.</Text>
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
  hero: { minHeight: 180, marginBottom: 14, padding: 16, borderWidth: 2, borderColor: C.black, backgroundColor: C.blue },
  heroKicker: { color: C.white, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { marginTop: 16, color: C.yellow, fontSize: 30, lineHeight: 28, fontWeight: '900' },
  heroCopy: { marginTop: 9, color: C.white, fontSize: 9, lineHeight: 14 },
  privacy: { minHeight: 82, marginTop: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  privacyTitle: { fontSize: 8, fontWeight: '900' },
  privacyCopy: { marginTop: 5, fontSize: 7, lineHeight: 11 },
})
