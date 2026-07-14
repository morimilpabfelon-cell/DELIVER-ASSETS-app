import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { Button, Header, Kicker } from '@/components/UI'
import { C, shadow } from '@/theme'

export default function Location() {
  const router = useRouter()
  const { addresses, selectAddress, addAddress } = useApp()
  const [adding, setAdding] = useState(false)
  const [line, setLine] = useState('')
  const [detail, setDetail] = useState('')
  const save = () => {
    if (!line.trim()) return
    addAddress({ label: 'Nueva dirección', line: line.trim(), detail: detail.trim() || 'Sin referencia' })
    router.replace('/(tabs)')
  }
  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <Header title="UBICACIÓN" kicker="ENTREGA Y COBERTURA" onBack={() => router.back()}/>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.map}><View style={styles.grid}/><View style={styles.roadA}/><View style={styles.roadB}/><View style={styles.pin}><Ionicons name="location" size={30} color={C.white}/></View><View style={styles.zone}><Text style={styles.zoneText}>ZONA DEMO · LIMA CENTRAL</Text></View></View>
      <Kicker>¿DÓNDE ENTREGAMOS?</Kicker><Text style={styles.title}>ELIGE TU{`\n`}PUNTO.</Text>
      <View style={styles.saved}>{addresses.map((item) => <Pressable key={item.id} onPress={() => { selectAddress(item.id); router.replace('/(tabs)') }} style={[styles.address, item.selected && styles.addressActive]}><View style={[styles.addressIcon, item.selected && { backgroundColor: C.mint }]}><Ionicons name={item.label === 'Casa' ? 'home' : 'business'} size={20}/></View><View style={{ flex: 1 }}><Text style={styles.addressLabel}>{item.label.toUpperCase()}</Text><Text style={styles.addressLine}>{item.line}</Text><Text style={styles.addressDetail}>{item.detail}</Text></View>{item.selected ? <Ionicons name="checkmark-circle" size={23}/> : <Ionicons name="arrow-forward" size={19}/>}</Pressable>)}</View>
      {!adding ? <Button label="AGREGAR OTRA DIRECCIÓN" onPress={() => setAdding(true)} color="white" icon="add"/> : <View style={styles.form}><Text style={styles.label}>DIRECCIÓN</Text><TextInput value={line} onChangeText={setLine} placeholder="Calle, número y distrito" style={styles.input}/><Text style={styles.label}>REFERENCIA</Text><TextInput value={detail} onChangeText={setDetail} placeholder="Dpto., portería o referencia" style={styles.input}/><Button label="GUARDAR Y CONTINUAR" onPress={save}/></View>}
      <View style={styles.notice}><Ionicons name="shield-checkmark" size={22}/><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>UBICACIÓN CONTROLADA</Text><Text style={styles.noticeCopy}>La app usa datos simulados. Una versión real solicitará permiso y limitará la retención.</Text></View></View>
    </ScrollView>
  </SafeAreaView>
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 35 }, map: { height: 230, marginBottom: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, backgroundColor: C.blue, overflow: 'hidden', ...shadow }, grid: { position: 'absolute', inset: 0, opacity: .14, backgroundColor: C.white }, roadA: { position: 'absolute', width: 430, height: 20, borderWidth: 3, borderColor: C.black, backgroundColor: C.paper, transform: [{ rotate: '18deg' }] }, roadB: { position: 'absolute', width: 340, height: 18, borderWidth: 3, borderColor: C.black, backgroundColor: C.paper, transform: [{ rotate: '-42deg' }] }, pin: { zIndex: 3, width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, borderRadius: 31, backgroundColor: C.red }, zone: { position: 'absolute', left: 12, bottom: 10, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow }, zoneText: { fontSize: 7, fontWeight: '900' }, title: { marginTop: 9, marginBottom: 18, fontSize: 44, lineHeight: 37, fontWeight: '900', letterSpacing: -2.2 }, saved: { marginBottom: 12 }, address: { minHeight: 83, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white }, addressActive: { backgroundColor: C.yellow }, addressIcon: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, addressLabel: { fontSize: 7, fontWeight: '900', letterSpacing: .8 }, addressLine: { marginTop: 3, fontSize: 10, fontWeight: '900' }, addressDetail: { marginTop: 3, color: C.gray, fontSize: 8 }, form: { marginTop: 8, marginBottom: 18, padding: 14, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, label: { marginBottom: 6, fontSize: 7, fontWeight: '900' }, input: { minHeight: 49, marginBottom: 12, paddingHorizontal: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.paper, fontSize: 10 }, notice: { minHeight: 78, marginTop: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.mint }, noticeTitle: { fontSize: 9, fontWeight: '900' }, noticeCopy: { marginTop: 4, fontSize: 8, lineHeight: 11 } })
