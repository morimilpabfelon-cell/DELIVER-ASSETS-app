import { useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useApp } from '@/context/AppContext'
import { useFeedback } from '@/components/FeedbackProvider'
import { OperationReceiptCard } from '@/components/OperationReceiptCard'
import { publishChatImage } from '@/services/chatMedia'
import type { CoordinationMessage, CoordinationRole, OperationReceipt } from '@/data/coordination'
import { paymentStateLabel } from '@/data/coordination'
import { operationStatusLabel } from '@/data/operations'
import { C } from '@/theme'

type ConversationRole = 'rider' | 'admin'

const roleLabel: Record<CoordinationRole, string> = {
  customer: 'CLIENTE',
  merchant: 'NEGOCIO',
  rider: 'REPARTIDOR',
  admin: 'CONTROL',
  system: 'SISTEMA',
}

const roleColor: Record<CoordinationRole, string> = {
  customer: C.blue,
  merchant: C.yellow,
  rider: C.mint,
  admin: C.red,
  system: C.paper,
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderConversation({
  operationId,
  selfRole,
  clientVersion,
  allowEscalation = false,
  onOpenReceipt,
}: {
  operationId: string
  selfRole: ConversationRole
  clientVersion: string
  allowEscalation?: boolean
  onOpenReceipt: () => void
}) {
  const {
    operations,
    getOperationCoordination,
    sendOperationText,
    sendOperationImage,
    escalateOperationChat,
    syncNow,
    hubConnected,
  } = useApp()
  const { showDialog, showToast } = useFeedback()
  const [draft, setDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const operation = operations.find((item) => item.id === operationId)
  const coordination = getOperationCoordination(operationId)

  if (!operation || !coordination) {
    return <View style={styles.missing}>
      <Ionicons name="shield-outline" size={44}/>
      <Text style={styles.missingTitle}>ACCESO NO DISPONIBLE.</Text>
      <Text style={styles.missingCopy}>
        {selfRole === 'rider'
          ? 'El chat aparece únicamente para el repartidor asignado a este pedido.'
          : 'Control puede entrar solamente en conversaciones escaladas o ya intervenidas.'}
      </Text>
    </View>
  }

  const closed = coordination.status === 'closed'
  const sendText = () => {
    const result = sendOperationText(operation.id, draft)
    if (!result.ok) {
      showToast({
        title: 'Mensaje no enviado',
        message: result.message,
        tone: 'warning',
      })
      return
    }
    setDraft('')
  }

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true)
    const uploadId = `UP-${Date.now().toString(36).toUpperCase()}`
    const result = await publishChatImage(
      operation.id,
      uploadId,
      asset.uri,
      clientVersion,
      asset.mimeType ?? 'image/jpeg',
    )
    setUploading(false)

    if (!result.ok) {
      showToast({
        title: 'Fotografía no enviada',
        message: result.message,
        tone: 'error',
        duration: 4200,
      })
      return
    }

    const sent = sendOperationImage(operation.id, result.url)
    showToast({
      title: sent.ok ? 'Fotografía enviada' : 'No se pudo adjuntar',
      message: sent.message,
      tone: sent.ok ? 'success' : 'warning',
    })
  }

  const fromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showDialog({
        title: 'Acceso a fotos',
        message: 'Autoriza el acceso desde Android para adjuntar una imagen al pedido.',
        tone: 'warning',
      })
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: .5,
    })
    if (!result.canceled && result.assets[0]) await uploadAsset(result.assets[0])
  }

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      showDialog({
        title: 'Acceso a cámara',
        message: 'Autoriza la cámara desde Android para registrar una evidencia.',
        tone: 'warning',
      })
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: .5,
    })
    if (!result.canceled && result.assets[0]) await uploadAsset(result.assets[0])
  }

  const choosePhoto = () => showDialog({
    title: 'Adjuntar fotografía',
    message: 'La imagen quedará vinculada al historial de este pedido y será visible para sus participantes.',
    tone: 'info',
    actions: [
      { label: 'Cancelar', tone: 'secondary' },
      { label: 'Galería', tone: 'primary', onPress: () => void fromGallery() },
      { label: 'Cámara', tone: 'primary', onPress: () => void fromCamera() },
    ],
  })

  const escalate = () => {
    const result = escalateOperationChat(operation.id)
    showToast({
      title: result.ok ? 'Control solicitado' : 'No se pudo escalar',
      message: result.message,
      tone: result.ok ? 'success' : 'warning',
      duration: 4200,
    })
  }

  return <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View style={styles.status}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statusKicker}>{operation.id}</Text>
        <Text style={styles.statusTitle}>{operationStatusLabel(operation.status).toUpperCase()}</Text>
        <Text style={styles.statusCopy}>
          {operation.merchantName} · {paymentStateLabel(operation.paymentState)}
        </Text>
      </View>
      <View style={[styles.connection, hubConnected ? styles.connected : styles.disconnected]}>
        <Text style={styles.connectionText}>{hubConnected ? 'EN LÍNEA' : 'LOCAL'}</Text>
      </View>
    </View>

    <View style={styles.actions}>
      <Pressable onPress={onOpenReceipt} style={styles.actionButton}>
        <Ionicons name="receipt-outline" size={17}/>
        <Text style={styles.actionText}>{selfRole === 'rider' ? 'COBRO' : 'BOLETA'}</Text>
      </Pressable>
      <Pressable onPress={() => void syncNow()} style={styles.actionButton}>
        <Ionicons name="sync-outline" size={17}/>
        <Text style={styles.actionText}>SYNC</Text>
      </Pressable>
      {allowEscalation && !closed && <Pressable
        onPress={escalate}
        style={[styles.actionButton, coordination.escalated && styles.escalated]}
      >
        <Ionicons name="shield-outline" size={17}/>
        <Text style={styles.actionText}>{coordination.escalated ? 'CONTROL AVISADO' : 'PEDIR AYUDA'}</Text>
      </Pressable>}
    </View>

    {coordination.escalated && <View style={styles.escalation}>
      <Ionicons name="shield-checkmark" size={19}/>
      <Text style={styles.escalationText}>
        {coordination.adminJoinedAt
          ? 'CONTROL SE UNIÓ A ESTA CONVERSACIÓN.'
          : 'CONTROL FUE SOLICITADO. EL CASO ESTÁ PENDIENTE DE INTERVENCIÓN.'}
      </Text>
    </View>}

    <ScrollView
      contentContainerStyle={styles.messages}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {coordination.messages.map((message) => <Message
        key={message.id}
        message={message}
        selfRole={selfRole}
        receipt={coordination.receipt}
        onPreview={setPreview}
        onOpenReceipt={onOpenReceipt}
      />)}

      {closed && <View style={styles.closed}>
        <Ionicons name="lock-closed" size={20}/>
        <Text style={styles.closedTitle}>CONVERSACIÓN CERRADA</Text>
        <Text style={styles.closedCopy}>
          El pedido finalizó. El chat permanece visible como historial y no admite nuevos mensajes.
        </Text>
      </View>}
    </ScrollView>

    {!closed && <View style={styles.composer}>
      <Pressable
        accessibilityLabel="Adjuntar fotografía"
        disabled={uploading}
        onPress={choosePhoto}
        style={[styles.mediaButton, uploading && { opacity: .5 }]}
      >
        <Ionicons name={uploading ? 'hourglass-outline' : 'camera-outline'} size={22}/>
      </Pressable>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={selfRole === 'rider' ? 'Actualiza el recojo o la entrega…' : 'Escribe como Control…'}
        placeholderTextColor={C.gray}
        multiline
        maxLength={1200}
        style={styles.input}
      />
      <Pressable
        accessibilityLabel="Enviar mensaje"
        disabled={!draft.trim()}
        onPress={sendText}
        style={[styles.send, !draft.trim() && styles.sendDisabled]}
      >
        <Ionicons name="arrow-up" size={21} color={C.white}/>
      </Pressable>
    </View>}

    <Modal
      visible={Boolean(preview)}
      transparent
      animationType="fade"
      onRequestClose={() => setPreview(null)}
    >
      <View style={styles.previewBackdrop}>
        <Pressable
          accessibilityLabel="Cerrar fotografía"
          style={styles.previewClose}
          onPress={() => setPreview(null)}
        >
          <Ionicons name="close" size={24}/>
        </Pressable>
        {preview && <Image source={{ uri: preview }} resizeMode="contain" style={styles.previewImage}/>}
      </View>
    </Modal>
  </KeyboardAvoidingView>
}

