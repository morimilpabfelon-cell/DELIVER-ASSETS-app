import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(); const read=(f)=>fs.readFileSync(path.join(root,f),'utf8'); const checks=[]; const check=(n,c)=>checks.push({n,ok:Boolean(c)})
const layout=read('app/_layout.tsx'); const provider=read('components/FeedbackProvider.tsx'); const business=read('app/business.tsx'); const profile=read('app/business-profile.tsx'); const product=read('app/product/[id].tsx')
check('FeedbackProvider envuelve Business',layout.includes('<FeedbackProvider><AppProvider>'))
check('Alert.alert interceptado',provider.includes('Alert.alert ='))
check('toast accesible',provider.includes('announceForAccessibility')&&provider.includes('accessibilityLiveRegion'))
check('modal propio',provider.includes('<Modal')&&provider.includes('DELIVER ASSETS'))
check('confirmación destructiva propia',business.includes('¿Rechazar pedido?')&&profile.includes('¿Eliminar logo?'))
check('éxitos mediante toast',business.includes('showToast')&&profile.includes('showToast'))
check('permisos explicados antes de Android',profile.includes('Elegir logo')&&profile.includes('Fotografiar el local')&&product.includes('Elegir foto del producto')&&product.includes('Fotografiar producto'))
const failed=checks.filter(x=>!x.ok); for(const x of checks) console.log(`${x.ok?'PASS':'FAIL'} · ${x.n}`); console.log(`\n${checks.length-failed.length}/${checks.length} verificaciones de mensajes aprobadas.`); if(failed.length)process.exit(1)
