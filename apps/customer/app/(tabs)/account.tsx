import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useApp } from '@/context/AppContext'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { C, shadow } from '@/theme'
import { profileDisplayName, profileInitials, referralCode } from '@/utils/profile'

const rows=[
  ['person-outline','Mi perfil','Nombre, correo y teléfono','/profile','yellow'],
  ['receipt-outline','Mis pedidos','Historial, detalles y calificaciones','/(tabs)/orders','mint'],
  ['heart-outline','Favoritos','Comercios guardados','/favorites','red'],
  ['location-outline','Direcciones','Casa, trabajo y otros lugares','/addresses','blue'],
  ['card-outline','Métodos de pago','Tarjetas, billetera y efectivo','/payments','yellow'],
  ['notifications-outline','Notificaciones','Pedidos, promociones y seguridad','/notifications','mint'],
  ['gift-outline','Invita y gana','Código y recompensas demo','/referrals','red'],
  ['help-circle-outline','Ayuda y soporte','Chat y centro de resolución','/support','blue'],
  ['shield-checkmark-outline','Seguridad','Biometría, sesiones y verificación','/security','mint'],
  ['settings-outline','Configuración','Privacidad y preferencias','/settings','yellow'],
] as const

export default function Account(){
  const router=useRouter();const{address,unreadNotices,role,profile}=useApp()
  const initials=profileInitials(profile.name);const displayName=profileDisplayName(profile.name);const code=referralCode(profile)
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.profile}><ProfileAvatar photoUri={profile.photoUri} initials={initials} size={78}/><View style={{flex:1}}><Text style={styles.kicker}>MI CUENTA · {role.toUpperCase()}</Text><Text numberOfLines={2} adjustsFontSizeToFit style={styles.name}>{displayName}.</Text><Text numberOfLines={1} style={styles.member}>{profile.email}</Text></View><Pressable onPress={()=>router.push('/settings')} style={styles.switch}><Ionicons name="settings-outline" size={20}/></Pressable></View>
    <Pressable style={styles.invite} onPress={()=>router.push('/referrals')}><Text style={styles.inviteTitle}>INVITA. AMBOS GANAN.</Text><Text style={styles.inviteCopy}>Código demo: {code}</Text><Text style={styles.inviteArrow}>→</Text></Pressable>
    <Pressable style={styles.address} onPress={()=>router.push('/addresses')}><Ionicons name="home" size={22}/><View style={{flex:1}}><Text style={styles.addrLabel}>DIRECCIÓN PRINCIPAL</Text><Text numberOfLines={2} style={styles.addrText}>{address}</Text></View><Ionicons name="chevron-forward" size={20}/></Pressable>
    <View style={styles.rows}>{rows.map(([icon,title,copy,path,color])=><Pressable key={title} onPress={()=>router.push(path as never)} style={styles.row}><View style={[styles.rowIcon,{backgroundColor:color==='yellow'?C.yellow:color==='mint'?C.mint:color==='red'?C.red:C.blue}]}><Ionicons name={icon} size={20} color={color==='red'||color==='blue'?C.white:C.black}/></View><View style={{flex:1}}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowCopy}>{copy}</Text></View>{title==='Notificaciones'&&unreadNotices>0&&<View style={styles.badge}><Text style={styles.badgeText}>{unreadNotices}</Text></View>}<Ionicons name="arrow-forward" size={18}/></Pressable>)}</View>
    <Pressable onPress={()=>Alert.alert('DELIVER ASSETS','App Cliente v2.8 · chat por pedido, fotografías y boleta compartida.')} style={styles.version}><Text style={styles.versionTitle}>DELIVER ASSETS APP</Text><Text style={styles.versionText}>V2.8.0 · ANDROID DEVELOPMENT BUILD</Text></Pressable>
  </ScrollView></SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:110},profile:{minHeight:190,padding:17,flexDirection:'row',gap:14,alignItems:'center',borderWidth:2,borderColor:C.black,backgroundColor:C.yellow,...shadow},avatar:{width:78,height:78,borderWidth:3,borderColor:C.black,borderRadius:39,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},avatarText:{color:C.white,fontSize:27,fontWeight:'900'},kicker:{fontSize:7,fontWeight:'900',letterSpacing:.8},name:{marginTop:8,fontSize:32,lineHeight:27,fontWeight:'900',letterSpacing:-1.7},member:{marginTop:8,fontSize:8},switch:{position:'absolute',right:10,top:10,width:41,height:41,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.black,backgroundColor:C.white},invite:{marginTop:18,minHeight:100,padding:15,borderWidth:2,borderColor:C.black,backgroundColor:C.blue,overflow:'hidden'},inviteTitle:{color:C.white,fontSize:23,fontWeight:'900'},inviteCopy:{marginTop:7,color:C.yellow,fontSize:9,fontWeight:'800'},inviteArrow:{position:'absolute',right:14,bottom:4,color:'rgba(255,255,255,.25)',fontSize:70,fontWeight:'900'},address:{minHeight:76,marginTop:18,padding:12,flexDirection:'row',alignItems:'center',gap:11,borderWidth:2,borderColor:C.black,backgroundColor:C.white},addrLabel:{fontSize:7,fontWeight:'900'},addrText:{marginTop:4,fontSize:10,fontWeight:'700'},rows:{marginTop:15,borderBottomWidth:2,borderColor:C.black},row:{minHeight:70,padding:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderBottomWidth:0,borderColor:C.black,backgroundColor:C.white},rowIcon:{width:43,height:43,borderWidth:2,borderColor:C.black,alignItems:'center',justifyContent:'center'},rowTitle:{fontSize:11,fontWeight:'900'},rowCopy:{marginTop:3,color:C.gray,fontSize:8},badge:{minWidth:23,height:23,paddingHorizontal:5,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.black,borderRadius:12,backgroundColor:C.red},badgeText:{color:C.white,fontSize:7,fontWeight:'900'},version:{marginTop:19,padding:13,borderWidth:2,borderColor:C.black,backgroundColor:C.black},versionTitle:{color:C.yellow,fontSize:9,fontWeight:'900'},versionText:{marginTop:4,color:C.white,fontSize:7}})
