import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { BrandLogo } from '@/components/BrandLogo'
import { useApp } from '@/context/AppContext'
import { AppRole } from '@/data/system'
import { C } from '@/theme'

const APP_ROLE: AppRole = 'repartidor'
const APP_HOME = '/rider' as const

export default function Splash() {
  const router = useRouter()
  const { hydrated, onboardingComplete, authenticated, role } = useApp()
  const scale = useRef(new Animated.Value(.75)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => { Animated.parallel([Animated.spring(scale,{toValue:1,useNativeDriver:true,friction:7}),Animated.timing(opacity,{toValue:1,duration:420,useNativeDriver:true})]).start() }, [opacity,scale])
  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => {
      if (APP_ROLE === 'cliente' && !onboardingComplete) return router.replace('/onboarding')
      if (!authenticated || role !== APP_ROLE) return router.replace('/auth')
      return router.replace(APP_HOME)
    }, 760)
    return () => clearTimeout(timer)
  }, [authenticated, hydrated, onboardingComplete, role, router])

  return <SafeAreaView style={styles.safe}><StatusBar style="light"/><View style={styles.lineA}/><Animated.View style={{opacity,transform:[{scale}]}}><BrandLogo/></Animated.View><Text style={styles.app}>DELIVER ASSETS RIDER</Text><Text style={styles.copy}>{hydrated?'ESPACIO REPARTIDOR LISTO':'RESTAURANDO DATOS…'}</Text><View style={styles.lineB}/></SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:C.black,alignItems:'center',justifyContent:'center'},app:{marginTop:22,color:C.yellow,fontSize:12,fontWeight:'900',letterSpacing:1.4},copy:{marginTop:8,color:C.white,fontSize:8,fontWeight:'800',letterSpacing:1.5},lineA:{position:'absolute',left:20,right:80,top:80,height:11,backgroundColor:C.blue,transform:[{rotate:'-8deg'}]},lineB:{position:'absolute',left:85,right:15,bottom:90,height:14,backgroundColor:C.red,transform:[{rotate:'10deg'}]}})
