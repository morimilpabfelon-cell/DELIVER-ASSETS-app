import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const read = (file) => fs.readFileSync(file, 'utf8')
const context = read('context/AppContext.tsx')
const profile = read('data/businessProfile.ts')
const media = read('services/businessMedia.ts')
const backend = read('services/backend.ts')
const editor = read('app/product/[id].tsx')
const catalog = read('app/business.tsx')
const server = read('dev/sync-hub/server.mjs')
const checks = []
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) })

check('perfil guarda media por producto', profile.includes('productMedia: Record<number, BusinessProductMedia>'))
check('foto local usa nombres únicos', media.includes('product-${storeId}-${productId}-${suffix}'))
check('limpieza conserva una foto por producto', media.includes('cleanupProductMedia'))
check('catálogo muestra ProductPhoto', catalog.includes('<ProductPhoto'))
check('editor tiene galería y cámara', editor.includes('launchImageLibraryAsync') && editor.includes('launchCameraAsync'))
check('editor permite retirar foto', editor.includes('¿Eliminar foto del producto?') && editor.includes('deleteProductImage'))
check('foto pública vive en merchantStates', context.includes('currentMerchantState.productImages') && context.includes('setMerchantProductImageUrl'))
check('publicación usa endpoint central', backend.includes('/v1/media/product'))
check('Hub sirve archivos por /media', server.includes("url.pathname.startsWith('/media/')"))
check('Hub limita formato y tamaño', server.includes('Formato de imagen no permitido') && server.includes('4 * 1024 * 1024'))
check('Hub elimina archivos públicos retirados', server.includes('/v1/media/product/delete') && backend.includes('deleteProductImage'))
check('URL lleva revisión anticaché', server.includes('?v=${Date.now()}'))
check('foto pública se sincroniza por producto', context.includes('setMerchantProductImageUrl'))

const port = 9193
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'da-business-media-'))
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
  check('prueba ejecutable publica imagen', upload.ok && body.ok && Boolean(body.url))
  check('prueba ejecutable recupera imagen', Boolean(image?.ok) && (await image.arrayBuffer()).byteLength > 10)

  const merchantStates = { 1: { storeId: 1, open: true, autoAccept: false, stock: { 101: true }, productImages: { 101: body.url } } }
  const sync = await fetch(`http://127.0.0.1:${port}/v1/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'media-e2e-business' }, body: JSON.stringify({ appId: 'business', domainRevisions: { operations: 0, merchants: 0, admin: 0 }, shared: { operations: [], merchantStates, admin: null } }) })
  const synced = await sync.json()
  const customerState = await fetch(`http://127.0.0.1:${port}/v1/state`).then((response) => response.json())
  check('Business publica URL que Customer puede leer', sync.ok && synced.ok && customerState.state?.merchantStates?.['1']?.productImages?.['101'] === body.url)
} catch {
  check('prueba ejecutable publica imagen', false)
  check('prueba ejecutable recupera imagen', false)
  check('Business publica URL que Customer puede leer', false)
} finally {
  child.kill('SIGTERM')
}

const failed = checks.filter((item) => !item.ok)
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`)
console.log(`\n${checks.length - failed.length}/${checks.length} verificaciones de fotos de producto aprobadas.`)
if (failed.length) process.exit(1)
