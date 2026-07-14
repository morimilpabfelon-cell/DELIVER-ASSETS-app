import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useApp } from '@/context/AppContext'
import { C, shadow } from '@/theme'

export function CartDock({ bottom = 18, storeId }: { bottom?: number; storeId?: number }) {
  const router = useRouter()
  const {
    cartCount, allCartCount, cartStoreCount, cartStore, total,
    cartPersistenceStatus, savedCarts, activeCartStoreId, selectCartStore,
  } = useApp()
  if (!allCartCount || !cartStore) return null

  const contextual = typeof storeId === 'number' ? savedCarts.find((summary) => summary.storeId === storeId) : undefined
  const shownStore = contextual?.store ?? cartStore
  const shownCount = contextual?.itemCount ?? cartCount
  const shownTotal = contextual
    ? contextual.storeId === activeCartStoreId ? total : contextual.total
    : total

  const open = () => {
    if (contextual) selectCartStore(contextual.storeId)
    router.push('/cart')
  }

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Abrir ${contextual ? `carrito de ${shownStore.name}` : `${cartStoreCount} carrito${cartStoreCount === 1 ? '' : 's'}`}`}
    onPress={open}
    style={({ pressed }) => [styles.root, { bottom }, pressed && { transform: [{ scale: .985 }] }]}
  >
    <View style={styles.count}><Text style={styles.countText}>{contextual ? shownCount : allCartCount}</Text></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.small}>{cartPersistenceStatus === 'saving' ? 'GUARDANDO CARRITOS…' : contextual ? `CARRITO · ${shownStore.name.toUpperCase()}` : cartStoreCount > 1 ? `${cartStoreCount} CARRITOS GUARDADOS` : `CARRITO · ${cartStore.name.toUpperCase()}`}</Text>
      <Text numberOfLines={1} style={styles.title}>{shownCount} EN {shownStore.name.toUpperCase()} · S/ {shownTotal.toFixed(2)}</Text>
    </View>
    <Ionicons name="cart" size={22}/>
    <Text style={styles.arrow}>→</Text>
  </Pressable>
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 16, right: 16, zIndex: 20, minHeight: 64, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.black, backgroundColor: C.yellow, ...shadow },
  count: { minWidth: 34, height: 34, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.black, borderRadius: 18, backgroundColor: C.white },
  countText: { fontSize: 10, fontWeight: '900' },
  small: { fontSize: 6, fontWeight: '900', letterSpacing: .6 },
  title: { marginTop: 3, fontSize: 12, fontWeight: '900' },
  arrow: { fontSize: 21, fontWeight: '900' },
})
