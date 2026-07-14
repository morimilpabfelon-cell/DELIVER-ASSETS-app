import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')
const context = read('context/AppContext.tsx')
const merchantCatalog = read('data/merchantCatalog.ts')
const persistence = read('services/persistence.ts')
const store = read('app/store/[id].tsx')
const product = read('app/product/[id].tsx')
const cart = read('app/cart.tsx')
const checkout = read('app/checkout.tsx')
const component = read('components/CustomerProductMedia.tsx')
const server = read('dev/sync-hub/server.mjs')
const start = read('scripts/start-customer.ps1')
const checks = []
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) })

check('estado comercial incluye imágenes por producto', merchantCatalog.includes('productImages: Record<number, string | null>'))
check('estado remoto se normaliza sin perder inventario', merchantCatalog.includes('normalizeSharedMerchantStates') && merchantCatalog.includes('const productImages = { ...base.productImages'))
check('getter de imagen es seguro', context.includes('getProductImage') && context.includes('?? null'))
check('schema v11 migra v10', persistence.includes('APP_SCHEMA_VERSION = 11') && persistence.includes('1, 2, 3, 4, 5, 6, 7, 8, 9'))
check('catálogo muestra fotografía publicada', store.includes('<CustomerProductMedia uri={photo}'))
check('detalle muestra fotografía publicada', product.includes('<CustomerProductMedia uri={photo}'))
check('detalle identifica imagen del negocio', product.includes('FOTOGRAFÍA PUBLICADA POR EL NEGOCIO'))
check('carrito conserva imagen exacta', cart.includes('getProductImage(line.storeId, line.product.id)'))
check('checkout conserva imagen exacta', checkout.includes('getProductImage(line.storeId, line.product.id)'))
check('imagen tiene fallback visual', component.includes('onError') && component.includes('symbol'))
check('imagen remonta con URL versionada', component.includes('key={visibleUri}'))
check('Hub sirve media', server.includes("url.pathname.startsWith('/media/')"))
check('Hub anuncia capacidad', server.includes("'product-media-v1'") && server.includes("'business-media-v1'") && server.includes("'catalog-v2'"))
check('arranque usa Hub compartido', start.includes('C:\\DA\\deliver-assets-hub') && start.includes('DA_HUB_MEDIA_PATH'))
check('arranque reemplaza Hub antiguo', start.includes('Reemplazando una versión antigua del Sync Hub'))

const port = 9194
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'da-customer-media-'))
const child = spawn(process.execPath, ['dev/sync-hub/server.mjs'], {
  env: { ...process.env, DA_HUB_PORT: String(port), DA_HUB_STATE_PATH: path.join(temp, 'state.json'), DA_HUB_MEDIA_PATH: path.join(temp, 'media') },
  stdio: ['ignore', 'pipe', 'pipe'],
})
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  await wait(500)
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zy7sAAAAASUVORK5CYII='
  const upload = await fetch(`http://127.0.0.1:${port}/v1/media/product`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId: 1, productId: 101, mimeType: 'image/png', base64: png }) })
  const body = await upload.json()
  const imageUrl = String(body.url ?? '').replace(':9090', `:${port}`)
  const image = body.ok ? await fetch(imageUrl) : null
  check('prueba real publica y recupera imagen', upload.ok && body.ok && Boolean(image?.ok) && (await image.arrayBuffer()).byteLength > 10)
} catch {
  check('prueba real publica y recupera imagen', false)
} finally {
  child.kill('SIGTERM')
}

const failed = checks.filter((item) => !item.ok)
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`)
console.log(`\n${checks.length - failed.length}/${checks.length} verificaciones Customer Product Media aprobadas.`)
if (failed.length) process.exit(1)
