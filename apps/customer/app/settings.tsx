import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useApp } from '@/context/AppContext'
import { Button, Header, ListRow, ToggleRow } from '@/components/UI'
import { C } from '@/theme'

export default function Settings() {
  const router = useRouter(); const { settings, toggleSetting, logout } = useApp()
  const leave = () => Alert.alert('Cerrar sesión','La sesión demo volverá a DELIVER ID.',[{text:'Cancelar',style:'cancel'},{text:'Cerrar',style:'destructive',onPress:()=>{logout();router.replace('/auth')}}])
  return <SafeAreaView style={styles.safe} edges={['top','bottom']}><Header title="AJUSTES" kicker="PREFERENCIAS" onBack={() => router.back()}/><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.section}>NOTIFICACIONES</Text><View style={styles.group}><ToggleRow title="Actualizaciones de pedidos" copy="Preparación, ruta y entrega." value={settings.orderUpdates} onPress={()=>toggleSetting('orderUpdates')}/><ToggleRow title="Promociones" copy="Beneficios separados por categoría." value={settings.promotions} onPress={()=>toggleSetting('promotions')} color="yellow"/><ToggleRow title="Alertas de seguridad" copy="Sesiones y cambios sensibles." value={settings.securityAlerts} onPress={()=>toggleSetting('securityAlerts')} color="blue"/><View style={styles.groupEnd}/></View>
    <Text style={styles.section}>PRIVACIDAD Y EXPERIENCIA</Text><View style={styles.group}><ToggleRow title="Ubicación mientras uso la app" copy="Necesaria para cobertura y seguimiento." value={settings.locationWhileUsing} onPress={()=>toggleSetting('locationWhileUsing')} color="red"/><ToggleRow title="Preferencia de tema oscuro" copy="La elección se guarda; el tema visual completo aún está en preparación." value={settings.darkMode} onPress={()=>toggleSetting('darkMode')} color="blue"/><View style={styles.groupEnd}/></View>
    <Text style={styles.section}>INFORMACIÓN</Text><View style={styles.links}><ListRow icon="pulse-outline" title="Centro de resistencia" copy="Red simulada, colas, ciclo de vida y diagnóstico." onPress={()=>router.push('/resilience-center')} color="red"/><ListRow icon="server-outline" title="Datos y sincronización" copy="Estado local y sincronización con las cuatro aplicaciones." onPress={()=>router.push('/data-center')} color="blue"/><ListRow icon="shield-checkmark-outline" title="Seguridad" copy="Biometría, sesiones y verificación." onPress={()=>router.push('/security')} color="mint"/><ListRow icon="document-text-outline" title="Términos y privacidad" copy="Documentos conceptuales para revisión legal." onPress={()=>Alert.alert('Documentos conceptuales','La versión comercial requerirá textos legales revisados.')} color="yellow"/><ListRow icon="information-circle-outline" title="Acerca de DELIVER ASSETS" copy="App Cliente v2.8 · coordinación y boleta por pedido." onPress={()=>Alert.alert('DELIVER ASSETS','Versión Cliente 2.8.0 · incorpora chat por pedido, fotografías, boleta e historial de coordinación.')} color="blue"/><View style={styles.groupEnd}/></View>
    <Button label="CERRAR SESIÓN" onPress={leave} color="red" icon="log-out-outline"/>
  </ScrollView></SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:35},section:{marginTop:8,marginBottom:10,fontSize:17,fontWeight:'900'},group:{marginBottom:24},groupEnd:{height:2,backgroundColor:C.black},links:{marginBottom:24}})
