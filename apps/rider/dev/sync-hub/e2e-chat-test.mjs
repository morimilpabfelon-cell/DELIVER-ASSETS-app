import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'da-coordination-'))
const port = 19090 + Math.floor(Math.random() * 500)
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: {
    ...process.env,
    DA_HUB_PORT: String(port),
    DA_HUB_STATE_PATH: path.join(temp, 'state.json'),
    DA_HUB_MEDIA_PATH: path.join(temp, 'media'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(100)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      const body = await response.json()
      if (body.ok) {
        assert.ok(body.capabilities.includes('coordination-v2'))
        assert.ok(body.capabilities.includes('chat-media-v1'))
        assert.ok(body.capabilities.includes('receipt-v1'))
        ready = true
        break
      }
    } catch {}
  }
  assert.equal(ready, true)

  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='
  const upload = await fetch(`http://127.0.0.1:${port}/v1/media/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationId: 'DA-CHAT-001',
      messageId: 'MSG-IMAGE-001',
      mimeType: 'image/png',
      base64: png,
    }),
  })
  const uploaded = await upload.json()
  assert.equal(uploaded.ok, true)
  const image = await fetch(uploaded.url.replace('127.0.0.1:9090', `127.0.0.1:${port}`))
  assert.equal(image.ok, true)
  assert.equal(image.headers.get('content-type'), 'image/png')

  console.log('PASS · health coordination-v2')
  console.log('PASS · fotografía de chat publicada')
  console.log('PASS · fotografía recuperada')
} finally {
  child.kill('SIGTERM')
  fs.rmSync(temp, { recursive: true, force: true })
}
