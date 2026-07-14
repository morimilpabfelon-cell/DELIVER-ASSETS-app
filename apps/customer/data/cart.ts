import type { Product, Store } from '@/data/catalog'

export type CartLine = {
  id: string
  signature: string
  storeId: number
  product: Product
  quantity: number
  note: string
  extras: string[]
  addedAt: string
  updatedAt: string
}

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase()
}

function normalizedExtras(extras: string[]): string[] {
  return [...new Set(extras.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function cartLineSignature(storeId: number, productId: number, note: string, extras: string[]): string {
  return `${storeId}:${productId}:${note.trim()}:${normalizedExtras(extras).join('|')}`
}

export function createCartLine(store: Store, product: Product, quantity: number, note: string, extras: string[]): CartLine {
  const now = new Date().toISOString()
  const signature = cartLineSignature(store.id, product.id, note, extras)
  return {
    id: `CART-${product.id}-${stableHash(signature)}`,
    signature,
    storeId: store.id,
    product,
    quantity: Math.max(1, Math.round(quantity)),
    note: note.trim(),
    extras: normalizedExtras(extras),
    addedAt: now,
    updatedAt: now,
  }
}

export function normalizeCartLine(value: Partial<CartLine> & Pick<CartLine, 'storeId' | 'product' | 'quantity' | 'note' | 'extras'>): CartLine {
  const now = new Date().toISOString()
  const note = value.note?.trim() ?? ''
  const extras = normalizedExtras(Array.isArray(value.extras) ? value.extras : [])
  const signature = cartLineSignature(value.storeId, value.product.id, note, extras)
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `CART-${value.product.id}-${stableHash(signature)}`,
    signature,
    storeId: value.storeId,
    product: value.product,
    quantity: Math.max(1, Math.round(value.quantity ?? 1)),
    note,
    extras,
    addedAt: typeof value.addedAt === 'string' ? value.addedAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }
}

export function addOrMergeCartLine(current: CartLine[], nextLine: CartLine): CartLine[] {
  const normalizedCurrent = current.map(normalizeCartLine)
  const found = normalizedCurrent.findIndex((line) => line.signature === nextLine.signature)
  if (found < 0) return [...normalizedCurrent, nextLine]

  const now = new Date().toISOString()
  return normalizedCurrent.map((line, index) => index === found
    ? { ...line, quantity: line.quantity + nextLine.quantity, updatedAt: now }
    : line)
}

export function updateCartLineById(current: CartLine[], lineId: string, delta: number): CartLine[] {
  return current.flatMap((value) => {
    const line = normalizeCartLine(value)
    if (line.id !== lineId) return [line]
    const quantity = line.quantity + delta
    return quantity <= 0 ? [] : [{ ...line, quantity, updatedAt: new Date().toISOString() }]
  })
}

export function cartHasUniqueLines(cart: CartLine[]): boolean {
  const signatures = cart.map((line) => normalizeCartLine(line).signature)
  return new Set(signatures).size === signatures.length
}
