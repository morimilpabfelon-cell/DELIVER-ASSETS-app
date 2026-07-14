import { StyleSheet, Text, View } from 'react-native'
import { C } from '@/theme'
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <View><Text style={[styles.word, compact && styles.compact, { color: C.yellow }]}>DELIVER</Text><Text style={[styles.word, compact && styles.compact, { color: C.red }]}>ASSETS</Text></View>
}
const styles = StyleSheet.create({ word: { fontSize: 34, lineHeight: 28, fontWeight: '900', letterSpacing: -2.4 }, compact: { fontSize: 18, lineHeight: 15, letterSpacing: -1.2 } })
