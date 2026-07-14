import { StyleSheet, Text, View } from 'react-native'
import type { OperationReceipt } from '@/data/coordination'
import { paymentStateLabel } from '@/data/coordination'
import { C } from '@/theme'

export type ReceiptViewerRole = 'rider' | 'admin'

function money(value: number) {
  return `S/ ${value.toFixed(2)}`
}

export function OperationReceiptCard({
  receipt,
  role,
  compact = false,
}: {
  receipt: OperationReceipt
  role: ReceiptViewerRole
  compact?: boolean
}) {
  const rider = role === 'rider'
  const riderInstruction = receipt.paymentState === 'cash_due'
    ? `COBRAR ${money(receipt.total)} EN EFECTIVO`
    : paymentStateLabel(receipt.paymentState)

  return <View style={[styles.card, compact && styles.compact]}>
    <View style={styles.head}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>{rider ? 'RESUMEN DE COBRO' : 'BOLETA DE VENTA'}</Text>
        <Text style={styles.number}>{receipt.number}</Text>
      </View>
      <View style={[
        styles.payment,
        receipt.paymentState === 'captured' ? styles.paid
          : receipt.paymentState === 'cash_due' ? styles.cash
            : styles.pending,
      ]}>
        <Text style={styles.paymentText}>{rider ? riderInstruction : paymentStateLabel(receipt.paymentState)}</Text>
      </View>
    </View>

    {rider
      ? <View style={styles.riderBody}>
          <View style={styles.riderLine}>
            <Text style={styles.label}>NEGOCIO</Text>
            <Text style={styles.value}>{receipt.merchantName}</Text>
          </View>
          <View style={styles.riderLine}>
            <Text style={styles.label}>FORMA DE ENTREGA</Text>
            <Text style={styles.value}>{receipt.paymentState === 'cash_due' ? 'EFECTIVO CONTRA ENTREGA' : 'PAGO CONFIRMADO POR LA PLATAFORMA'}</Text>
          </View>
          <Text style={styles.privacy}>El repartidor no recibe datos de tarjeta, correo ni información financiera adicional del cliente.</Text>
        </View>
      : !compact && <>
          <View style={styles.identity}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>NEGOCIO</Text>
              <Text style={styles.value}>{receipt.merchantName}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CLIENTE</Text>
              <Text style={styles.value}>{receipt.customerName}</Text>
            </View>
          </View>

          <View style={styles.lines}>
            {receipt.lines.map((line, index) => <View key={`${line.productId}-${index}`} style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName}>{line.quantity} × {line.name}</Text>
                {line.extras.length > 0 && <Text style={styles.lineMeta}>{line.extras.join(' · ')}</Text>}
                {line.note ? <Text style={styles.lineMeta}>Nota: {line.note}</Text> : null}
              </View>
              <Text style={styles.lineValue}>{money(line.lineTotal)}</Text>
            </View>)}
          </View>

          <View style={styles.summary}>
            <Row label="Subtotal" value={money(receipt.subtotal)}/>
            <Row label="Envío" value={money(receipt.deliveryFee)}/>
            <Row label="Servicio" value={money(receipt.serviceFee)}/>
            {receipt.discount > 0 && <Row label="Descuento" value={`− ${money(receipt.discount)}`}/>}
          </View>
        </>}

    <View style={styles.total}>
      <View style={{ flex: 1 }}>
        <Text style={styles.totalLabel}>{rider ? 'MONTO OPERATIVO' : 'TOTAL PAGADO / POR COBRAR'}</Text>
        <Text style={styles.method}>{rider ? riderInstruction : receipt.paymentLabel}</Text>
      </View>
      <Text style={styles.totalValue}>{money(receipt.total)}</Text>
    </View>
  </View>
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  compact: { marginVertical: 7 },
  head: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderBottomWidth: 2,
    borderColor: C.black,
    backgroundColor: C.paper,
  },
  kicker: { fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  number: { marginTop: 5, fontSize: 13, fontWeight: '900' },
  payment: {
    maxWidth: 145,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.black,
  },
  paid: { backgroundColor: C.mint },
  cash: { backgroundColor: C.yellow },
  pending: { backgroundColor: C.red },
  paymentText: { fontSize: 7, fontWeight: '900', textAlign: 'center' },
  identity: { padding: 12, flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderColor: C.line },
  label: { color: C.gray, fontSize: 6, fontWeight: '900', letterSpacing: .7 },
  value: { marginTop: 4, fontSize: 9, fontWeight: '900' },
  lines: { paddingHorizontal: 12 },
  line: {
    minHeight: 54,
    paddingVertical: 9,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  lineName: { fontSize: 9, fontWeight: '900' },
  lineMeta: { marginTop: 3, color: C.gray, fontSize: 7, lineHeight: 10 },
  lineValue: { fontSize: 9, fontWeight: '900' },
  summary: { padding: 12 },
  row: { minHeight: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: C.gray, fontSize: 8 },
  rowValue: { fontSize: 8, fontWeight: '900' },
  riderBody: { padding: 12, gap: 12 },
  riderLine: { minHeight: 44, paddingBottom: 9, borderBottomWidth: 1, borderColor: C.line },
  privacy: { color: C.gray, fontSize: 7, lineHeight: 11 },
  total: {
    minHeight: 72,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 2,
    borderColor: C.black,
    backgroundColor: C.black,
  },
  totalLabel: { color: C.white, fontSize: 6, fontWeight: '900', letterSpacing: .7 },
  method: { marginTop: 4, color: C.white, fontSize: 8, fontWeight: '900' },
  totalValue: { color: C.yellow, fontSize: 22, fontWeight: '900' },
})
