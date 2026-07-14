import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CartLine } from '@/data/cart'
import { normalizeCartLine } from '@/data/cart'

const CART_KEY = '@deliver-assets/customer-cart-v4'
const CART_BACKUP_KEY = '@deliver-assets/customer-cart-v4-backup'
const LEGACY_CART_KEYS = [
  '@deliver-assets/customer-cart-v3',
  '@deliver-assets/customer-cart-v3-backup',
  '@deliver-assets/customer-cart-v2',
  '@deliver-assets/customer-cart-v2-backup',
]
const CART_SCHEMA_VERSION = 4

export type CartDraft = {
  schemaVersion: number
  revision: number
  updatedAt: string
  cart: CartLine[]
  promo: string
  activeStoreId: number | null
}

let writeChain: Promise<unknown> = Promise.resolve()
let lastRevision = 0

function resolveActiveStoreId(cart: CartLine[], requested: unknown): number | null {
  if (!cart.length) return null
  if (typeof requested === 'number' && cart.some((line) => line.storeId === requested)) return requested
  return [...cart]
    .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))[0]?.storeId
    ?? cart[0].storeId
}

function checksumFor(cart: CartLine[], promo: string, activeStoreId: number | null): string {
  const value = JSON.stringify({ cart: cart.map(normalizeCartLine), promo, activeStoreId })
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function normalizeDraft(raw: string | null): CartDraft | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<CartDraft> & { checksum?: string }
    if (![1, 2, 3, CART_SCHEMA_VERSION].includes(value.schemaVersion ?? -1)) return null
    if (!Array.isArray(value.cart)) return null
    const cart = value.cart.flatMap((line) => {
      if (!line || typeof line !== 'object' || typeof line.storeId !== 'number' || !line.product) return []
      return [normalizeCartLine(line)]
    })
    const promo = typeof value.promo === 'string' ? value.promo : ''
    const activeStoreId = resolveActiveStoreId(cart, value.activeStoreId)
    if (typeof value.checksum === 'string' && value.schemaVersion === CART_SCHEMA_VERSION && value.checksum !== checksumFor(cart, promo, activeStoreId)) return null
    const revision = typeof value.revision === 'number' && Number.isFinite(value.revision) ? value.revision : 0
    lastRevision = Math.max(lastRevision, revision)
    return {
      schemaVersion: CART_SCHEMA_VERSION,
      revision,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
      cart,
      promo,
      activeStoreId,
    }
  } catch {
    return null
  }
}

async function readFirstValid(keys: string[]): Promise<{ draft: CartDraft | null; key: string | null }> {
  for (const key of keys) {
    const draft = normalizeDraft(await AsyncStorage.getItem(key))
    if (draft) return { draft, key }
  }
  return { draft: null, key: null }
}

export async function loadCartDraft(): Promise<{ draft: CartDraft | null; recoveredFromBackup: boolean; migrated: boolean }> {
  const current = await readFirstValid([CART_KEY, CART_BACKUP_KEY])
  if (current.draft) return {
    draft: current.draft,
    recoveredFromBackup: current.key === CART_BACKUP_KEY,
    migrated: false,
  }

  const legacy = await readFirstValid(LEGACY_CART_KEYS)
  if (!legacy.draft) return { draft: null, recoveredFromBackup: false, migrated: false }
  const migrated = await saveCartDraft(legacy.draft.cart, legacy.draft.promo, legacy.draft.activeStoreId)
  return {
    draft: migrated,
    recoveredFromBackup: legacy.key?.endsWith('backup') ?? false,
    migrated: true,
  }
}

export function saveCartDraft(cart: CartLine[], promo: string, activeStoreId: number | null, updatedAt = new Date().toISOString()): Promise<CartDraft> {
  const normalizedCart = cart.map(normalizeCartLine)
  const resolvedStoreId = resolveActiveStoreId(normalizedCart, activeStoreId)
  const revision = ++lastRevision
  const draft: CartDraft & { checksum: string } = {
    schemaVersion: CART_SCHEMA_VERSION,
    revision,
    updatedAt,
    cart: normalizedCart,
    promo,
    activeStoreId: resolvedStoreId,
    checksum: checksumFor(normalizedCart, promo, resolvedStoreId),
  }

  const operation = writeChain.then(async () => {
    const previous = await AsyncStorage.getItem(CART_KEY)
    if (previous) await AsyncStorage.setItem(CART_BACKUP_KEY, previous)
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(draft))
    return draft
  })
  writeChain = operation.catch(() => undefined)
  return operation
}

export async function flushCartWrites(): Promise<void> {
  await writeChain
}

export async function clearCartDraft(): Promise<void> {
  await saveCartDraft([], '', null, new Date().toISOString())
  await flushCartWrites()
}
