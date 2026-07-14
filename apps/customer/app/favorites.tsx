import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { stores, categoryByKey } from '@/data/catalog'
import { useApp } from '@/context/AppContext'
import { EmptyState, Header } from '@/components/UI'
import { C, tone } from '@/theme'

export default function Favorites() {
  const router = useRouter(); const { favorites, toggleFavorite } = useApp(); const list = stores.filter((store) => favorites.includes(store.id))
  return <SafeAreaView style={styles.safe} edges={['top','bottom']}><Header title="FAVORITOS" kicker="COMERCIOS GUARDADOS" onBack={() => router.back()}/><ScrollView contentContainerStyle={styles.content}>
    {list.length === 0 ? <EmptyState icon="heart-outline" title="SIN FAVORITOS." copy="Guarda comercios para encontrarlos rápidamente." action="EXPLORAR" onPress={() => router.replace('/(tabs)')}/> : list.map((store) => <Pressable key={store.id} onPress={() => router.push({ pathname: '/store/[id]', params: { id: String(store.id) } })} style={styles.card}><View style={[styles.art, { backgroundColor: tone(store.tone) }]}><Text style={styles.symbol}>{store.symbol}</Text><Text style={styles.category}>{categoryByKey(store.category).label.toUpperCase()}</Text></View><View style={styles.body}><View style={{ flex: 1 }}><Text style={styles.name}>{store.name.toUpperCase()}</Text><Text style={styles.desc}>{store.descriptor}</Text><Text style={styles.meta}>{store.eta} · ★ {store.rating}</Text></View><Pressable onPress={() => toggleFavorite(store.id)} style={styles.heart}><Ionicons name="heart" size={20} color={C.red}/></Pressable></View></Pressable>)}
  </ScrollView></SafeAreaView>
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 35 }, card: { marginBottom: 12, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, art: { height: 105, padding: 12, overflow: 'hidden' }, symbol: { fontSize: 43, fontWeight: '900', letterSpacing: -2.5 }, category: { position: 'absolute', right: 9, top: 9, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: C.black, backgroundColor: C.white, fontSize: 6, fontWeight: '900' }, body: { minHeight: 80, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { fontSize: 18, fontWeight: '900' }, desc: { marginTop: 3, color: C.gray, fontSize: 8 }, meta: { marginTop: 6, fontSize: 8, fontWeight: '800' }, heart: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white } })
