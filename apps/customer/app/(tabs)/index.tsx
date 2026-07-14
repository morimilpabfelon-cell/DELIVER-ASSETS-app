import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { categories, CategoryKey, promos, stores } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { C, shadow, tone } from '@/theme'
import { Kicker } from '@/components/UI'
import { CartDock } from '@/components/CartDock'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { profileInitials } from '@/utils/profile'

export default function Home() {
  const router = useRouter()
  const { address, unreadNotices, profile } = useApp()
  const initials = profileInitials(profile.name)
  const [category, setCategory] = useState<CategoryKey>('comida')
  const current = categories.find((item) => item.key === category) ?? categories[0]
  const visible = useMemo(() => stores.filter((store) => store.category === category), [category])
  const suggested = visible[0]
  const currentPromo = promos.find((promo) => promo.category === category)
  const openSuggested = () => suggested && router.push({ pathname: '/store/[id]', params: { id: String(suggested.id) } })

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable style={styles.location} onPress={() => router.push('/location')}>
          <Ionicons name="location" size={19}/><View style={{ flex: 1 }}><Text style={styles.locSmall}>ENTREGAR EN</Text><Text numberOfLines={1} style={styles.locText}>{address}</Text></View><Ionicons name="chevron-down" size={17}/>
        </Pressable>
        <Pressable style={styles.bell} onPress={() => router.push('/notifications')}><Ionicons name="notifications-outline" size={20}/>{unreadNotices > 0 && <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unreadNotices}</Text></View>}</Pressable>
        <Pressable onPress={() => router.push('/(tabs)/account')}><ProfileAvatar photoUri={profile.photoUri} initials={initials} size={50}/></Pressable>
      </View>

      <Pressable style={styles.search} onPress={() => router.push({ pathname: '/(tabs)/search', params: { category } })}>
        <Ionicons name="search" size={20}/><Text style={styles.searchText}>{current.searchPlaceholder}</Text>
      </Pressable>

      <View style={[styles.hero, { backgroundColor: tone(current.tone) }]}>
        <View style={{ flex: 1, zIndex: 2 }}>
          <View style={styles.pureBadge}><Text style={styles.pureBadgeText}>SOLO {current.label.toUpperCase()}</Text></View>
          <Kicker>{current.tagline.toUpperCase()}</Kicker>
          <Text style={styles.heroTitle}>{current.heroTitle}</Text>
          <Pressable style={styles.heroButton} onPress={openSuggested}><Text style={styles.heroButtonText}>{category === 'envios' ? 'COTIZAR ENVÍO' : 'VER OPCIONES'}</Text><Text style={styles.heroArrow}>→</Text></Pressable>
        </View>
        <View style={styles.heroArt}><Text style={styles.heroSymbol}>{current.symbol}</Text><View style={styles.ringA}/><View style={styles.ringB}/></View>
      </View>

      <View style={styles.purityStrip}><Ionicons name="checkmark-circle" size={18}/><Text style={styles.purityText}>{current.purity}</Text></View>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>¿QUÉ NECESITAS?</Text><Text style={styles.sectionAction}>4 UNIVERSOS</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {categories.map((item) => <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.category, { backgroundColor: tone(item.tone) }, category === item.key && styles.categoryActive]}>
          <Text style={styles.catSymbol}>{item.symbol}</Text><Text style={styles.catName}>{item.label.toUpperCase()}</Text><Text style={styles.catCopy}>{item.tagline}</Text>
        </Pressable>)}
      </ScrollView>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{current.storeSection}</Text><Pressable onPress={() => router.push({ pathname: '/(tabs)/search', params: { category } })}><Text style={styles.sectionAction}>VER TODO →</Text></Pressable></View>
      {visible.map((store) => <Pressable key={store.id} onPress={() => router.push({ pathname: '/store/[id]', params: { id: String(store.id) } })} style={styles.store}>
        <View style={[styles.storeArt, { backgroundColor: tone(store.tone) }]}><Text style={styles.storeSymbol}>{store.symbol}</Text><Text style={styles.storeFeatured}>{store.featured}</Text><Text style={styles.storeCategory}>{current.label.toUpperCase()}</Text></View>
        <View style={styles.storeBody}><View style={{ flex: 1 }}><Text style={styles.storeName}>{store.name.toUpperCase()}</Text><Text style={styles.storeDesc}>{store.descriptor}</Text><View style={styles.meta}><Text style={styles.pill}>★ {store.rating}</Text><Text style={styles.metaText}>{store.eta}</Text>{category !== 'envios' && <Text style={styles.metaText}>S/ {store.delivery.toFixed(2)}</Text>}</View></View><Ionicons name="arrow-forward" size={22}/></View>
      </Pressable>)}

      {currentPromo && <View style={[styles.promo, { borderColor: tone(current.tone) }]}><Text style={[styles.promoCode, { color: tone(current.tone) }]}>{currentPromo.code}</Text><Text style={styles.promoTitle}>{currentPromo.title.toUpperCase()}.</Text><Text style={styles.promoCopy}>{currentPromo.detail} · promoción simulada</Text></View>}

    </ScrollView>
    <CartDock/>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:110},header:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12},location:{flex:1,minHeight:50,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9,borderWidth:2,borderColor:C.black,backgroundColor:C.white},locSmall:{fontSize:7,fontWeight:'900',letterSpacing:1},locText:{fontSize:10,fontWeight:'800'},bell:{width:50,height:50,borderWidth:2,borderColor:C.black,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},bellBadge:{position:'absolute',right:4,top:4,minWidth:17,height:17,paddingHorizontal:3,borderWidth:1,borderColor:C.black,borderRadius:9,backgroundColor:C.red,alignItems:'center',justifyContent:'center'},bellBadgeText:{color:C.white,fontSize:6,fontWeight:'900'},avatar:{width:50,height:50,borderWidth:2,borderColor:C.black,borderRadius:25,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},avatarText:{color:C.white,fontWeight:'900'},search:{minHeight:50,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:10,borderWidth:2,borderColor:C.black,backgroundColor:C.white,marginBottom:14},searchText:{color:C.gray,fontSize:11,fontWeight:'600'},hero:{minHeight:280,padding:18,flexDirection:'row',borderWidth:2,borderColor:C.black,overflow:'hidden',...shadow},pureBadge:{alignSelf:'flex-start',marginBottom:11,paddingHorizontal:8,paddingVertical:5,borderWidth:2,borderColor:C.black,backgroundColor:C.white},pureBadgeText:{fontSize:7,fontWeight:'900',letterSpacing:.8},heroTitle:{marginTop:14,fontSize:42,lineHeight:34,fontWeight:'900',letterSpacing:-2.3},heroButton:{minHeight:42,marginTop:20,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:2,borderColor:C.black,backgroundColor:C.black},heroButtonText:{color:C.white,fontSize:9,fontWeight:'900'},heroArrow:{color:C.white,fontSize:20},heroArt:{width:120,alignItems:'center',justifyContent:'center'},heroSymbol:{zIndex:3,fontSize:55,fontWeight:'900'},ringA:{position:'absolute',width:125,height:125,borderWidth:4,borderColor:C.black,borderRadius:63},ringB:{position:'absolute',width:150,height:50,borderWidth:4,borderColor:C.black,borderRadius:30,transform:[{rotate:'-25deg'}]},purityStrip:{minHeight:50,marginTop:13,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9,borderWidth:2,borderColor:C.black,backgroundColor:C.white},purityText:{flex:1,fontSize:9,fontWeight:'800',lineHeight:13},sectionHead:{marginTop:28,marginBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{fontSize:20,fontWeight:'900',letterSpacing:-1},sectionAction:{fontSize:8,fontWeight:'900',letterSpacing:.7},category:{width:140,minHeight:148,padding:13,borderWidth:2,borderColor:C.black},categoryActive:{...shadow},catSymbol:{fontSize:30,fontWeight:'900'},catName:{marginTop:'auto',fontSize:15,fontWeight:'900'},catCopy:{marginTop:4,fontSize:8,fontWeight:'600'},store:{marginBottom:12,borderWidth:2,borderColor:C.black,backgroundColor:C.white},storeArt:{height:120,padding:13,overflow:'hidden'},storeSymbol:{fontSize:50,fontWeight:'900',letterSpacing:-3},storeFeatured:{position:'absolute',left:13,bottom:10,fontSize:9,fontWeight:'900',letterSpacing:1},storeCategory:{position:'absolute',right:10,top:10,paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.black,backgroundColor:C.white,fontSize:7,fontWeight:'900'},storeBody:{padding:13,flexDirection:'row',alignItems:'center',gap:10},storeName:{fontSize:19,fontWeight:'900'},storeDesc:{marginTop:3,color:C.gray,fontSize:9},meta:{marginTop:8,flexDirection:'row',gap:7,alignItems:'center'},pill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,backgroundColor:C.mint,fontSize:8,fontWeight:'900'},metaText:{fontSize:8,fontWeight:'700'},promo:{marginTop:18,padding:18,borderWidth:3,backgroundColor:C.black},promoCode:{fontSize:39,fontWeight:'900',letterSpacing:-2},promoTitle:{marginTop:6,color:C.white,fontSize:18,fontWeight:'900'},promoCopy:{marginTop:5,color:'#B8B3AA',fontSize:8},cartFloat:{position:'absolute',left:16,right:16,bottom:18,minHeight:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:2,borderColor:C.black,backgroundColor:C.yellow,...shadow},cartSmall:{fontSize:7,fontWeight:'900'},cartText:{fontSize:15,fontWeight:'900'},cartArrow:{fontSize:25,fontWeight:'900'}
})
