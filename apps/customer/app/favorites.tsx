import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { stores, categoryByKey, templateForStore } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { CustomerBusinessCover, CustomerBusinessLogo } from '@/components/CustomerBusinessMedia'
import { EmptyState, Header } from '@/components/UI'
import { C } from '@/theme'

export default function Favorites() {
  const router = useRouter()
  const { favorites, toggleFavorite, getStorePublicProfile, getStoreProducts } = useApp()
  const list = stores.filter((store) => favorites.includes(store.id))

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="FAVORITOS" kicker="COMERCIOS GUARDADOS" onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content}>
      {list.length === 0
        ? <EmptyState icon="heart-outline" title="SIN FAVORITOS." copy="Guarda comercios para encontrarlos rápidamente." action="EXPLORAR" onPress={() => router.replace('/(tabs)')}/>
        : list.map((store) => {
            const profile = getStorePublicProfile(store.id)
            const products = getStoreProducts(store.id)
            const template = templateForStore(store)
            return <Pressable key={store.id} onPress={() => router.push({ pathname: '/store/[id]', params: { id: String(store.id) } })} style={styles.card}>
              <CustomerBusinessCover profile={profile} store={store} style={styles.art}>
                <CustomerBusinessLogo profile={profile} store={store} size={58}/>
                <Text style={styles.category}>{categoryByKey(store.category).label.toUpperCase()} · {template.label.toUpperCase()}</Text>
              </CustomerBusinessCover>
              <View style={styles.body}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{profile.name.toUpperCase()}</Text>
                  <Text style={styles.desc}>{profile.descriptor || store.descriptor}</Text>
                  <Text style={styles.meta}>{store.eta} · ★ {store.rating} · {products.length} publicados</Text>
                </View>
                <Pressable accessibilityLabel={`Quitar ${profile.name} de favoritos`} onPress={() => toggleFavorite(store.id)} style={styles.heart}><Ionicons name="heart" size={20} color={C.red}/></Pressable>
              </View>
            </Pressable>
          })}
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 35 },
  card: { marginBottom: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  art: { height: 118, padding: 12, justifyContent: 'flex-end' },
  category: { position: 'absolute', right: 9, top: 9, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: C.black, backgroundColor: C.white, fontSize: 6, fontWeight: '900', zIndex: 3 },
  body: { minHeight: 80, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 18, fontWeight: '900' },
  desc: { marginTop: 3, color: C.gray, fontSize: 8 },
  meta: { marginTop: 6, fontSize: 8, fontWeight: '800' },
  heart: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
})
