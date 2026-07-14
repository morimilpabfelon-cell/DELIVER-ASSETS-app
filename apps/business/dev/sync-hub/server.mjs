import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { applyEnvelope, createInitialState, loadState, publicState, saveState } from './core.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const statePath = process.env.DA_HUB_STATE_PATH || path.join(dirname, 'data', 'hub-state.json')
const host = process.env.DA_HUB_HOST || '127.0.0.1'
const port = Number(process.env.DA_HUB_PORT || 9090)
const mediaPath = process.env.DA_HUB_MEDIA_PATH || path.join(dirname, 'data', 'media')
let state = loadState(statePath)

function send(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, X-DA-Client-Version',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 8_000_000) {
        reject(new Error('Payload demasiado grande'))
        request.destroy()
      }
    })
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('JSON inválido')) }
    })
    request.on('error', reject)
  })
}


function mediaExtension(mimeType) {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  return '.jpg'
}

function mediaContentType(filename) {
  if (filename.endsWith('.png')) return 'image/png'
  if (filename.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

function cleanOldProductMedia(storeId, productId, exceptName) {
  if (!fs.existsSync(mediaPath)) return
  const prefix = `product-${storeId}-${productId}-`
  for (const filename of fs.readdirSync(mediaPath)) {
    if (!filename.startsWith(prefix) || filename === exceptName) continue
    try { fs.unlinkSync(path.join(mediaPath, filename)) } catch {}
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${host}:${port}`)
  if (request.method === 'OPTIONS') return send(response, 204, {})
  if (request.method === 'GET' && url.pathname === '/health') {
    return send(response, 200, { ok: true, service: 'deliver-assets-sync-hub', revision: state.revision, updatedAt: state.updatedAt, capabilities: ['product-media-v1'] })
  }

if (request.method === 'GET' && url.pathname.startsWith('/media/')) {
  const filename = path.basename(url.pathname.slice('/media/'.length))
  const filePath = path.join(mediaPath, filename)
  if (!filename || !fs.existsSync(filePath)) return send(response, 404, { ok: false, message: 'Imagen no encontrada' })
  response.writeHead(200, {
    'Content-Type': mediaContentType(filename),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0',
  })
  return fs.createReadStream(filePath).pipe(response)
}
if (request.method === 'POST' && url.pathname === '/v1/media/product/delete') {
  try {
    const body = await readJson(request)
    const storeId = Number(body.storeId)
    const productId = Number(body.productId)
    if (!Number.isInteger(storeId) || storeId <= 0 || !Number.isInteger(productId) || productId <= 0) return send(response, 400, { ok: false, message: 'Producto inválido' })
    fs.mkdirSync(mediaPath, { recursive: true })
    cleanOldProductMedia(storeId, productId, '')
    return send(response, 200, { ok: true })
  } catch (error) {
    return send(response, 400, { ok: false, message: error instanceof Error ? error.message : 'Solicitud inválida' })
  }
}
if (request.method === 'POST' && url.pathname === '/v1/media/product') {
  try {
    const body = await readJson(request)
    const storeId = Number(body.storeId)
    const productId = Number(body.productId)
    const mimeType = String(body.mimeType || 'image/jpeg')
    const base64 = String(body.base64 || '')
    if (!Number.isInteger(storeId) || storeId <= 0 || !Number.isInteger(productId) || productId <= 0) return send(response, 400, { ok: false, message: 'Producto inválido' })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return send(response, 400, { ok: false, message: 'Formato de imagen no permitido' })
    if (!base64 || base64.length > 5_700_000) return send(response, 413, { ok: false, message: 'Imagen demasiado grande' })
    const bytes = Buffer.from(base64, 'base64')
    if (!bytes.length || bytes.length > 4 * 1024 * 1024) return send(response, 413, { ok: false, message: 'Imagen demasiado grande' })
    fs.mkdirSync(mediaPath, { recursive: true })
    const filename = `product-${storeId}-${productId}-${Date.now()}${mediaExtension(mimeType)}`
    fs.writeFileSync(path.join(mediaPath, filename), bytes)
    cleanOldProductMedia(storeId, productId, filename)
    return send(response, 200, { ok: true, url: `http://127.0.0.1:${port}/media/${filename}?v=${Date.now()}` })
  } catch (error) {
    return send(response, 400, { ok: false, message: error instanceof Error ? error.message : 'Imagen inválida' })
  }
}
  if (request.method === 'GET' && url.pathname === '/v1/state') {
    return send(response, 200, { ok: true, state: publicState(state) })
  }
  if (request.method === 'POST' && url.pathname === '/v1/sync') {
    try {
      const envelope = await readJson(request)
      const result = applyEnvelope(state, envelope, request.headers['idempotency-key'])
      if (result.error) return send(response, 400, { ok: false, message: result.error })
      state = result.state
      saveState(statePath, state)
      return send(response, 200, { ok: true, duplicate: result.duplicate, accepted: result.accepted, state: publicState(state) })
    } catch (error) {
      return send(response, 400, { ok: false, message: error instanceof Error ? error.message : 'Solicitud inválida' })
    }
  }
  if (request.method === 'POST' && url.pathname === '/v1/reset') {
    state = createInitialState()
    saveState(statePath, state)
    return send(response, 200, { ok: true, state: publicState(state) })
  }
  return send(response, 404, { ok: false, message: 'Ruta no encontrada' })
})

server.listen(port, host, () => {
  console.log(`DELIVER ASSETS Sync Hub activo en http://${host}:${port}`)
  console.log(`Estado: ${statePath}`)
  console.log('Mantén esta ventana abierta mientras usas las cuatro aplicaciones.')
})

process.on('SIGINT', () => server.close(() => process.exit(0)))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
