import { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform, Text, View } from 'react-native'
import { C } from '@/theme'
import { useApp } from '@/context/AppContext'

const iconMap = { index: 'home', search: 'search', orders: 'receipt', wallet: 'wallet', account: 'person' } as const

export default function TabsLayout() {
  const router = useRouter()
  const { allCartCount, authenticated, role } = useApp()

  useEffect(() => {
    if (!authenticated || role !== 'cliente') router.replace('/auth')
  }, [authenticated, role, router])

  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: C.yellow,
    tabBarInactiveTintColor: '#B8B3AA',
    tabBarStyle: {
      height: Platform.OS === 'ios' ? 88 : 70,
      paddingTop: 7,
      paddingBottom: Platform.OS === 'ios' ? 22 : 8,
      backgroundColor: C.black,
      borderTopWidth: 0,
    },
    tabBarLabelStyle: { fontSize: 8, fontWeight: '900', letterSpacing: .5 },
    tabBarIcon: ({ color, size }) => <View>
      <Ionicons name={iconMap[route.name as keyof typeof iconMap] as never} size={size} color={color}/>
      {route.name === 'orders' && allCartCount > 0 && <View style={{
        position: 'absolute', right: -8, top: -5, minWidth: 17, height: 17, paddingHorizontal: 3,
        borderRadius: 9, backgroundColor: C.red, borderWidth: 1, borderColor: C.white,
        alignItems: 'center', justifyContent: 'center',
      }}><Text style={{ color: C.white, fontSize: 7, fontWeight: '900' }}>{allCartCount}</Text></View>}
    </View>,
  })}>
    <Tabs.Screen name="index" options={{ title: 'INICIO' }}/>
    <Tabs.Screen name="search" options={{ title: 'BUSCAR' }}/>
    <Tabs.Screen name="orders" options={{ title: 'PEDIDOS' }}/>
    <Tabs.Screen name="wallet" options={{ title: 'BILLETERA' }}/>
    <Tabs.Screen name="account" options={{ title: 'CUENTA' }}/>
  </Tabs>
}
