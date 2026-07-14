import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const relative = path.join(dir, entry.name)
  return entry.isDirectory() ? walk(relative) : [relative]
})
const checks = []
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) })

const provider = read('components/FeedbackProvider.tsx')
const layout = read('app/_layout.tsx')
const profile = read('app/profile.tsx')
const appFiles = [...walk('app'), ...walk('components')].filter((file) => /\.(tsx|ts)$/.test(file))
const alertCount = appFiles.reduce((sum, file) => sum + (read(file).match(/Alert\.alert\(/g)?.length ?? 0), 0)

check('FeedbackProvider existe', provider.includes('export function FeedbackProvider'))
check('FeedbackProvider envuelve la app', layout.includes('<FeedbackProvider><AppProvider>'))
check('Alert.alert se redirige al diseño propio', provider.includes('Alert.alert = (title, message, buttons, options)'))
check('Alert nativo se restaura al desmontar', provider.includes('Alert.alert = nativeAlert'))
check('toast DELIVER ASSETS disponible', provider.includes('showToast') && provider.includes('toastLayer'))
check('modal DELIVER ASSETS disponible', provider.includes('showDialog') && provider.includes('modalBackdrop'))
check('banner DELIVER ASSETS disponible', provider.includes('showBanner') && provider.includes('bannerLayer'))
check('mensajes anuncian accesibilidad', provider.includes('announceForAccessibility') && provider.includes('accessibilityLiveRegion'))
check('confirmaciones destructivas diferenciadas', provider.includes("tone === 'destructive'") && provider.includes('C.red'))
check('perfil usa mensajes propios directos', profile.includes('useFeedback') && profile.includes('showToast') && profile.includes('showDialog'))
check('perfil valida correo', profile.includes('emailPattern') && profile.includes('Revisa el correo'))
check('perfil valida teléfono', profile.includes("replace(/\\D/g, '')") && profile.includes('entre 7 y 15'))
check('perfil protege cambios sin guardar', profile.includes('Cambios sin guardar') && profile.includes('hardwareBackPress'))
check('botón guardar refleja estado', profile.includes('SIN CAMBIOS PENDIENTES') && profile.includes('disabled={!dirty'))
check('explicación propia antes de permisos', profile.includes('Acceso a tus fotos') && profile.includes('Usar la cámara'))
check('todos los Alert existentes quedan interceptados', alertCount > 0 && provider.includes('Alert.alert ='))

const failed = checks.filter((item) => !item.ok)
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`)
console.log(`\n${checks.length - failed.length}/${checks.length} verificaciones de mensajes aprobadas. Alert interceptados: ${alertCount}.`)
if (failed.length) process.exit(1)
