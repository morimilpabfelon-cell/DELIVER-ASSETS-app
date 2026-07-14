import { stores, type BusinessType } from '@/data/catalog'

export type ProductMediaStatus = 'empty' | 'local' | 'publishing' | 'published' | 'error'
export type BusinessMediaPublishStatus = 'empty' | 'local' | 'publishing' | 'published' | 'error'

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
  businessType: BusinessType
  logoUri: string | null
  coverUri: string | null
  logoPublicUrl: string | null
  coverPublicUrl: string | null
  logoStatus: BusinessMediaPublishStatus
  coverStatus: BusinessMediaPublishStatus
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

export function emptyBusinessProductMedia(productId: number): BusinessProductMedia {
  return { productId, localUri: null, publicUrl: null, status: 'empty', updatedAt: new Date(0).toISOString() }
}

export function createBusinessProfiles(): Record<number, BusinessLocalProfile> {
  const now = new Date(0).toISOString()
  return Object.fromEntries(stores.map((store) => [store.id, {
    storeId: store.id,
    email: slugEmail(store.name),
    phone: '+51 940 120 310',
    address: `${store.name} · Lima Central`,
    description: `${store.descriptor}. Comercio independiente.`,
    businessType: store.businessType,
    logoUri: null,
    coverUri: null,
    logoPublicUrl: null,
    coverPublicUrl: null,
    logoStatus: 'empty' as const,
    coverStatus: 'empty' as const,
    productMedia: createProductMedia(store.id),
    updatedAt: now,
  }]))
}

function validMediaStatus(value: unknown): BusinessMediaPublishStatus {
  return ['empty', 'local', 'publishing', 'published', 'error'].includes(String(value))
    ? value as BusinessMediaPublishStatus
    : 'empty'
}

export function normalizeBusinessProfiles(value?: Record<number, Partial<BusinessLocalProfile>> | null): Record<number, BusinessLocalProfile> {
  const defaults = createBusinessProfiles()
  if (!value || typeof value !== 'object') return defaults
  for (const store of stores) {
    const saved = value[store.id]
    if (!saved) continue
    const media = { ...defaults[store.id].productMedia }
    if (saved.productMedia && typeof saved.productMedia === 'object') {
      for (const [rawId, raw] of Object.entries(saved.productMedia)) {
        const productId = Number(rawId)
        if (!Number.isInteger(productId) || productId <= 0 || !raw) continue
        const item = raw as Partial<BusinessProductMedia>
        const localUri = typeof item.localUri === 'string' ? item.localUri : null
        const publicUrl = typeof item.publicUrl === 'string' ? item.publicUrl : null
        media[productId] = {
          productId,
          localUri,
          publicUrl,
          status: validMediaStatus(item.status) as ProductMediaStatus || (publicUrl ? 'published' : localUri ? 'local' : 'empty'),
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : defaults[store.id].updatedAt,
        }
      }
    }
    const logoUri = typeof saved.logoUri === 'string' ? saved.logoUri : null
    const coverUri = typeof saved.coverUri === 'string' ? saved.coverUri : null
    const logoPublicUrl = typeof saved.logoPublicUrl === 'string' ? saved.logoPublicUrl : null
    const coverPublicUrl = typeof saved.coverPublicUrl === 'string' ? saved.coverPublicUrl : null
    defaults[store.id] = {
      ...defaults[store.id],
      ...saved,
      storeId: store.id,
      businessType: (saved.businessType ?? store.businessType) as BusinessType,
      logoUri,
      coverUri,
      logoPublicUrl,
      coverPublicUrl,
      logoStatus: validMediaStatus(saved.logoStatus ?? (logoPublicUrl ? 'published' : logoUri ? 'local' : 'empty')),
      coverStatus: validMediaStatus(saved.coverStatus ?? (coverPublicUrl ? 'published' : coverUri ? 'local' : 'empty')),
      productMedia: media,
      updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : defaults[store.id].updatedAt,
    }
  }
  return defaults
}
