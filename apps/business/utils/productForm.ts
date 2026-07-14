import type { BusinessType, ProductVariant } from '@/data/catalog'

export function parseVariants(value: string): ProductVariant[] | undefined {
  const rows = value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
  if (!rows.length) return undefined
  return rows.slice(0, 30).map((row, index) => {
    const [labelPart, stockPart, pricePart] = row.split('|').map((item) => item.trim())
    const label = labelPart || `Variante ${index + 1}`
    const stock = Number.isFinite(Number(stockPart)) ? Math.max(0, Math.trunc(Number(stockPart))) : 0
    const priceDelta = Number.isFinite(Number(pricePart)) ? Number(pricePart) : 0
    return { id: `${Date.now().toString(36)}-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`, label, stock, priceDelta }
  })
}

export function serializeVariants(value?: ProductVariant[]): string {
  return value?.map((item) => `${item.label} | ${item.stock} | ${item.priceDelta ?? 0}`).join('\n') ?? ''
}

export function parseAttributes(value: string): Record<string, string> | undefined {
  const entries = value.split(/\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const separator = line.indexOf(':')
    if (separator < 1) return []
    const key = line.slice(0, separator).trim()
    const item = line.slice(separator + 1).trim()
    return key && item ? [[key, item] as const] : []
  })
  return entries.length ? Object.fromEntries(entries.slice(0, 20)) : undefined
}

export function serializeAttributes(value?: Record<string, string>): string {
  return value ? Object.entries(value).map(([key, item]) => `${key}: ${item}`).join('\n') : ''
}

export function productHints(type: BusinessType) {
  if (type === 'restaurant') return { group: 'Ej. Combos, Burgers, Bebidas', primary: 'Preparación / porción', variants: 'Ej. Mediano | 20 | 0' }
  if (type === 'grocery') return { group: 'Ej. Despensa, Frescos, Bebidas', primary: 'Unidad o peso', variants: 'Ej. 1 kg | 12 | 0' }
  if (type === 'pharmacy') return { group: 'Ej. Higiene, Bienestar, Dermocosmética', primary: 'Presentación', variants: 'Ej. 100 ml | 8 | 0' }
  if (type === 'fashion') return { group: 'Ej. Polos, Casacas, Accesorios', primary: 'Material / colección', variants: 'Ej. M · Negro | 8 | 0' }
  if (type === 'footwear') return { group: 'Ej. Zapatillas, Sandalias, Botas', primary: 'Material / guía', variants: 'Ej. 40 · Negro | 6 | 0' }
  if (type === 'electronics') return { group: 'Ej. Celulares, Audio, Accesorios', primary: 'Garantía / memoria', variants: 'Ej. 128 GB · Azul | 4 | 50' }
  return { group: 'Ej. Documentos, Paquetes, Prioridad', primary: 'Capacidad / cobertura', variants: 'Ej. Hasta 3 kg | 10 | 0' }
}
