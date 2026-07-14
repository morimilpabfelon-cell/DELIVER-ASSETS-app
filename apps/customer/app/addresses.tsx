import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { Button, Header } from '@/components/UI'
import { C } from '@/theme'

export default function Addresses() {
  const router = useRouter(); const { addresses, selectAddress, deleteAddress, addAddress } = useApp()
  const [adding, setAdding] = useState(false); const [line, setLine] = useState(''); const [detail, setDetail] = useState('')
  const save = () => { if (!line.trim()) return; addAddress({ label: 'Otra dirección', line: line.trim(), detail: detail.trim() || 'Sin referencia' }); setLine(''); setDetail(''); setAdding(false) }
  return <SafeAreaView style={styles.safe} edges={['top','bottom']}><Header title="DIRECCIONES" kicker="LUGARES GUARDADOS" onBack={() => router.back()}/><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {addresses.map((item) => <View key={item.id} style={[styles.card, item.selected && styles.active]}><Pressable style={styles.cardMain} onPress={() => selectAddress(item.id)}><View style={[styles.icon, item.selected && { backgroundColor: C.mint }]}><Ionicons name={item.label === 'Casa' ? 'home' : 'location'} size={21}/></View><View style={{ flex: 1 }}><Text style={styles.label}>{item.label.toUpperCase()}</Text><Text style={styles.line}>{item.line}</Text><Text style={styles.detail}>{item.detail}</Text></View>{item.selected && <Ionicons name="checkmark-circle" size={24}/>}</Pressable><Pressable onPress={() => deleteAddress(item.id)} style={styles.delete}><Ionicons name="trash-outline" size={18}/><Text style={styles.deleteText}>ELIMINAR</Text></Pressable></View>)}
    {!adding ? <Button label="AGREGAR DIRECCIÓN" onPress={() => setAdding(true)} icon="add"/> : <View style={styles.form}><Text style={styles.formTitle}>NUEVA DIRECCIÓN</Text><TextInput value={line} onChangeText={setLine} placeholder="Calle, número y distrito" style={styles.input}/><TextInput value={detail} onChangeText={setDetail} placeholder="Referencia, dpto. o recepción" style={styles.input}/><Button label="GUARDAR" onPress={save}/></View>}
  </ScrollView></SafeAreaView>
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 35 }, card: { marginBottom: 11, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, active: { backgroundColor: C.yellow }, cardMain: { minHeight: 92, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, label: { fontSize: 7, fontWeight: '900', letterSpacing: .8 }, line: { marginTop: 4, fontSize: 11, fontWeight: '900' }, detail: { marginTop: 4, color: C.gray, fontSize: 8 }, delete: { minHeight: 39, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, borderTopWidth: 1, borderColor: C.black }, deleteText: { fontSize: 7, fontWeight: '900' }, form: { padding: 14, borderWidth: 2, borderColor: C.black, backgroundColor: C.white }, formTitle: { marginBottom: 12, fontSize: 18, fontWeight: '900' }, input: { minHeight: 49, marginBottom: 10, paddingHorizontal: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.paper, fontSize: 10 } })
