import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { RiderOffer } from '@/data/system'
import { C, shadow } from '@/theme'

type Props = {
  online: boolean
  offer: RiderOffer | null
  routeStage: number
}

type Point = { x: number; y: number }

const normalizedPoints: Point[] = [
  { x: .10, y: .75 },
  { x: .27, y: .55 },
  { x: .44, y: .64 },
  { x: .63, y: .34 },
  { x: .86, y: .20 },
]
const progressByStage = [0.05, 0.25, 0.70, 0.98]
const stageLabels = ['RUMBO AL RECOJO', 'PAQUETE CONFIRMADO', 'RUMBO AL DESTINO', 'ENTREGA EN PUNTO B']

export function RiderRouteMap({ online, offer, routeStage }: Props) {
  const [size, setSize] = useState({ width: 340, height: 310 })
  const [reduceMotion, setReduceMotion] = useState(false)
  const progress = useRef(new Animated.Value(offer ? progressByStage[routeStage] : .45)).current
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0)
      return
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    animation.start()
    return () => animation.stop()
  }, [pulse, reduceMotion])

  useEffect(() => {
    progress.stopAnimation()
    if (reduceMotion) {
      progress.setValue(offer ? progressByStage[Math.max(0, Math.min(3, routeStage))] : .45)
      return
    }
    if (offer) {
      Animated.timing(progress, {
        toValue: progressByStage[Math.max(0, Math.min(3, routeStage))],
        duration: 1250,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start()
      return
    }
    if (online) {
      progress.setValue(0.08)
      const roaming = Animated.loop(Animated.sequence([
        Animated.timing(progress, { toValue: .92, duration: 5600, easing: Easing.inOut(Easing.linear), useNativeDriver: true }),
        Animated.timing(progress, { toValue: .08, duration: 5600, easing: Easing.inOut(Easing.linear), useNativeDriver: true }),
      ]))
      roaming.start()
      return () => roaming.stop()
    }
    Animated.timing(progress, { toValue: .45, duration: 500, useNativeDriver: true }).start()
  }, [offer, online, progress, reduceMotion, routeStage])

  const points = useMemo(() => normalizedPoints.map((point) => ({ x: point.x * size.width, y: point.y * size.height })), [size])
  const inputRange = [0, .25, .5, .75, 1]
  const translateX = progress.interpolate({ inputRange, outputRange: points.map((point) => point.x - 25) })
  const translateY = progress.interpolate({ inputRange, outputRange: points.map((point) => point.y - 25) })
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    if (width > 0 && height > 0) setSize({ width, height })
  }

  return <View style={styles.map} onLayout={onLayout}>
    <View style={styles.grid}/>
    <View style={styles.heatA}/><View style={styles.heatB}/>
    {points.slice(0, -1).map((point, index) => {
      const next = points[index + 1]
      const distance = Math.hypot(next.x - point.x, next.y - point.y)
      const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI
      return <View key={index} style={[styles.segment, {
        left: (point.x + next.x) / 2 - distance / 2,
        top: (point.y + next.y) / 2 - 5,
        width: distance,
        transform: [{ rotate: `${angle}deg` }],
      }]}/>
    })}
    {points.map((point, index) => <View key={`dot-${index}`} style={[styles.routeDot, { left: point.x - 5, top: point.y - 5 }]}/>) }

    <View style={[styles.marker, styles.markerA, { left: points[0].x - 24, top: points[0].y - 24 }]}><Text style={styles.markerText}>A</Text></View>
    <View style={[styles.marker, styles.markerB, { left: points[4].x - 24, top: points[4].y - 24 }]}><Text style={[styles.markerText,{color:C.white}]}>B</Text></View>
    <View style={[styles.pointLabel, { left: 9, bottom: 12 }]}><Text style={styles.pointKicker}>PUNTO A · RECOJO</Text><Text numberOfLines={1} style={styles.pointName}>{offer?.pickup ?? 'ZONA DE DEMANDA'}</Text></View>
    <View style={[styles.pointLabel, styles.pointLabelB, { right: 9, top: 78 }]}><Text style={[styles.pointKicker,{color:C.white}]}>PUNTO B · DESTINO</Text><Text numberOfLines={1} style={[styles.pointName,{color:C.white}]}>{offer?.dropoff ?? 'PRÓXIMA OPORTUNIDAD'}</Text></View>

    <Animated.View style={[styles.riderPulse, { transform: [{ translateX }, { translateY }, { scale }] }]}>
      <View style={styles.rider}><Ionicons name="bicycle" size={27} color={C.white}/></View>
    </Animated.View>

    <View style={styles.statusBadge}><View style={[styles.statusDot,{backgroundColor:online?C.mint:C.red}]}/><Text style={styles.statusText}>{offer ? stageLabels[routeStage] : online ? 'BUSCANDO RUTAS CERCANAS' : 'MAPA EN PAUSA'}</Text></View>
    {offer && <View style={styles.progressBadge}><Text style={styles.progressValue}>{Math.round(progressByStage[routeStage] * 100)}%</Text><Text style={styles.progressCopy}>RUTA DEMO</Text></View>}
  </View>
}

const styles = StyleSheet.create({
  map:{height:330,borderWidth:3,borderColor:C.black,backgroundColor:C.blue,overflow:'hidden',...shadow},
  grid:{position:'absolute',inset:0,opacity:.1,backgroundColor:C.white},
  heatA:{position:'absolute',left:-15,top:90,width:150,height:150,borderRadius:75,backgroundColor:'rgba(255,198,47,.32)'},
  heatB:{position:'absolute',right:-25,top:5,width:170,height:150,borderRadius:85,backgroundColor:'rgba(229,55,32,.35)'},
  segment:{position:'absolute',height:10,borderWidth:2,borderColor:C.black,borderRadius:5,backgroundColor:C.paper},
  routeDot:{position:'absolute',width:10,height:10,borderWidth:2,borderColor:C.black,borderRadius:5,backgroundColor:C.yellow},
  marker:{position:'absolute',zIndex:4,width:48,height:48,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.black,borderRadius:24},
  markerA:{backgroundColor:C.yellow},markerB:{backgroundColor:C.red},markerText:{fontSize:19,fontWeight:'900'},
  riderPulse:{position:'absolute',zIndex:7,left:0,top:0,width:50,height:50},
  rider:{width:50,height:50,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.white,borderRadius:25,backgroundColor:C.black},
  pointLabel:{position:'absolute',zIndex:5,maxWidth:150,paddingHorizontal:8,paddingVertical:6,borderWidth:2,borderColor:C.black,backgroundColor:C.yellow},
  pointLabelB:{backgroundColor:C.black},pointKicker:{fontSize:5,fontWeight:'900',letterSpacing:.5},pointName:{marginTop:2,fontSize:7,fontWeight:'900'},
  statusBadge:{position:'absolute',zIndex:6,left:10,top:10,minHeight:31,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:6,borderWidth:2,borderColor:C.black,backgroundColor:C.white},
  statusDot:{width:8,height:8,borderWidth:1,borderColor:C.black,borderRadius:4},statusText:{fontSize:6,fontWeight:'900'},
  progressBadge:{position:'absolute',zIndex:6,right:10,bottom:11,minWidth:70,paddingHorizontal:8,paddingVertical:6,borderWidth:2,borderColor:C.black,backgroundColor:C.mint,alignItems:'center'},
  progressValue:{fontSize:15,fontWeight:'900'},progressCopy:{fontSize:5,fontWeight:'900'},
})
