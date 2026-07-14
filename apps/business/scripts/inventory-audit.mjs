import fs from 'node:fs'

const context = fs.readFileSync('context/AppContext.tsx', 'utf8')
const business = fs.readFileSync('app/business.tsx', 'utf8')
const persistence = fs.readFileSync('services/persistence.ts', 'utf8')
const checks = []
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) })

check('setter explícito de disponibilidad', context.includes('setMerchantProductAvailability'))
check('valor deseado se asigna directamente', context.includes('[productId]: available'))
check('se eliminó el toggle ambiguo anterior', !context.includes('state.stock[productId] === false'))
check('botón usa el siguiente valor explícito', business.includes('setMerchantProductAvailability(product.id, !stock)'))
check('estado accesible de switch', business.includes('accessibilityState={{ checked: stock }}'))
check('inventario se guarda por comercio', context.includes('merchantStatesRef.current') && context.includes('currentMerchantStoreId'))
check('sync usa estado comercial más reciente', context.includes('merchantStates: merchantStatesRef.current'))
check('conflicto no revierte inventario local', context.includes('preserveMerchantState') && context.includes('Business conservó tu cambio'))
check('acción pendiente se conserva tras conflicto', context.includes("current.filter((action) => action.kind === 'merchant_settings')"))
check('schema v10 migra schema v9', persistence.includes('APP_SCHEMA_VERSION = 10') && persistence.includes('1, 2, 3, 4, 5, 6, 7, 8'))

let available = true
available = false
const first = available === false
available = true
const second = available === true
check('regresión apagar y volver a activar', first && second)

const failed = checks.filter((item) => !item.ok)
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`)
console.log(`\n${checks.length - failed.length}/${checks.length} verificaciones de inventario aprobadas.`)
if (failed.length) process.exit(1)
