import { useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useApp } from '@/context/AppContext'
import { Header } from '@/components/UI'
import { OrderConversation } from '@/components/OrderConversation'
import { C } from '@/theme'

export default function ControlOrderChat() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { joinOperationAsAdmin } = useApp()
  const joinedId = useRef<string | null>(null)

  useEffect(() => {
    if (!id || joinedId.current === id) return
    joinedId.current = id
    joinOperationAsAdmin(id)
  }, [id, joinOperationAsAdmin])

  return <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top', 'bottom']}>
    <Header title="INTERVENCIÓN DE CONTROL" kicker={id ?? 'CASO ESCALADO'} onBack={() => router.back()}/>
    <OrderConversation
      operationId={id ?? ''}
      selfRole="admin"
      clientVersion="2.3.0-control"
      onOpenReceipt={() => router.push({ pathname: '/receipt/[id]', params: { id: id ?? '' } } as never)}
    />
  </SafeAreaView>
}
