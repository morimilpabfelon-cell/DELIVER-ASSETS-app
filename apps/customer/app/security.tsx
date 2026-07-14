import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { Button, Header, ToggleRow } from '@/components/UI'
import { C } from '@/theme'

export default function Security() {
  const router = useRouter()
  const { settings, toggleSetting, profile, desktopSessionActive, closeDesktopSession } = useApp()
  const score = Math.min(100, 68 + (settings.securityAlerts ? 16 : 0) + (settings.biometric ? 16 : 0))
  const closeDesktop = () => Alert.alert(
    'Cerrar sesión de Windows',
    'La sesión secundaria desaparecerá de todos los apartados y el cambio quedará guardado.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', style: 'destructive', onPress: closeDesktopSession }],
  )

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="SEGURIDAD" kicker="CUENTA Y SESIONES" onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.score}>
        <View style={styles.scoreRing}><Text style={styles.scoreValue}>{score}</Text><Text style={styles.scoreUnit}>/100</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.scoreTitle}>{score === 100 ? 'PROTECCIÓN COMPLETA' : 'PROTECCIÓN ALTA'}</Text><Text style={styles.scoreCopy}>El puntaje responde a tus preferencias reales. Activa biometría y alertas para completar el esquema demo.</Text></View>
      </View>
      <View style={styles.group}>
        <ToggleRow title="Acceso biométrico" copy="Huella o rostro en dispositivos compatibles." value={settings.biometric} onPress={() => toggleSetting('biometric')} color="blue"/>
        <ToggleRow title="Alertas de seguridad" copy="Avisos por nuevos dispositivos o cambios sensibles." value={settings.securityAlerts} onPress={() => toggleSetting('securityAlerts')} color="mint"/>
        <View style={styles.last}><Text style={styles.lastText}>CONTROLES DE LA CUENTA</Text></View>
      </View>

      <Text style={styles.section}>SESIONES ACTIVAS</Text>
      <View style={styles.session}><View style={styles.device}><Ionicons name="phone-portrait" size={23}/></View><View style={{ flex: 1 }}><Text style={styles.sessionTitle}>Android · Xiaomi 23090RA98G</Text><Text style={styles.sessionCopy}>Lima, Perú · sesión actual · ahora</Text></View><Text style={styles.current}>ACTUAL</Text></View>
      {desktopSessionActive ? <View style={styles.session}><View style={[styles.device,{backgroundColor:C.yellow}]}><Ionicons name="desktop" size={23}/></View><View style={{ flex: 1 }}><Text style={styles.sessionTitle}>Chrome · Windows 10</Text><Text style={styles.sessionCopy}>Lima, Perú · hace 3 días</Text></View><Pressable onPress={closeDesktop}><Text style={styles.close}>CERRAR</Text></Pressable></View> : <View style={styles.closed}><Ionicons name="checkmark-circle" size={21}/><Text style={styles.closedText}>La sesión secundaria fue cerrada y el cambio quedó guardado.</Text></View>}

      <Text style={styles.section}>VERIFICACIÓN</Text>
      <View style={styles.check}><Ionicons name="checkmark-circle" size={23} color="#087457"/><View style={{ flex: 1 }}><Text style={styles.checkTitle}>CORREO VERIFICADO</Text><Text style={styles.checkCopy}>{profile.email}</Text></View></View>
      <View style={styles.check}><Ionicons name="checkmark-circle" size={23} color="#087457"/><View style={{ flex: 1 }}><Text style={styles.checkTitle}>TELÉFONO VERIFICADO</Text><Text style={styles.checkCopy}>{profile.phone}</Text></View></View>
      <Button label="CAMBIAR CONTRASEÑA" onPress={() => Alert.alert('Flujo simulado','Se enviaría un enlace seguro para cambiar la contraseña.')} color="black" icon="key-outline"/>
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:35},score:{minHeight:160,padding:15,flexDirection:'row',alignItems:'center',gap:14,borderWidth:2,borderColor:C.black,backgroundColor:C.blue},scoreRing:{width:95,height:95,alignItems:'center',justifyContent:'center',borderWidth:6,borderColor:C.yellow,borderRadius:48},scoreValue:{color:C.white,fontSize:30,fontWeight:'900'},scoreUnit:{color:C.white,fontSize:8,fontWeight:'900'},scoreTitle:{color:C.yellow,fontSize:22,fontWeight:'900'},scoreCopy:{marginTop:7,color:C.white,fontSize:8,lineHeight:12},group:{marginTop:18,borderBottomWidth:2,borderColor:C.black},last:{minHeight:35,paddingHorizontal:12,justifyContent:'center',borderWidth:2,borderTopWidth:0,borderColor:C.black,backgroundColor:C.black},lastText:{color:C.white,fontSize:7,fontWeight:'900'},section:{marginTop:26,marginBottom:10,fontSize:19,fontWeight:'900'},session:{minHeight:78,padding:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderBottomWidth:0,borderColor:C.black,backgroundColor:C.white},device:{width:47,height:47,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,backgroundColor:C.mint},sessionTitle:{fontSize:10,fontWeight:'900'},sessionCopy:{marginTop:4,color:C.gray,fontSize:8},current:{paddingHorizontal:7,paddingVertical:4,backgroundColor:C.mint,fontSize:6,fontWeight:'900'},close:{paddingHorizontal:7,paddingVertical:7,fontSize:7,fontWeight:'900',color:C.red},closed:{minHeight:60,padding:11,flexDirection:'row',alignItems:'center',gap:9,borderWidth:2,borderColor:C.black,backgroundColor:C.mint},closedText:{flex:1,fontSize:8,fontWeight:'800',lineHeight:12},check:{minHeight:64,padding:11,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderBottomWidth:0,borderColor:C.black,backgroundColor:C.white},checkTitle:{fontSize:9,fontWeight:'900'},checkCopy:{marginTop:4,color:C.gray,fontSize:8}})
