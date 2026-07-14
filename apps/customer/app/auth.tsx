import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { AppRole, roleProfiles } from '@/data/system'
import { Button, Header, Kicker } from '@/components/UI'
import { C, tone } from '@/theme'

type Stage = 'login' | 'verify'
const APP_ROLE: AppRole = 'cliente'
const APP_HOME = '/(tabs)' as const

export default function Auth() {
  const router = useRouter()
  const { authenticate, profile, adminEnhancedVerification } = useApp()
  const [stage, setStage] = useState<Stage>('login')
  const roleProfile = roleProfiles[APP_ROLE]
  const [email, setEmail] = useState(APP_ROLE === 'cliente' ? profile.email : `${APP_ROLE}@deliverassets.demo`)
  const [password, setPassword] = useState('deliver-demo')
  const [code, setCode] = useState('4821')

  const finish = (guest = false) => {
    if (!guest && adminEnhancedVerification && code !== '4821') {
      Alert.alert('Código inválido', 'La verificación reforzada exige el código demo 4821.')
      return
    }
    authenticate(APP_ROLE, guest)
    router.replace(APP_ROLE === 'cliente' ? '/location' : APP_HOME)
  }

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="DELIVER ID" kicker="ACCESO EXCLUSIVO · CLIENTE" onBack={stage === 'verify' ? () => setStage('login') : undefined}/>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.identity, { backgroundColor: tone(roleProfile.tone) }]}>
          <View style={styles.symbol}><Text style={styles.symbolText}>{roleProfile.symbol}</Text></View>
          <View style={{ flex: 1 }}><Kicker>APLICACIÓN INDEPENDIENTE</Kicker><Text style={styles.identityTitle}>{roleProfile.title.toUpperCase()}</Text><Text style={styles.identityCopy}>{roleProfile.description}</Text></View>
        </View>

        {stage === 'login' ? <>
          <Kicker>PASO 01 / ACCESO</Kicker><Text style={styles.title}>ENTRA A TU{`\n`}ESPACIO.</Text>
          <Text style={styles.intro}>Esta aplicación contiene únicamente las herramientas de {roleProfile.title.toLowerCase()}. No introduzcas credenciales reales en el prototipo.</Text>
          <Text style={styles.label}>CORREO</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input}/>
          <Text style={styles.label}>CONTRASEÑA</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input}/>
          <Pressable onPress={() => Alert.alert('Recuperación demo', `Se enviaría un enlace seguro a ${email}. No se transmitió ningún correo real.`)}><Text style={styles.forgot}>RECUPERAR CONTRASEÑA →</Text></Pressable>
          <Button label="CONTINUAR" onPress={() => setStage('verify')} color={roleProfile.tone} icon="arrow-forward"/>
          {APP_ROLE === 'cliente' && <Pressable style={styles.guest} onPress={() => finish(true)}><Ionicons name="person-outline" size={21}/><View style={{ flex: 1 }}><Text style={styles.guestTitle}>CONTINUAR COMO INVITADO</Text><Text style={styles.guestCopy}>Sesión temporal de compras y seguimiento.</Text></View><Text style={styles.arrow}>→</Text></Pressable>}
        </> : <>
          <View style={[styles.verify, { backgroundColor: tone(roleProfile.tone) }]}><Text style={styles.verifyText}>{roleProfile.symbol}</Text></View>
          <Kicker>PASO 02 / VERIFICACIÓN</Kicker><Text style={styles.title}>CONFIRMA{`\n`}TU IDENTIDAD.</Text>
          <Text style={styles.intro}>Código demo enviado a {email}. La autenticación real llegará con el backend de DELIVER ID.</Text>
          <Text style={styles.label}>CÓDIGO DE 4 DÍGITOS</Text><TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g,'').slice(0,4))} keyboardType="number-pad" maxLength={4} style={styles.code}/>
          <View style={styles.demo}><Ionicons name="information-circle" size={19}/><Text style={styles.demoText}>Código de demostración: 4821</Text></View>
          <Button label="ENTRAR" onPress={() => finish(false)} disabled={code.length !== 4 || (adminEnhancedVerification && code !== '4821')} color={roleProfile.tone}/>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:40},identity:{minHeight:150,padding:14,marginBottom:28,flexDirection:'row',alignItems:'center',gap:13,borderWidth:2,borderColor:C.black},symbol:{width:68,height:68,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,backgroundColor:C.white},symbolText:{fontSize:27,fontWeight:'900'},identityTitle:{marginTop:6,fontSize:29,fontWeight:'900'},identityCopy:{marginTop:4,fontSize:8,lineHeight:12},title:{marginTop:10,fontSize:47,lineHeight:41,fontWeight:'900',letterSpacing:-2.3},intro:{maxWidth:340,marginTop:13,marginBottom:18,color:C.gray,fontSize:10,lineHeight:15},label:{marginTop:13,marginBottom:6,fontSize:8,fontWeight:'900',letterSpacing:.8},input:{minHeight:51,paddingHorizontal:12,borderWidth:2,borderColor:C.black,backgroundColor:C.white,fontSize:11,fontWeight:'700'},forgot:{marginVertical:14,fontSize:8,fontWeight:'900'},guest:{minHeight:70,marginTop:12,padding:12,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderColor:C.black,backgroundColor:C.white},guestTitle:{fontSize:9,fontWeight:'900'},guestCopy:{marginTop:3,color:C.gray,fontSize:8},arrow:{fontSize:22,fontWeight:'900'},verify:{width:130,height:130,marginBottom:24,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.black,borderRadius:65},verifyText:{fontSize:50,fontWeight:'900'},code:{minHeight:67,paddingHorizontal:14,borderWidth:3,borderColor:C.black,backgroundColor:C.white,fontSize:34,fontWeight:'900',letterSpacing:17,textAlign:'center'},demo:{minHeight:47,marginTop:10,marginBottom:18,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:8,borderWidth:2,borderColor:C.black,backgroundColor:C.yellow},demoText:{fontSize:8,fontWeight:'900'}
})
