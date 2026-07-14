import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { stores } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { formatOperationDate, operationStatusToCustomerStage } from '@/data/operations'
import { Button } from '@/components/UI'
import { C, shadow } from '@/theme'

const orderStages = [
  ['Pedido confirmado', 'El comercio recibió tu pedido.'],
  ['Preparando', 'El comercio está preparando los productos.'],
  ['En camino', 'El repartidor recogió el pedido y va hacia ti.'],
  ['Entregado', 'La operación fue completada por el repartidor.'],
]
const shipmentStages = [
  ['Envío confirmado', 'La solicitud fue registrada.'],
  ['Repartidor asignado', 'El repartidor se dirige al punto de recojo.'],
  ['Paquete recogido', 'El contenido declarado ya está en ruta.'],
  ['En camino', 'El repartidor se dirige al destino.'],
  ['Entregado', 'El destinatario confirmó la entrega.'],
]

export default function Tracking() {
  const router = useRouter()
  const {
    orderStage,
    deliveryKind,
    activeShipment,
    activeOrder,
    activeOperation,
    operationStatusText,
    finishDelivery,
    cancelOperation,
    riderProfile,
    syncNow,
  } = useApp()

  const isShipment = activeOperation?.kind === 'shipment' || deliveryKind === 'shipment'
  const stages = isShipment ? shipmentStages : orderStages
  const integratedStage = activeOperation ? operationStatusToCustomerStage(activeOperation) : orderStage
  const stage = Math.max(1, Math.min(stages.length, integratedStage))
  const cancelled = activeOperation?.status === 'cancelled'
  const done = activeOperation?.status === 'delivered' || cancelled || stage >= stages.length
  const provider = isShipment
    ? stores.find((store) => store.id === (activeOperation?.providerId ?? activeShipment?.providerId))
    : stores.find((store) => store.id === (activeOperation?.storeId ?? activeOrder?.storeId))
  const service = isShipment
    ? provider?.products.find((product) => product.id === (activeOperation?.serviceId ?? activeShipment?.serviceId))
    : null
  const operationId = activeOperation?.id ?? activeOrder?.id ?? '#DX-DEMO'
  const progressLeft = `${Math.min(78, 14 + stage * (64 / stages.length))}%` as `${number}%`

  const close = () => {
    if (done) finishDelivery()
    router.replace('/(tabs)/orders')
  }

  if (!activeOrder && !activeShipment && !activeOperation) {
    return <SafeAreaView style={styles.empty}>
      <Text style={styles.emptyTitle}>SIN ENTREGA{`\n`}ACTIVA.</Text>
      <Button label="VER PEDIDOS" onPress={() => router.replace('/(tabs)/orders')}/>
    </SafeAreaView>
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Pressable style={styles.close} onPress={close}><Ionicons name="close" size={22} color={C.white}/></Pressable>
        <View>
          <Text style={styles.kicker}>{isShipment ? 'ENVÍO INTEGRADO' : 'PEDIDO INTEGRADO'}</Text>
          <Text style={styles.operation}>{operationId}</Text>
        </View>
      </View>

      <View style={[styles.sharedBanner, done && { backgroundColor: C.mint }]}>
        <Ionicons name={done ? 'checkmark-circle' : 'git-network-outline'} size={21}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.sharedTitle}>ESTADO COMPARTIDO ENTRE LOS CUATRO ROLES</Text>
          <Text style={styles.sharedCopy}>{operationStatusText}</Text>
        </View>
      </View>

      <View style={[styles.map, isShipment && { backgroundColor: C.mint }]}>
        <View style={styles.roadA}/><View style={styles.roadB}/>
        <View style={styles.shop}><Text style={styles.pinText}>{isShipment ? 'A' : provider?.symbol ?? 'B'}</Text></View>
        <View style={styles.home}>{isShipment ? <Text style={styles.destination}>B</Text> : <Ionicons name="home" size={21}/>}</View>
        <View style={[styles.rider, { left: progressLeft }]}><Ionicons name={isShipment ? 'cube' : 'bicycle'} size={23} color={C.white}/></View>
        <View style={styles.mapInfo}>
          <Text style={styles.mapTime}>{cancelled ? 'CANCELADO' : done ? 'ENTREGADO' : `${Math.max(4, 20 - stage * 3)} MIN`}</Text>
          <Text style={styles.mapCopy}>{cancelled ? 'Reembolso y cierre registrados' : done ? 'Operación conciliada' : 'Estado actualizado por la operación'}</Text>
        </View>
      </View>

      <View style={styles.state}>
        <Text style={styles.stateKicker}>{isShipment ? `${provider?.name ?? 'DA Express'} · ${service?.name ?? 'Envío'}` : provider?.name ?? 'Pedido'}</Text>
        <Text style={styles.stateTitle}>{cancelled ? 'OPERACIÓN CANCELADA' : stages[stage - 1][0].toUpperCase()}</Text>
        <Text style={styles.stateCopy}>{cancelled ? activeOperation?.cancellationReason ?? 'La operación fue cerrada.' : stages[stage - 1][1]}</Text>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${(stage / stages.length) * 100}%` }]}/></View>
      </View>

      {(activeOperation?.riderName || stage >= 3) && <View style={styles.riderCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{riderProfile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.riderLabel}>REPARTIDOR ASIGNADO</Text>
          <Text style={styles.riderName}>{(activeOperation?.riderName ?? riderProfile.name).toUpperCase()}</Text>
          <Text style={styles.riderMeta}>{riderProfile.subtitle}</Text>
        </View>
        <Pressable onPress={() => Alert.alert('Llamada demo', 'En producción se usaría un número protegido.')} style={styles.round}><Ionicons name="call" size={19}/></Pressable>
        <Pressable onPress={() => router.push('/support')} style={styles.round}><Ionicons name="chatbubble" size={19}/></Pressable>
      </View>}

      <Text style={styles.section}>LÍNEA DE TIEMPO COMPARTIDA</Text>
      {activeOperation?.events.map((event) => <View key={event.id} style={[styles.timeline, styles.timelineDone]}>
        <View style={[styles.timelineDot, styles.timelineDotDone]}><Ionicons name="checkmark" size={15} color={C.white}/></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.timelineTitle}>{event.label.toUpperCase()}</Text>
          <Text style={styles.timelineCopy}>{event.actor.toUpperCase()} · {formatOperationDate(event.at)}</Text>
        </View>
        <Text style={styles.timelineTime}>LISTO</Text>
      </View>)}

      {!activeOperation && stages.map(([title, copy], index) => <View key={title} style={[styles.timeline, index < stage && styles.timelineDone]}>
        <View style={[styles.timelineDot, index < stage && styles.timelineDotDone]}>{index < stage && <Ionicons name="checkmark" size={15} color={C.white}/>}</View>
        <View style={{ flex: 1 }}><Text style={styles.timelineTitle}>{title.toUpperCase()}</Text><Text style={styles.timelineCopy}>{copy}</Text></View>
        <Text style={styles.timelineTime}>{index < stage ? 'LISTO' : 'PENDIENTE'}</Text>
      </View>)}

      {isShipment && (activeShipment || activeOperation) && <View style={styles.route}>
        <Text style={styles.routeLabel}>RUTA DECLARADA</Text>
        <Text style={styles.routeTitle}>A · {activeOperation?.pickupAddress ?? activeShipment?.pickupAddress}</Text>
        <Text style={styles.routeArrow}>↓</Text>
        <Text style={styles.routeTitle}>B · {activeOperation?.dropoffAddress ?? activeShipment?.dropoffAddress}</Text>
        <Text style={styles.routeContent}>Contenido: {activeOperation?.items[0]?.note ?? activeShipment?.content}</Text>
      </View>}

      {done
        ? <Button label="CERRAR Y GUARDAR" onPress={close} color="mint" icon="checkmark-circle"/>
        : <Button label="ACTUALIZAR ESTADO" onPress={() => void syncNow()} color="yellow" icon="refresh-outline"/>}


      {activeOperation && !cancelled && ['created','accepted'].includes(activeOperation.status) && <Pressable onPress={() => Alert.alert('Cancelar operación', 'Esta acción registrará el motivo y devolverá el saldo de billetera cuando corresponda.', [{ text: 'Conservar', style: 'cancel' }, { text: 'Cancelar operación', style: 'destructive', onPress: () => { const result = cancelOperation(activeOperation.id, 'customer', 'Cancelado por el cliente antes de preparación'); Alert.alert(result.ok ? 'Operación cancelada' : 'No se pudo cancelar', result.message) } }])} style={styles.cancel}><Text style={styles.cancelText}>CANCELAR ANTES DE PREPARACIÓN</Text></Pressable>}
      <Pressable onPress={() => router.push('/support')} style={styles.issue}>
        <Text style={styles.issueTitle}>¿ALGO NO VA BIEN?</Text>
        <Text style={styles.issueAction}>REPORTAR UN PROBLEMA →</Text>
      </Pressable>
      <Text style={styles.disclaimer}>La ruta continúa siendo conceptual; el estado operativo sí es compartido entre los roles de esta simulación.</Text>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:30},top:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:14},close:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,backgroundColor:C.black},kicker:{fontSize:7,fontWeight:'900',letterSpacing:.9},operation:{marginTop:3,fontSize:14,fontWeight:'900'},
  sharedBanner:{minHeight:66,marginBottom:12,padding:11,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderColor:C.black,backgroundColor:C.yellow},sharedTitle:{fontSize:7,fontWeight:'900'},sharedCopy:{marginTop:4,fontSize:9,fontWeight:'800'},
  map:{height:290,borderWidth:3,borderColor:C.black,backgroundColor:C.blue,overflow:'hidden',...shadow},roadA:{position:'absolute',width:430,height:18,borderWidth:3,borderColor:C.black,backgroundColor:C.paper,transform:[{rotate:'18deg'}]},roadB:{position:'absolute',width:350,height:18,borderWidth:3,borderColor:C.black,backgroundColor:C.paper,transform:[{rotate:'-42deg'}]},shop:{position:'absolute',left:28,top:47,width:48,height:48,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.black,borderRadius:24,backgroundColor:C.yellow},pinText:{fontSize:15,fontWeight:'900'},home:{position:'absolute',right:28,bottom:50,width:48,height:48,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.black,borderRadius:24,backgroundColor:C.white},destination:{fontSize:15,fontWeight:'900'},rider:{position:'absolute',top:'43%',width:55,height:55,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.black,borderRadius:28,backgroundColor:C.black},mapInfo:{position:'absolute',left:12,right:12,bottom:10,minHeight:52,paddingHorizontal:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:2,borderColor:C.black,backgroundColor:C.white},mapTime:{fontSize:19,fontWeight:'900'},mapCopy:{fontSize:7,fontWeight:'800'},
  state:{marginTop:15,padding:15,borderWidth:2,borderColor:C.black,backgroundColor:C.black},stateKicker:{color:C.mint,fontSize:8,fontWeight:'900'},stateTitle:{marginTop:10,color:C.white,fontSize:28,fontWeight:'900'},stateCopy:{marginTop:5,color:'#C9C4BB',fontSize:9},progress:{height:13,marginTop:14,borderWidth:2,borderColor:C.white,backgroundColor:C.white},progressFill:{height:'100%',backgroundColor:C.yellow},
  riderCard:{minHeight:92,marginTop:14,padding:10,flexDirection:'row',alignItems:'center',gap:9,borderWidth:2,borderColor:C.black,backgroundColor:C.white},avatar:{width:54,height:54,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,borderRadius:27,backgroundColor:C.yellow},avatarText:{fontSize:18,fontWeight:'900'},riderLabel:{fontSize:6,fontWeight:'900'},riderName:{marginTop:3,fontSize:14,fontWeight:'900'},riderMeta:{marginTop:3,color:C.gray,fontSize:7},round:{width:40,height:40,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,borderRadius:20,backgroundColor:C.mint},
  section:{marginTop:25,marginBottom:9,fontSize:17,fontWeight:'900'},timeline:{minHeight:70,padding:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderBottomWidth:0,borderColor:C.black,backgroundColor:C.white,opacity:.45},timelineDone:{opacity:1},timelineDot:{width:34,height:34,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,borderRadius:17,backgroundColor:C.white},timelineDotDone:{backgroundColor:C.black},timelineTitle:{fontSize:9,fontWeight:'900'},timelineCopy:{marginTop:4,color:C.gray,fontSize:7},timelineTime:{fontSize:6,fontWeight:'900'},
  route:{marginVertical:18,padding:14,borderWidth:2,borderColor:C.black,backgroundColor:C.mint},routeLabel:{fontSize:7,fontWeight:'900'},routeTitle:{marginTop:8,fontSize:10,fontWeight:'900'},routeArrow:{marginVertical:4,fontSize:18,fontWeight:'900'},routeContent:{marginTop:12,paddingTop:10,borderTopWidth:1,borderColor:C.black,fontSize:8},
  cancel:{minHeight:47,marginTop:12,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.red,backgroundColor:C.white},cancelText:{color:C.red,fontSize:8,fontWeight:'900'},issue:{minHeight:68,marginTop:12,padding:11,borderWidth:2,borderColor:C.black,backgroundColor:C.white},issueTitle:{fontSize:8,fontWeight:'900'},issueAction:{marginTop:7,color:C.red,fontSize:8,fontWeight:'900'},disclaimer:{marginTop:12,color:C.gray,fontSize:7,textAlign:'center'},empty:{flex:1,padding:30,justifyContent:'center',gap:20,backgroundColor:C.paper},emptyTitle:{fontSize:43,lineHeight:36,fontWeight:'900'},
})
