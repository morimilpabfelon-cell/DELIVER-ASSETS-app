import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const ignored = new Set(['node_modules', '.expo', 'android', 'ios', 'dist', 'dist-test', 'web-build', '.git'])
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.webp', '.md', '.ps1'])
let sourceBytes = 0
let assetBytes = 0
let fileCount = 0
let largest = []

function walk(relative = '.') {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      walk(child)
      continue
    }
    const extension = path.extname(entry.name).toLowerCase()
    if (!sourceExtensions.has(extension)) continue
    const size = fs.statSync(path.join(root, child)).size
    sourceBytes += size
    if (child.startsWith(`assets${path.sep}`) || child.startsWith('assets/')) assetBytes += size
    fileCount += 1
    largest.push({ child, size })
  }
}

walk()
largest = largest.sort((a, b) => b.size - a.size).slice(0, 8)
const mb = (value) => (value / 1024 / 1024).toFixed(2)
const checks = [
  ['código y recursos propios por debajo de 2 MB', sourceBytes < 2 * 1024 * 1024],
  ['recursos visuales por debajo de 250 KB', assetBytes < 250 * 1024],
  ['sin carpetas de Business', !fs.existsSync(path.join(root, 'app', 'business')) && !fs.existsSync(path.join(root, 'app', 'business.tsx'))],
  ['sin carpetas de Rider', !fs.existsSync(path.join(root, 'app', 'rider')) && !fs.existsSync(path.join(root, 'app', 'rider.tsx'))],
  ['sin carpetas de Control', !fs.existsSync(path.join(root, 'app', 'admin')) && !fs.existsSync(path.join(root, 'app', 'admin.tsx'))],
  ['script de limpieza disponible', fs.existsSync(path.join(root, 'scripts', 'clean-customer.ps1'))],
  ['script release disponible', fs.existsSync(path.join(root, 'scripts', 'build-release.ps1'))],
]

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}`)
console.log(`\nArchivos propios auditados: ${fileCount}`)
console.log(`Código + recursos propios: ${mb(sourceBytes)} MB`)
console.log(`Recursos visuales: ${(assetBytes / 1024).toFixed(1)} KB`)
console.log('Archivos propios más grandes:')
for (const item of largest) console.log(`- ${(item.size / 1024).toFixed(1)} KB · ${item.child}`)
if (checks.some(([, ok]) => !ok)) process.exit(1)
