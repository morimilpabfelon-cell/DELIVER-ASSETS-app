import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Header } from '@/components/UI'
import { OrderConversation } from '@/components/OrderConversation'
import { C } from '@/theme'

export default function RiderOrderChat() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top', 'bottom']}>
    <Header title="CHAT DE ENTREGA" kicker={id ?? 'COORDINACIÓN'} onBack={() => router.back()}/>
    <OrderConversation
      operationId={id ?? ''}
      selfRole="rider"
      clientVersion="2.3.0-rider"
      allowEscalation
      onOpenReceipt={() => router.push({ pathname: '/receipt/[id]', params: { id: id ?? '' } } as never)}
    />
  </SafeAreaView>
}
