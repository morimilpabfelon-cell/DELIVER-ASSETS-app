import type { UserProfile } from '@/context/AppContext'

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DA'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'DA'
}

export function profileDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CLIENTE DA'
  if (parts.length === 1) return parts[0].toUpperCase()
  return `${parts[0]}\n${parts.slice(1).join(' ')}`.toUpperCase()
}

export function referralCode(profile: UserProfile): string {
  const first = profile.name.trim().split(/\s+/).filter(Boolean)[0] ?? 'CLIENTE'
  const clean = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `${clean.slice(0, 8) || 'CLIENTE'}DA26`
}
