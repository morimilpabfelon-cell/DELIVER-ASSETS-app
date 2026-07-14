import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const source = fs.readFileSync(path.join(process.cwd(), 'data/cart.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText
const temp = path.join(os.tmpdir(), `deliver-assets-cart-${Date.now()}.mjs`)
fs.writeFileSync(temp, output)
const cart = await import(`${pathToFileURL(temp).href}?v=${Date.now()}`)

const store = { id: 1, name: 'Barrio Burger' }
const burger = { id: 101, name: 'Burger', price: 20 }
const fries = { id: 102, name: 'Papas', price: 10 }
let current = []

const checks = []
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) })

current = cart.addOrMergeCartLine(current, cart.createCartLine(store, burger, 1, '', []))
current = cart.addOrMergeCartLine(current, cart.createCartLine(store, fries, 1, '', []))
check('dos productos diferentes permanecen en el carrito', current.length === 2)
check('el primer producto no fue reemplazado', current.some((line) => line.product.id === 101))
check('el segundo producto fue agregado', current.some((line) => line.product.id === 102))

current = cart.addOrMergeCartLine(current, cart.createCartLine(store, burger, 2, '', []))
check('la misma variante suma cantidad', current.length === 2 && current.find((line) => line.product.id === 101)?.quantity === 3)

current = cart.addOrMergeCartLine(current, cart.createCartLine(store, burger, 1, 'sin cebolla', []))
check('una nota distinta crea otra línea', current.length === 3)

current = cart.addOrMergeCartLine(current, cart.createCartLine(store, burger, 1, '', ['Cubiertos', 'Salsa']))
current = cart.addOrMergeCartLine(current, cart.createCartLine(store, burger, 1, '', ['Salsa', 'Cubiertos']))
const optionLine = current.find((line) => line.extras.includes('Salsa'))
check('el orden de extras no duplica la variante', current.length === 4 && optionLine?.quantity === 2)
check('las firmas son únicas', cart.cartHasUniqueLines(current))

const friesLine = current.find((line) => line.product.id === 102)
current = cart.updateCartLineById(current, friesLine.id, 2)
check('la cantidad se actualiza por ID de línea', current.find((line) => line.id === friesLine.id)?.quantity === 3)
current = cart.updateCartLineById(current, friesLine.id, -3)
check('una línea llega a cero sin borrar las demás', current.length === 3 && !current.some((line) => line.id === friesLine.id))

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`)
const failed = checks.filter((item) => !item.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} pruebas del carrito aprobadas.`)
try { fs.unlinkSync(temp) } catch {}
if (failed.length) process.exit(1)
