import { useRef, useState } from 'react'
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useApp } from '@/context/AppContext'
import { C, tone } from '@/theme'
import type { Tone } from '@/theme'

const { width } = Dimensions.get('window')
const slides: { kicker: string; title: string; copy: string; symbol: string; tone: Tone }[] = [
  { kicker: 'UN ECOSISTEMA', title: 'TODO SE MUEVE.', copy: 'Compra, vende, entrega y supervisa desde una identidad visual común.', symbol: 'DA', tone: 'yellow' },
  { kicker: 'CUATRO UNIVERSOS', title: 'CADA COSA EN SU LUGAR.', copy: 'Comida es comida. Mercado es mercado. Farmacia es farmacia. Envíos son documentos y paquetes.', symbol: '4', tone: 'red' },
  { kicker: 'CONTROL COMPLETO', title: 'SIGUE CADA PASO.', copy: 'Pedidos, rutas, pagos, soporte y seguridad diseñados como una sola experiencia.', symbol: '→', tone: 'blue' },
]

export default function Onboarding() {
  const router = useRouter()
  const { completeOnboarding } = useApp()
  const [index, setIndex] = useState(0)
  const list = useRef<FlatList>(null)
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => setIndex(viewableItems[0]?.index ?? 0)).current
  const next = () => {
    if (index === slides.length - 1) { completeOnboarding(); router.replace('/auth') }
    else list.current?.scrollToIndex({ index: index + 1, animated: true })
  }
  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <View style={styles.top}><Text style={styles.brand}>DELIVER <Text style={{ color: C.red }}>ASSETS</Text></Text><Pressable onPress={() => { completeOnboarding(); router.replace('/auth') }}><Text style={styles.skip}>SALTAR</Text></Pressable></View>
    <FlatList ref={list} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.title} onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={{ itemVisiblePercentThreshold: 70 }} renderItem={({ item, index: slideIndex }) => <View style={[styles.slide, { width }]}>
      <View style={[styles.art, { backgroundColor: tone(item.tone) }]}><View style={styles.artLineA}/><View style={styles.artLineB}/><Text style={styles.artSymbol}>{item.symbol}</Text><Text style={styles.artIndex}>0{slideIndex + 1}</Text></View>
      <View style={styles.copy}><Text style={styles.kicker}>{item.kicker}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.copy}</Text></View>
    </View>}/>
    <View style={styles.bottom}><View style={styles.dots}>{slides.map((_, dot) => <View key={dot} style={[styles.dot, dot === index && styles.dotActive]}/>)}</View><Pressable style={styles.next} onPress={next}><Text style={styles.nextText}>{index === slides.length - 1 ? 'ABRIR DELIVER ID' : 'SIGUIENTE'}</Text><Text style={styles.nextArrow}>→</Text></Pressable></View>
  </SafeAreaView>
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.paper }, top: { minHeight: 65, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderColor: C.black }, brand: { fontSize: 16, fontWeight: '900', letterSpacing: -1 }, skip: { fontSize: 8, fontWeight: '900' }, slide: { flex: 1, padding: 16 }, art: { minHeight: 330, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, overflow: 'hidden' }, artSymbol: { zIndex: 2, fontSize: 105, lineHeight: 105, fontWeight: '900', letterSpacing: -8 }, artIndex: { position: 'absolute', right: 13, bottom: 10, fontSize: 19, fontWeight: '900' }, artLineA: { position: 'absolute', width: 380, height: 18, backgroundColor: C.black, transform: [{ rotate: '-20deg' }] }, artLineB: { position: 'absolute', width: 270, height: 70, borderWidth: 5, borderColor: C.black, borderRadius: 40, transform: [{ rotate: '28deg' }] }, copy: { paddingTop: 25 }, kicker: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, title: { marginTop: 9, fontSize: 43, lineHeight: 37, fontWeight: '900', letterSpacing: -2.1 }, body: { maxWidth: 330, marginTop: 12, color: C.gray, fontSize: 10, lineHeight: 15 }, bottom: { minHeight: 82, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 2, borderColor: C.black }, dots: { flexDirection: 'row', gap: 6 }, dot: { width: 9, height: 9, borderWidth: 1.5, borderColor: C.black, borderRadius: 5, backgroundColor: C.white }, dotActive: { width: 31, backgroundColor: C.red }, next: { minWidth: 160, minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow }, nextText: { fontSize: 8, fontWeight: '900' }, nextArrow: { fontSize: 22, fontWeight: '900' } })