function Message({
  message,
  selfRole,
  receipt,
  onPreview,
  onOpenReceipt,
}: {
  message: CoordinationMessage
  selfRole: ConversationRole
  receipt: OperationReceipt
  onPreview: (uri: string) => void
  onOpenReceipt: () => void
}) {
  if (message.type === 'receipt') {
    return <Pressable onPress={onOpenReceipt}>
      <OperationReceiptCard receipt={receipt} role={selfRole} compact/>
    </Pressable>
  }

  if (message.senderRole === 'system') {
    return <View style={styles.systemMessage}>
      <Text style={styles.systemText}>{message.text}</Text>
      <Text style={styles.systemTime}>{messageTime(message.createdAt)}</Text>
    </View>
  }

  const mine = message.senderRole === selfRole
  return <View style={[styles.messageRow, mine && styles.messageRowMine]}>
    <View style={[styles.bubble, mine && styles.bubbleMine]}>
      <View style={styles.messageHead}>
        <View style={[styles.roleDot, { backgroundColor: roleColor[message.senderRole] }]}/>
        <Text style={styles.sender}>{roleLabel[message.senderRole]} · {message.senderName}</Text>
        <Text style={styles.time}>{messageTime(message.createdAt)}</Text>
      </View>
      {message.type === 'image' && message.imageUrl && <Pressable onPress={() => onPreview(message.imageUrl!)}>
        <Image source={{ uri: message.imageUrl }} resizeMode="cover" style={styles.messageImage}/>
      </Pressable>}
      {message.text && message.type !== 'image' && <Text style={styles.messageText}>{message.text}</Text>}
    </View>
  </View>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  missing: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  missingTitle: { marginTop: 12, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  missingCopy: { marginTop: 7, color: C.gray, fontSize: 9, lineHeight: 14, textAlign: 'center' },
  status: {
    minHeight: 82,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 2,
    borderColor: C.black,
    backgroundColor: C.black,
  },
  statusKicker: { color: C.white, fontSize: 7, fontWeight: '900', letterSpacing: .7 },
  statusTitle: { marginTop: 5, color: C.yellow, fontSize: 15, fontWeight: '900' },
  statusCopy: { marginTop: 4, color: C.white, fontSize: 7 },
  connection: { paddingHorizontal: 8, paddingVertical: 6, borderWidth: 2, borderColor: C.white },
  connected: { backgroundColor: C.mint },
  disconnected: { backgroundColor: C.yellow },
  connectionText: { fontSize: 6, fontWeight: '900' },
  actions: {
    minHeight: 48,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  actionButton: {
    minHeight: 32,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: C.black,
    backgroundColor: C.paper,
  },
  actionText: { fontSize: 6, fontWeight: '900' },
  escalated: { backgroundColor: C.yellow },
  escalation: {
    minHeight: 55,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderColor: C.black,
    backgroundColor: C.yellow,
  },
  escalationText: { flex: 1, fontSize: 7, fontWeight: '900', lineHeight: 11 },
  messages: { padding: 12, paddingBottom: 25 },
  systemMessage: {
    alignSelf: 'center',
    maxWidth: '92%',
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.black,
    backgroundColor: C.paper,
  },
  systemText: { fontSize: 7, fontWeight: '800', textAlign: 'center' },
  systemTime: { marginTop: 3, color: C.gray, fontSize: 6, textAlign: 'center' },
  messageRow: { marginVertical: 5, alignItems: 'flex-start' },
  messageRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '86%',
    padding: 9,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  bubbleMine: { backgroundColor: C.mint },
  messageHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  roleDot: { width: 10, height: 10, borderWidth: 1, borderColor: C.black, borderRadius: 5 },
  sender: { flex: 1, fontSize: 6, fontWeight: '900' },
  time: { color: C.gray, fontSize: 6 },
  messageText: { marginTop: 7, fontSize: 10, lineHeight: 15 },
  messageImage: {
    width: 230,
    height: 172,
    marginTop: 7,
    borderWidth: 1,
    borderColor: C.black,
    backgroundColor: C.paper,
  },
  closed: {
    minHeight: 120,
    marginTop: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  closedTitle: { marginTop: 7, fontSize: 11, fontWeight: '900' },
  closedCopy: { marginTop: 5, color: C.gray, fontSize: 8, lineHeight: 12, textAlign: 'center' },
  composer: {
    minHeight: 72,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    borderTopWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  mediaButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.yellow,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.paper,
    fontSize: 10,
    textAlignVertical: 'top',
  },
  send: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.black,
  },
  sendDisabled: { opacity: .32 },
  previewBackdrop: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.92)',
  },
  previewClose: {
    position: 'absolute',
    right: 18,
    top: 45,
    zIndex: 2,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.black,
    backgroundColor: C.white,
  },
  previewImage: { width: '100%', height: '82%' },
})
