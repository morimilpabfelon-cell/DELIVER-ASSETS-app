import { Directory, File, Paths } from 'expo-file-system'

export type BusinessMediaKind = 'logo' | 'cover'

const mediaDirectory = new Directory(Paths.document, 'deliver-assets-business-media')

function extensionFrom(mimeType?: string | null, uri?: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  const match = uri?.match(/\.(png|webp|jpe?g)(?:\?|$)/i)
  if (match) return `.${match[1].toLowerCase().replace('jpeg', 'jpg')}`
  return '.jpg'
}

function isManaged(uri?: string | null): boolean {
  return Boolean(uri && uri.startsWith(mediaDirectory.uri))
}

function copyManagedImage(sourceUri: string, filename: string): string {
  mediaDirectory.create({ idempotent: true, intermediates: true })
  const source = new File(sourceUri)
  if (!source.exists || source.size <= 0) throw new Error('La imagen seleccionada no puede leerse.')
  if (source.size > 8 * 1024 * 1024) throw new Error('La imagen supera 8 MB. Elige una versión más ligera.')
  const target = new File(mediaDirectory, filename)
  source.copy(target)
  if (!target.exists || target.size <= 0) {
    try { if (target.exists) target.delete() } catch { /* best effort */ }
    throw new Error('La copia de la imagen quedó vacía.')
  }
  return target.uri
}

export function persistBusinessMedia(
  sourceUri: string,
  storeId: number,
  kind: BusinessMediaKind,
  mimeType?: string | null,
  previousUri?: string | null,
): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const uri = copyManagedImage(sourceUri, `${kind}-${storeId}-${suffix}${extensionFrom(mimeType, sourceUri)}`)
  cleanupBusinessMedia(storeId, kind, uri)
  if (previousUri && previousUri !== uri) removeBusinessMedia(previousUri)
  return uri
}

export function persistProductMedia(
  sourceUri: string,
  storeId: number,
  productId: number,
  mimeType?: string | null,
  previousUri?: string | null,
): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const uri = copyManagedImage(sourceUri, `product-${storeId}-${productId}-${suffix}${extensionFrom(mimeType, sourceUri)}`)
  cleanupProductMedia(storeId, productId, uri)
  if (previousUri && previousUri !== uri) removeBusinessMedia(previousUri)
  return uri
}

export function cleanupBusinessMedia(storeId: number, kind: BusinessMediaKind, exceptUri?: string): void {
  if (!mediaDirectory.exists) return
  const prefix = `${kind}-${storeId}-`
  for (const entry of mediaDirectory.list()) {
    if (!(entry instanceof File) || !entry.name.startsWith(prefix) || entry.uri === exceptUri) continue
    try { entry.delete() } catch { /* stale file can be cleaned later */ }
  }
}

export function cleanupProductMedia(storeId: number, productId: number, exceptUri?: string): void {
  if (!mediaDirectory.exists) return
  const prefix = `product-${storeId}-${productId}-`
  for (const entry of mediaDirectory.list()) {
    if (!(entry instanceof File) || !entry.name.startsWith(prefix) || entry.uri === exceptUri) continue
    try { entry.delete() } catch { /* stale file can be cleaned later */ }
  }
}

export function removeBusinessMedia(uri?: string | null): void {
  if (!isManaged(uri)) return
  try {
    const file = new File(uri!)
    if (file.exists) file.delete()
  } catch { /* UI can still fall back to the generated mark. */ }
}

export function businessMediaExists(uri?: string | null): boolean {
  if (!isManaged(uri)) return false
  try {
    const file = new File(uri!)
    return file.exists && file.size > 0
  } catch {
    return false
  }
}

export function clearAllBusinessMedia(): void {
  if (!mediaDirectory.exists) return
  try { mediaDirectory.delete() } catch { /* reset can continue even if cleanup fails */ }
}
