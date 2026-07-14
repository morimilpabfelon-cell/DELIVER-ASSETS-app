import { Directory, File, Paths } from 'expo-file-system'

const profileDirectory = new Directory(Paths.document, 'deliver-assets-profile')

function extensionFrom(mimeType?: string | null, uri?: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  const match = uri?.match(/\.(png|webp|jpe?g)(?:\?|$)/i)
  if (match) return `.${match[1].toLowerCase().replace('jpeg', 'jpg')}`
  return '.jpg'
}

function isManagedPhoto(uri?: string | null): boolean {
  return Boolean(uri && uri.startsWith(profileDirectory.uri))
}

export function cleanupProfilePhotos(exceptUri?: string): void {
  if (!profileDirectory.exists) return
  for (const entry of profileDirectory.list()) {
    if (!(entry instanceof File) || !entry.name.startsWith('avatar-') || entry.uri === exceptUri) continue
    try { entry.delete() } catch { /* A stale file can be cleaned on a future change. */ }
  }
}

export function persistProfilePhoto(sourceUri: string, mimeType?: string | null, previousUri?: string | null): string {
  profileDirectory.create({ idempotent: true, intermediates: true })
  const source = new File(sourceUri)
  if (!source.exists || source.size <= 0) throw new Error('Selected profile image is not readable.')
  if (source.size > 20 * 1024 * 1024) throw new Error('Selected profile image is too large.')

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const target = new File(profileDirectory, `avatar-${suffix}${extensionFrom(mimeType, sourceUri)}`)
  source.copy(target)
  if (!target.exists || target.size <= 0) {
    try { if (target.exists) target.delete() } catch { /* Best-effort cleanup. */ }
    throw new Error('Profile image copy is empty.')
  }

  // Delete older managed photos only after the new file is safely copied.
  cleanupProfilePhotos(target.uri)
  if (previousUri && previousUri !== target.uri && isManagedPhoto(previousUri)) {
    try {
      const previous = new File(previousUri)
      if (previous.exists) previous.delete()
    } catch { /* The new photo is already safe; old cleanup can fail harmlessly. */ }
  }
  return target.uri
}

export function removeProfilePhoto(uri?: string | null): void {
  if (!isManagedPhoto(uri)) return
  try {
    const file = new File(uri!)
    if (file.exists) file.delete()
  } catch {
    // The profile can still fall back to initials if Android already removed the file.
  }
}

export function profilePhotoExists(uri?: string | null): boolean {
  if (!isManagedPhoto(uri)) return false
  try {
    const file = new File(uri!)
    return file.exists && file.size > 0
  } catch {
    return false
  }
}
