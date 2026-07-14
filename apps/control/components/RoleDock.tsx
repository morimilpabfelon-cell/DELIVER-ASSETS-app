import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C } from '@/theme'

export type DockItem<T extends string> = { key: T; label: string; icon: keyof typeof Ionicons.glyphMap }
export function RoleDock<T extends string>({ items, active, onChange }: { items: DockItem<T>[]; active: T; onChange: (key: T) => void }) {
  return <View style={styles.dock}>{items.map((item) => <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.item}><Ionicons name={item.icon} size={20} color={active === item.key ? C.yellow : '#A8A39B'}/><Text style={[styles.label, active === item.key && styles.active]}>{item.label}</Text></Pressable>)}</View>
}
const styles = StyleSheet.create({ dock: { minHeight: 72, paddingHorizontal: 4, paddingTop: 7, paddingBottom: 9, flexDirection: 'row', borderTopWidth: 2, borderColor: C.black, backgroundColor: C.black }, item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }, label: { color: '#A8A39B', fontSize: 7, fontWeight: '900', letterSpacing: .4 }, active: { color: C.yellow } })
