import { PropsWithChildren, ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, Tone, tone } from '@/theme'

export function Kicker({ children, light = false }: PropsWithChildren<{ light?: boolean }>) {
  return <Text style={[styles.kicker, light && { color: C.white }]}>{children}</Text>
}

export function Button({ label, onPress, color = 'yellow', disabled = false, icon }: { label: string; onPress: () => void; color?: Tone | 'black' | 'white'; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const bg = color === 'black' ? C.black : color === 'white' ? C.white : tone(color)
  const fg = color === 'black' || color === 'blue' || color === 'red' ? C.white : C.black
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? .35 : pressed ? .72 : 1 }]}>
    <View style={styles.buttonLabel}>{icon && <Ionicons name={icon} size={17} color={fg}/>}<Text style={[styles.buttonText, { color: fg }]}>{label}</Text></View>
    <Text style={[styles.arrow, { color: fg }]}>→</Text>
  </Pressable>
}

export function Header({ title, kicker, onBack, right }: { title: string; kicker?: string; onBack?: () => void; right?: ReactNode }) {
  return <View style={styles.header}>
    {onBack ? <Pressable onPress={onBack} style={styles.headerBack}><Ionicons name="arrow-back" size={21}/></Pressable> : <View style={styles.headerMark}><Text style={styles.headerMarkText}>DA</Text></View>}
    <View style={{ flex: 1 }}>{kicker && <Text style={styles.headerKicker}>{kicker}</Text>}<Text numberOfLines={2} style={styles.headerTitle}>{title}</Text></View>
    {right ?? <View style={{ width: 42 }}/>} 
  </View>
}

export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{title}</Text>{action && <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable>}</View>
}

export function Badge({ label, color = 'mint', dark = false }: { label: string; color?: Tone; dark?: boolean }) {
  return <View style={[styles.badge, { backgroundColor: tone(color) }]}><Text style={[styles.badgeText, dark && { color: C.white }]}>{label}</Text></View>
}

export function Metric({ label, value, color = 'white', detail }: { label: string; value: string; color?: Tone | 'white' | 'black'; detail?: string }) {
  const backgroundColor = color === 'white' ? C.white : color === 'black' ? C.black : tone(color)
  const foreground = color === 'black' || color === 'blue' || color === 'red' ? C.white : C.black
  return <View style={[styles.metric, { backgroundColor }]}><Text style={[styles.metricLabel, { color: foreground }]}>{label}</Text><Text style={[styles.metricValue, { color: foreground }]}>{value}</Text>{detail && <Text style={[styles.metricDetail, { color: foreground }]}>{detail}</Text>}</View>
}

export function ListRow({ icon, title, copy, onPress, color = 'mint', trailing }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy?: string; onPress?: () => void; color?: Tone; trailing?: ReactNode }) {
  return <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && onPress && { opacity: .7 }]}>
    <View style={[styles.listIcon, { backgroundColor: tone(color) }]}><Ionicons name={icon} size={20}/></View>
    <View style={{ flex: 1 }}><Text style={styles.listTitle}>{title}</Text>{copy && <Text style={styles.listCopy}>{copy}</Text>}</View>
    {trailing ?? (onPress ? <Ionicons name="arrow-forward" size={18}/> : null)}
  </Pressable>
}

export function EmptyState({ icon = 'cube-outline', title, copy, action, onPress }: { icon?: keyof typeof Ionicons.glyphMap; title: string; copy: string; action?: string; onPress?: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={34}/></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text>{action && onPress && <Button label={action} onPress={onPress}/>}</View>
}

export function ToggleRow({ title, copy, value, onPress, color = 'mint' }: { title: string; copy: string; value: boolean; onPress: () => void; color?: Tone }) {
  return <Pressable onPress={onPress} style={styles.toggleRow}><View style={{ flex: 1 }}><Text style={styles.toggleTitle}>{title}</Text><Text style={styles.toggleCopy}>{copy}</Text></View><View style={[styles.toggle, value && { backgroundColor: tone(color) }]}><View style={[styles.toggleKnob, value && styles.toggleKnobOn]}/></View></Pressable>
}

const styles = StyleSheet.create({
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  button: { minHeight: 52, paddingHorizontal: 15, borderWidth: 2, borderColor: C.black, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: 10, fontWeight: '900', letterSpacing: .8 },
  arrow: { fontSize: 22, fontWeight: '900' },
  header: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 2, borderColor: C.black, backgroundColor: C.paper },
  headerBack: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.white },
  headerMark: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow },
  headerMarkText: { fontSize: 15, fontWeight: '900', letterSpacing: -1 },
  headerKicker: { marginBottom: 2, color: C.gray, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  headerTitle: { fontSize: 20, lineHeight: 19, fontWeight: '900', letterSpacing: -.8 },
  sectionTitle: { marginTop: 26, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitleText: { flex: 1, fontSize: 20, lineHeight: 20, fontWeight: '900', letterSpacing: -.9 },
  sectionAction: { fontSize: 8, fontWeight: '900', letterSpacing: .6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1.5, borderColor: C.black },
  badgeText: { fontSize: 7, fontWeight: '900', letterSpacing: .8 },
  metric: { width: '48.5%', minHeight: 110, padding: 13, borderWidth: 2, borderColor: C.black },
  metricLabel: { fontSize: 7, fontWeight: '900', letterSpacing: .9 },
  metricValue: { marginTop: 'auto', fontSize: 31, lineHeight: 29, fontWeight: '900', letterSpacing: -1.5 },
  metricDetail: { marginTop: 5, fontSize: 7, opacity: .72 },
  listRow: { minHeight: 68, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  listIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black },
  listTitle: { fontSize: 12, fontWeight: '900' },
  listCopy: { marginTop: 3, color: C.gray, fontSize: 8, lineHeight: 11 },
  empty: { minHeight: 360, padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 72, height: 72, marginBottom: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.black, borderRadius: 36, backgroundColor: C.yellow },
  emptyTitle: { fontSize: 30, lineHeight: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -1.5 },
  emptyCopy: { maxWidth: 290, marginTop: 9, marginBottom: 20, color: C.gray, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  toggleRow: { minHeight: 76, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderBottomWidth: 0, borderColor: C.black, backgroundColor: C.white },
  toggleTitle: { fontSize: 11, fontWeight: '900' },
  toggleCopy: { marginTop: 3, color: C.gray, fontSize: 8, lineHeight: 11 },
  toggle: { width: 50, height: 29, padding: 3, justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 16, backgroundColor: C.line },
  toggleKnob: { width: 19, height: 19, borderWidth: 2, borderColor: C.black, borderRadius: 10, backgroundColor: C.white },
  toggleKnobOn: { alignSelf: 'flex-end' },
})
