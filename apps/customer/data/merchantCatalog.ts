import type { BusinessType, Product, ProductStatus, Store } from '@/data/catalog'
import { stores } from '@/data/catalog'

export type SharedCatalogProduct = Product & {
  status: ProductStatus
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export type SharedBusinessProfile = {
  storeId: number
  name: string
  descriptor: string
  email: string
  phone: string
  address: string
  description: string
  businessType: BusinessType
  logoUrl: string | null
  coverUrl: string | null
  updatedAt: string
}

export type SharedMerchantState = {
  storeId: number
  open: boolean
  autoAccept: boolean
  stock: Record<number, boolean>
  productImages: Record<number, string | null>
  catalog: Record<number, SharedCatalogProduct>
  publicProfile: SharedBusinessProfile
}

const epoch = new Date(0).toISOString()

export function sharedProductFromSeed(product: Product): SharedCatalogProduct {
  return {
    ...product,
    status: product.status ?? 'published',
    createdAt: product.createdAt ?? epoch,
    updatedAt: product.updatedAt ?? epoch,
    archivedAt: product.status === 'archived' ? product.updatedAt ?? epoch : null,
  }
}

export function createSharedProfile(store: Store): SharedBusinessProfile {
  return {
    storeId: store.id,
    name: store.name,
    descriptor: store.descriptor,
    email: `${store.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@deliverassets.demo`,
    phone: '+51 940 120 310',
    address: `${store.name} · Lima Central`,
    description: `${store.descriptor}. Comercio independiente en DELIVER ASSETS.`,
    businessType: store.businessType,
    logoUrl: null,
    coverUrl: null,
    updatedAt: epoch,
  }
}

export function createSharedMerchantState(store: Store): SharedMerchantState {
  const catalog = Object.fromEntries(store.products.map((product) => [product.id, sharedProductFromSeed(product)]))
  return {
    storeId: store.id,
    open: true,
    autoAccept: false,
    stock: Object.fromEntries(store.products.map((product) => [product.id, product.status !== 'out_of_stock' && product.status !== 'archived'])),
    productImages: Object.fromEntries(store.products.map((product) => [product.id, null])),
    catalog,
    publicProfile: createSharedProfile(store),
  }
}

export function createSharedMerchantStates(): Record<number, SharedMerchantState> {
  return Object.fromEntries(stores.map((store) => [store.id, createSharedMerchantState(store)]))
}

function validStatus(value: unknown): ProductStatus {
  return ['draft', 'published', 'paused', 'out_of_stock', 'archived'].includes(String(value))
    ? value as ProductStatus
    : 'published'
}

function normalizeProduct(value: Partial<SharedCatalogProduct> | undefined, seed?: Product): SharedCatalogProduct | null {
  const id = Number(value?.id ?? seed?.id)
  if (!Number.isInteger(id) || id <= 0) return null
  const fallback = seed ?? {
    id,
    name: `Producto ${id}`,
    description: 'Producto administrado por el comercio.',
    price: 0,
    symbol: 'P',
    group: 'General',
  }
  const now = new Date().toISOString()
  const status = validStatus(value?.status ?? fallback.status)
  const variants = Array.isArray(value?.variants)
    ? value!.variants!.filter((item) => item && typeof item.id === 'string' && typeof item.label === 'string').map((item) => ({
        id: item.id,
        label: item.label,
        stock: Number.isFinite(item.stock) ? Math.max(0, Math.trunc(item.stock)) : 0,
        priceDelta: Number.isFinite(item.priceDelta) ? Number(item.priceDelta) : 0,
      }))
    : fallback.variants
  return {
    ...fallback,
    ...value,
    id,
    name: String(value?.name ?? fallback.name).trim() || fallback.name,
    description: String(value?.description ?? fallback.description).trim() || fallback.description,
    price: Number.isFinite(Number(value?.price)) ? Math.max(0, Number(value?.price)) : fallback.price,
    symbol: String(value?.symbol ?? fallback.symbol).trim().slice(0, 5).toUpperCase() || 'P',
    group: String(value?.group ?? fallback.group).trim() || 'General',
    status,
    options: Array.isArray(value?.options) ? value!.options : fallback.options,
    tags: Array.isArray(value?.tags) ? value!.tags.map(String).filter(Boolean).slice(0, 16) : fallback.tags,
    attributes: value?.attributes && typeof value.attributes === 'object' ? Object.fromEntries(Object.entries(value.attributes).map(([key, item]) => [key, String(item)])) : fallback.attributes,
    variants,
    createdAt: typeof value?.createdAt === 'string' ? value.createdAt : fallback.createdAt ?? now,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : fallback.updatedAt ?? now,
    archivedAt: status === 'archived' ? (typeof value?.archivedAt === 'string' ? value.archivedAt : now) : null,
  }
}

export function normalizeSharedMerchantStates(value?: Record<number, Partial<SharedMerchantState>> | null): Record<number, SharedMerchantState> {
  const defaults = createSharedMerchantStates()
  if (!value || typeof value !== 'object') return defaults
  for (const store of stores) {
    const saved = value[store.id]
    if (!saved) continue
    const base = defaults[store.id]
    const catalog: Record<number, SharedCatalogProduct> = { ...base.catalog }
    if (saved.catalog && typeof saved.catalog === 'object') {
      for (const [rawId, rawProduct] of Object.entries(saved.catalog)) {
        const id = Number(rawId)
        const seed = store.products.find((item) => item.id === id)
        const normalized = normalizeProduct(rawProduct as Partial<SharedCatalogProduct>, seed)
        if (normalized) catalog[id] = normalized
      }
    }
    // Old snapshots may only have stock and productImages.
    const stock = { ...base.stock, ...(saved.stock ?? {}) }
    const productImages = { ...base.productImages, ...(saved.productImages ?? {}) }
    for (const product of Object.values(catalog)) {
      if (!(product.id in stock)) stock[product.id] = product.status !== 'out_of_stock' && product.status !== 'archived'
      if (!(product.id in productImages)) productImages[product.id] = null
    }
    const profile = saved.publicProfile && typeof saved.publicProfile === 'object'
      ? {
          ...base.publicProfile,
          ...saved.publicProfile,
          storeId: store.id,
          businessType: (saved.publicProfile.businessType ?? store.businessType) as BusinessType,
          logoUrl: typeof saved.publicProfile.logoUrl === 'string' ? saved.publicProfile.logoUrl : null,
          coverUrl: typeof saved.publicProfile.coverUrl === 'string' ? saved.publicProfile.coverUrl : null,
          updatedAt: typeof saved.publicProfile.updatedAt === 'string' ? saved.publicProfile.updatedAt : base.publicProfile.updatedAt,
        }
      : base.publicProfile
    defaults[store.id] = {
      storeId: store.id,
      open: saved.open !== false,
      autoAccept: saved.autoAccept === true,
      stock,
      productImages,
      catalog,
      publicProfile: profile,
    }
  }
  return defaults
}

export function customerVisibleProducts(state: SharedMerchantState): SharedCatalogProduct[] {
  return Object.values(state.catalog)
    .filter((product) => product.status === 'published' || product.status === 'out_of_stock')
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
}

export function businessVisibleProducts(state: SharedMerchantState, includeArchived = false): SharedCatalogProduct[] {
  return Object.values(state.catalog)
    .filter((product) => includeArchived || product.status !== 'archived')
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
}

export function nextCatalogProductId(storeId: number, catalog: Record<number, SharedCatalogProduct>): number {
  const floor = storeId * 100000
  const customIds = Object.keys(catalog).map(Number).filter((id) => id >= floor && id < floor + 100000)
  return customIds.length ? Math.max(...customIds) + 1 : floor + 1
}
