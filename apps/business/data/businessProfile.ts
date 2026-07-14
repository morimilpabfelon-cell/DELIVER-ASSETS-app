import { stores } from '@/data/catalog'

export type ProductMediaStatus = 'empty' | 'local' | 'publishing' | 'published' | 'error'

export type BusinessProductMedia = {
  productId: number
  localUri: string | null
  publicUrl: string | null
  status: ProductMediaStatus
  updatedAt: string
}

export type BusinessLocalProfile = {
  storeId: number
  email: string
  phone: string
  address: string
  description: string
  logoUri: string | null
  coverUri: string | null
  productMedia: Record<number, BusinessProductMedia>
  updatedAt: string
}

function slugEmail(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@deliverassets.demo`
}

function createProductMedia(storeId: number): Record<number, BusinessProductMedia> {
  const store = stores.find((item) => item.id === storeId) ?? stores[0]
  const initial = new Date(0).toISOString()
  return Object.fromEntries(store.products.map((product) => [product.id, {
    productId: product.id,
    localUri: null,
    publicUrl: null,
    status: 'empty' as const,
    updatedAt: initial,
  }]))
}

export function createBusinessProfiles(): Record<number, BusinessLocalProfile> {
  const now = new Date(0).toISOString()
  return Object.fromEntries(stores.map((store) => [store.id, {
    storeId: store.id,
    email: slugEmail(store.name),
    phone: '+51 940 120 310',
    address: `${store.name} · Lima Central`,
    description: `${store.category[0].toUpperCase() + store.category.slice(1)} · comercio independiente`,
    logoUri: null,
    coverUri: null,
    productMedia: createProductMedia(store.id),
    updatedAt: now,
  }]))
}

export function normalizeBusinessProfiles(value?: Record<number, Partial<BusinessLocalProfile>> | null): Record<number, BusinessLocalProfile> {
  const defaults = createBusinessProfiles()
  if (!value || typeof value !== 'object') return defaults
  for (const store of stores) {
    const saved = value[store.id]
    if (!saved) continue
    const media = { ...defaults[store.id].productMedia }
    if (saved.productMedia && typeof saved.productMedia === 'object') {
      for (const product of store.products) {
        const item = saved.productMedia[product.id]
        if (!item) continue
        const localUri = typeof item.localUri === 'string' ? item.localUri : null
        const publicUrl = typeof item.publicUrl === 'string' ? item.publicUrl : null
        media[product.id] = {
          productId: product.id,
          localUri,
          publicUrl,
          status: ['empty', 'local', 'publishing', 'published', 'error'].includes(String(item.status))
            ? item.status as ProductMediaStatus
            : publicUrl ? 'published' : localUri ? 'local' : 'empty',
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : defaults[store.id].updatedAt,
        }
      }
    }
    defaults[store.id] = {
      ...defaults[store.id],
      ...saved,
      storeId: store.id,
      logoUri: typeof saved.logoUri === 'string' ? saved.logoUri : null,
      coverUri: typeof saved.coverUri === 'string' ? saved.coverUri : null,
      productMedia: media,
      updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : defaults[store.id].updatedAt,
    }
  }
  return defaults
}
