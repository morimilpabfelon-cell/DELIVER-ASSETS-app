import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { useFeedback } from '@/components/FeedbackProvider'
import { paymentStateLabel } from '@/data/coordination'
import { formatOperationDate, operationStatusLabel } from '@/data/operations'
import { OperationReceiptCard } from '@/components/OperationReceiptCard'
import { Button, Header } from '@/components/UI'
import { C, shadow } from '@/theme'

export default function OrderDetail() {
  const router = useRouter()
  const { showToast } = useFeedback()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { operations, getOperationCoordination, reorder, rateOrder } = useApp()
  const operation = operations.find((item) => item.id === id)
  const authorizedCoordination = id ? getOperationCoordination(id) : null

  if (!operation || !authorizedCoordination) return <SafeAreaView style={styles.safe}><Header title="PEDIDO" onBack={() => router.back()}/><View style={styles.missing}><Text style={styles.missingTitle}>NO ENCONTRADO.</Text></View></SafeAreaView>

  const coordination = authorizedCoordination
  const repeat = () => {
    const ok = reorder(operation.id)
    if (ok) router.replace('/checkout')
    else showToast({ title: 'No disponible', message: 'Este pedido no puede repetirse automáticamente con el catálogo actual.', tone: 'warning' })
  }

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title={operation.id} kicker="DETALLE DE OPERACIÓN" onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.hero, operation.kind === 'shipment' && { backgroundColor: C.mint }]}>
        <Text style={[styles.kind, operation.kind === 'shipment' && { color: C.black }]}>{operation.kind === 'shipment' ? 'ENVÍO' : 'PEDIDO'} · {operationStatusLabel(operation.status).toUpperCase()}</Text>
        <Text style={[styles.title, operation.kind === 'shipment' && { color: C.black }]}>{operation.merchantName.toUpperCase()}</Text>
        <Text style={[styles.summary, operation.kind === 'shipment' && { color: C.black }]}>{operation.itemSummary}</Text>
        <View style={styles.total}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>S/ {operation.total.toFixed(2)}</Text></View>
      </View>

      <View style={styles.coordination}>
        <View style={{ flex: 1 }}>
          <Text style={styles.coordinationKicker}>COORDINACIÓN DEL PEDIDO</Text>
          <Text style={styles.coordinationTitle}>{coordination.status === 'open' ? 'CHAT ABIERTO' : 'HISTORIAL CERRADO'}</Text>
          <Text style={styles.coordinationCopy}>{coordination.messages.length} mensajes y eventos · {coordination.escalated ? 'Control solicitado' : 'sin escalamiento'}</Text>
        </View>
        <Ionicons name={coordination.status === 'open' ? 'chatbubbles' : 'lock-closed'} size={28}/>
      </View>

      <View style={styles.buttonRow}>
        <View style={{ flex: 1 }}><Button label="ABRIR CHAT" onPress={() => router.push({ pathname: '/order-chat/[id]', params: { id: operation.id } } as never)} color="black" icon="chatbubbles-outline"/></View>
        <View style={{ flex: 1 }}><Button label="BOLETA" onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: operation.id } } as never)} color="yellow" icon="receipt-outline"/></View>
      </View>

      <Text style={styles.section}>LÍNEA DE TIEMPO</Text>
      <View style={styles.timeline}>
        {operation.events.map((event, index) => <View key={event.id} style={styles.step}>
          <View style={styles.stepIcon}><Text style={styles.stepNumber}>{index + 1}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.stepTitle}>{event.label.toUpperCase()}</Text><Text style={styles.stepCopy}>{event.actor.toUpperCase()} · {formatOperationDate(event.at)}</Text></View>
          <Ionicons name="checkmark-circle" size={22} color="#087457"/>
        </View>)}
      </View>

      <Text style={styles.section}>COMPROBANTE</Text>
      <Pressable onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: operation.id } } as never)}>
        <OperationReceiptCard receipt={coordination.receipt} compact/>
      </Pressable>
      <Text style={styles.paymentCopy}>{paymentStateLabel(operation.paymentState)} · {operation.payment}</Text>

      {!operation.rated
        ? <Button label="CALIFICAR EXPERIENCIA" onPress={() => {
            rateOrder(operation.id)
            showToast({ title: 'Gracias', message: 'Tu calificación fue registrada.', tone: 'success' })
          }} color="yellow" icon="star-outline"/>
        : <View style={styles.rated}><Ionicons name="star" size={20}/><Text style={styles.ratedText}>EXPERIENCIA CALIFICADA</Text></View>}

      <View style={{ height: 10 }}/>
      <Button label={operation.kind === 'order' ? 'REPETIR PEDIDO' : 'NUEVO ENVÍO'} onPress={operation.kind === 'order' ? repeat : () => router.push('/store/10')} color="black" icon="refresh"/>

      <Pressable onPress={() => router.push({ pathname: '/order-chat/[id]', params: { id: operation.id } } as never)} style={styles.help}>
        <Text style={styles.helpText}>¿PROBLEMAS CON ESTA OPERACIÓN?</Text>
        <Text style={styles.helpArrow}>{coordination.status === 'open' ? 'ESCRIBIR EN EL CHAT →' : 'REVISAR HISTORIAL →'}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:35},missing:{flex:1,alignItems:'center',justifyContent:'center'},missingTitle:{fontSize:34,fontWeight:'900'},
  hero:{minHeight:230,padding:17,borderWidth:2,borderColor:C.black,backgroundColor:C.blue,...shadow},kind:{color:C.white,fontSize:8,fontWeight:'900',letterSpacing:1},title:{marginTop:17,color:C.yellow,fontSize:34,lineHeight:30,fontWeight:'900',letterSpacing:-1.7},summary:{marginTop:9,color:C.white,fontSize:9},total:{marginTop:'auto',paddingTop:12,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',borderTopWidth:1,borderColor:C.white},totalLabel:{color:C.white,fontSize:8,fontWeight:'900'},totalValue:{color:C.white,fontSize:26,fontWeight:'900'},
  coordination:{minHeight:92,marginTop:15,padding:13,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderColor:C.black,backgroundColor:C.mint},coordinationKicker:{fontSize:7,fontWeight:'900'},coordinationTitle:{marginTop:5,fontSize:16,fontWeight:'900'},coordinationCopy:{marginTop:4,color:C.gray,fontSize:7},
  buttonRow:{marginTop:10,flexDirection:'row',gap:8},section:{marginTop:26,marginBottom:10,fontSize:18,fontWeight:'900'},timeline:{borderBottomWidth:2,borderColor:C.black},step:{minHeight:69,padding:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderBottomWidth:0,borderColor:C.black,backgroundColor:C.white},stepIcon:{width:38,height:38,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,borderRadius:19,backgroundColor:C.mint},stepNumber:{fontSize:15,fontWeight:'900'},stepTitle:{fontSize:9,fontWeight:'900'},stepCopy:{marginTop:4,color:C.gray,fontSize:8},
  paymentCopy:{marginBottom:16,color:C.gray,fontSize:8,fontWeight:'800'},rated:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:2,borderColor:C.black,backgroundColor:C.mint},ratedText:{fontSize:9,fontWeight:'900'},help:{minHeight:70,marginTop:18,padding:12,borderWidth:2,borderColor:C.black,backgroundColor:C.white},helpText:{fontSize:8,fontWeight:'900'},helpArrow:{marginTop:8,color:C.blue,fontSize:9,fontWeight:'900'}
})
