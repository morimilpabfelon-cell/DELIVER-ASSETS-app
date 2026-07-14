import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useApp } from '@/context/AppContext'
import { CustomerProductMedia } from '@/components/CustomerProductMedia'
import { Button, Header } from '@/components/UI'
import { C } from '@/theme'

export default function Checkout() {
  const router = useRouter()
  const {
    address, cart, cartStore, subtotal, deliveryFee, serviceFee, discount, total,
    promo, updateQuantity, applyPromo, startOrder, payments, selectedPayment,
    selectPayment, walletBalance, getProductImage,
  } = useApp()
  const [code, setCode] = useState(promo)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (cart.length === 0) {
    return <SafeAreaView style={styles.empty} edges={['top', 'bottom']}>
      <Text style={styles.emptyTitle}>CARRITO{`\n`}VACÍO.</Text>
      <Text style={styles.emptyCopy}>Agrega productos de una sola categoría y un solo comercio.</Text>
      <Button label="VOLVER AL INICIO" onPress={() => router.replace('/(tabs)')}/>
    </SafeAreaView>
  }

  const confirm = () => {
    if (submitting) return
    if (selectedPayment.kind === 'wallet' && walletBalance < total) {
      setError('Saldo insuficiente en la billetera DA.')
      return
    }
    setSubmitting(true)
    const result = startOrder()
    if (!result.ok) {
      setSubmitting(false)
      setError(result.message)
      Alert.alert('No se pudo confirmar', result.message)
      return
    }
    router.replace('/tracking')
  }

  const doPromo = () => {
    const ok = applyPromo(code)
    setError(ok ? '' : 'Este código no corresponde a la categoría actual.')
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <Header title="CHECKOUT" kicker="REVISA Y CONFIRMA" onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>TODO{`\n`}EN ORDEN.</Text>
      <View style={styles.store}>
        <Text style={styles.storeSmall}>PEDIDO DE</Text>
        <Text style={styles.storeName}>{cartStore?.name.toUpperCase()}</Text>
        <Text style={styles.storeRule}>Solo {cartStore?.category} · no se mezclan comercios ni categorías.</Text>
      </View>

      {cart.map((line) => {
        const extrasTotal = line.extras.reduce((sum, label) => sum + (line.product.options?.find((option) => option.label === label)?.price ?? 0), 0)
        const lineTotal = (line.product.price + extrasTotal) * line.quantity
        return <View key={line.id} style={styles.line}>
          <CustomerProductMedia uri={getProductImage(line.storeId, line.product.id)} symbol={line.product.symbol} style={styles.linePhoto}/>
          <View style={{ flex: 1 }}>
            <Text style={styles.lineName}>{line.product.name}</Text>
            <Text style={styles.lineMeta}>{line.extras.join(' · ') || 'Sin extras'}{line.note ? ` · ${line.note}` : ''}</Text>
          </View>
          <View style={styles.qty}>
            <Pressable accessibilityLabel={`Quitar una unidad de ${line.product.name}`} onPress={() => updateQuantity(line.product.id, -1, line.note, line.extras)}><Text style={styles.qtyBtn}>−</Text></Pressable>
            <Text style={styles.qtyValue}>{line.quantity}</Text>
            <Pressable accessibilityLabel={`Agregar una unidad de ${line.product.name}`} onPress={() => updateQuantity(line.product.id, 1, line.note, line.extras)}><Text style={styles.qtyBtn}>+</Text></Pressable>
          </View>
          <Text style={styles.linePrice}>S/ {lineTotal.toFixed(2)}</Text>
        </View>
      })}

      <Text style={styles.section}>ENTREGA</Text>
      <View style={styles.address}><Ionicons name="location" size={21}/><View style={{ flex: 1 }}><Text style={styles.addrLabel}>DIRECCIÓN</Text><Text style={styles.addrText}>{address}</Text></View><Pressable onPress={() => router.push('/addresses')}><Text style={styles.edit}>EDITAR</Text></Pressable></View>

      <Text style={styles.section}>PAGO</Text>
      {payments.map((method) => <Pressable key={method.id} onPress={() => selectPayment(method.id)} style={[styles.payment, selectedPayment.id === method.id && styles.paymentActive]}>
        <View style={[styles.radio, selectedPayment.id === method.id && styles.radioActive]}/>
        <View style={{ flex: 1 }}><Text style={styles.paymentName}>{method.label}</Text><Text style={styles.paymentCopy}>{method.detail}</Text></View>
        <Ionicons name={method.kind === 'card' ? 'card' : method.kind === 'wallet' ? 'wallet' : 'cash'} size={20}/>
      </Pressable>)}
      <Pressable onPress={() => router.push('/payments')} style={styles.manage}><Text style={styles.manageText}>GESTIONAR MÉTODOS →</Text></Pressable>

      <Text style={styles.section}>CUPÓN</Text>
      <View style={styles.promo}>
        <TextInput value={code} onChangeText={(value) => { setCode(value.toUpperCase()); setError('') }} autoCapitalize="characters" placeholder="PRIMER20" style={styles.promoInput}/>
        <Pressable onPress={doPromo} style={styles.promoButton}><Text style={styles.promoButtonText}>APLICAR</Text></Pressable>
      </View>
      {error ? <Text style={styles.error}>{error} Usa PRIMER20 o la promoción específica mostrada en Inicio.</Text> : promo ? <Text style={styles.success}>CUPÓN {promo} APLICADO ✓</Text> : null}

      <View style={styles.summary}>
        <View style={styles.sumRow}><Text>Productos</Text><Text>S/ {subtotal.toFixed(2)}</Text></View>
        <View style={styles.sumRow}><Text>Envío</Text><Text>S/ {deliveryFee.toFixed(2)}</Text></View>
        <View style={styles.sumRow}><Text>Servicio</Text><Text>S/ {serviceFee.toFixed(2)}</Text></View>
        {discount > 0 && <View style={styles.sumRow}><Text style={styles.green}>Descuento {promo}</Text><Text style={styles.green}>− S/ {discount.toFixed(2)}</Text></View>}
        <View style={styles.total}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>S/ {total.toFixed(2)}</Text></View>
      </View>

      <View style={styles.security}><Ionicons name="shield-checkmark" size={22}/><View style={{ flex: 1 }}><Text style={styles.securityTitle}>CONFIRMACIÓN SEGURA</Text><Text style={styles.securityCopy}>Pago, disponibilidad y dirección son simulados. No se realizará ningún cobro real.</Text></View></View>
      <Button label={submitting ? 'CREANDO OPERACIÓN…' : 'CONFIRMAR PEDIDO DEMO'} onPress={confirm} disabled={submitting} color="black" icon="checkmark-circle-outline"/>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 30 },
  title: { marginBottom: 20, fontSize: 46, lineHeight: 38, fontWeight: '900', letterSpacing: -2.3 },
  store: { padding: 13, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  storeSmall: { fontSize: 7, fontWeight: '900' },
  storeName: { marginTop: 5, fontSize: 23, fontWeight: '900' },
  storeRule: { marginTop: 5, fontSize: 8 },
  line: { minHeight: 84, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderColor: C.line },
  linePhoto: { width: 56, height: 56, borderWidth: 1, borderColor: C.black },
  lineName: { fontSize: 12, fontWeight: '900' },
  lineMeta: { marginTop: 3, color: C.gray, fontSize: 7, lineHeight: 10 },
  qty: { width: 76, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: C.black },
  qtyBtn: { fontSize: 18, fontWeight: '900' },
  qtyValue: { fontSize: 10, fontWeight: '900' },
  linePrice: { width: 63, textAlign: 'right', fontSize: 10, fontWeight: '900' },
  section: { marginTop: 25, marginBottom: 9, fontSize: 16, fontWeight: '900' },
  address: { minHeight: 68, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  addrLabel: { fontSize: 7, fontWeight: '900' },
  addrText: { marginTop: 3, fontSize: 10, fontWeight: '700' },
  edit: { fontSize: 8, fontWeight: '900' },
  payment: { minHeight: 63, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, borderBottomWidth: 0, backgroundColor: C.white },
  paymentActive: { backgroundColor: C.mint },
  radio: { width: 21, height: 21, borderWidth: 2, borderColor: C.black, borderRadius: 11 },
  radioActive: { borderWidth: 6, backgroundColor: C.yellow },
  paymentName: { fontSize: 11, fontWeight: '900' },
  paymentCopy: { marginTop: 3, color: C.gray, fontSize: 8 },
  manage: { minHeight: 39, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.black },
  manageText: { color: C.white, fontSize: 7, fontWeight: '900' },
  promo: { flexDirection: 'row' },
  promoInput: { flex: 1, minHeight: 47, paddingHorizontal: 11, borderWidth: 2, borderColor: C.black, backgroundColor: C.white, fontSize: 11, fontWeight: '900' },
  promoButton: { minWidth: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderLeftWidth: 0, borderColor: C.black, backgroundColor: C.black },
  promoButtonText: { color: C.white, fontSize: 8, fontWeight: '900' },
  error: { marginTop: 7, color: C.red, fontSize: 8, fontWeight: '800', lineHeight: 11 },
  success: { marginTop: 7, color: '#087457', fontSize: 8, fontWeight: '900' },
  summary: { marginVertical: 23, padding: 15, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  sumRow: { minHeight: 29, flexDirection: 'row', justifyContent: 'space-between' },
  green: { color: '#087457', fontWeight: '800' },
  total: { marginTop: 10, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 2, borderColor: C.black },
  totalLabel: { fontSize: 10, fontWeight: '900' },
  totalValue: { fontSize: 26, fontWeight: '900' },
  security: { minHeight: 75, marginBottom: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint },
  securityTitle: { fontSize: 9, fontWeight: '900' },
  securityCopy: { marginTop: 4, fontSize: 8, lineHeight: 11 },
  empty: { flex: 1, padding: 30, justifyContent: 'center', gap: 20, backgroundColor: C.paper },
  emptyTitle: { fontSize: 46, lineHeight: 39, fontWeight: '900' },
  emptyCopy: { color: C.gray, fontSize: 10, lineHeight: 15 },
})
