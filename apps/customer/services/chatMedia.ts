import { File } from 'expo-file-system'

export type ChatImagePublishResult =
  | { ok: true; url: string }
  | { ok: false; message: string }

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:9090'

function requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout))
}

export async function publishChatImage(
  operationId: string,
  messageId: string,
  fileUri: string,
  clientVersion: string,
  mimeType = 'image/jpeg',
): Promise<ChatImagePublishResult> {
  try {
    const file = new File(fileUri)
    if (!file.exists || file.size <= 0) return { ok: false, message: 'La fotografía seleccionada no puede leerse.' }
    if (file.size > 4 * 1024 * 1024) return { ok: false, message: 'La fotografía debe pesar menos de 4 MB.' }

    const base64 = await file.base64()
    const response = await requestJson(`${apiUrl.replace(/\/$/, '')}/v1/media/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DA-Client-Version': clientVersion,
      },
      body: JSON.stringify({ operationId, messageId, mimeType, base64 }),
    }, 18000)

    const body = await response.json() as { ok?: boolean; url?: string; message?: string }
    if (!response.ok || !body.ok || !body.url) {
      return { ok: false, message: body.message ?? `Servidor respondió ${response.status}.` }
    }
    return { ok: true, url: body.url }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && error.name === 'AbortError'
        ? 'La fotografía excedió el tiempo de envío.'
        : 'No fue posible publicar la fotografía en el chat.',
    }
  }
}
