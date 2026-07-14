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
const temp = path.join(os.tmpdir(), `deliver-assets-multicart-${Date.now()}.mjs`)
fs.writeFileSync(temp, output)
const cart = await import(`${pathToFileURL(temp).href}?v=${Date.now()}`)

const market = { id: 4, name: 'Mercado 24' }
const burger = { id: 1, name: 'Barrio Burger' }
const milk = { id: 401, name: 'Leche', price: 6 }
const bread = { id: 402, name: 'Pan', price: 5 }
const classic = { id: 101, name: 'Burger clásica', price: 20 }
const fries = { id: 102, name: 'Papas', price: 10 }

let all = []
const checks = []
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) })

all = cart.addOrMergeCartLine(all, cart.createCartLine(market, milk, 1, '', []))
all = cart.addOrMergeCartLine(all, cart.createCartLine(market, bread, 2, '', []))
all = cart.addOrMergeCartLine(all, cart.createCartLine(burger, classic, 1, '', []))
all = cart.addOrMergeCartLine(all, cart.createCartLine(burger, fries, 1, '', []))

check('dos comercios conservan cuatro líneas', all.length === 4)
check('Mercado 24 conserva sus dos productos', all.filter((line) => line.storeId === 4).length === 2)
check('Barrio Burger conserva sus dos productos', all.filter((line) => line.storeId === 1).length === 2)
check('las firmas incluyen el comercio', new Set(all.map((line) => line.signature)).size === 4)

all = cart.addOrMergeCartLine(all, cart.createCartLine(burger, classic, 2, '', []))
check('agregar de nuevo en Burger suma sin tocar Mercado', all.find((line) => line.storeId === 1 && line.product.id === 101)?.quantity === 3 && all.filter((line) => line.storeId === 4).length === 2)

const marketCart = all.filter((line) => line.storeId === 4)
const burgerCart = all.filter((line) => line.storeId === 1)
check('un checkout puede filtrar solo Mercado', marketCart.every((line) => line.storeId === 4) && marketCart.length === 2)
check('un checkout puede filtrar solo Burger', burgerCart.every((line) => line.storeId === 1) && burgerCart.length === 2)

all = all.filter((line) => line.storeId !== 4)
check('vaciar Mercado no elimina Burger', all.length === 2 && all.every((line) => line.storeId === 1))

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`)
const failed = checks.filter((item) => !item.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} pruebas multi-carrito aprobadas.`)
try { fs.unlinkSync(temp) } catch {}
if (failed.length) process.exit(1)
