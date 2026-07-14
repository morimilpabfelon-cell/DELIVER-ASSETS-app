import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(); const checks=[]; const check=(n,c)=>checks.push({n,ok:Boolean(c)});
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo; const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
check('versión 2.6.0',pkg.version==='2.6.0'&&app.version==='2.6.0');
check('paquete Android exclusivo',app.android.package==='com.deliverassets.customer');
check('bundle iOS exclusivo',app.ios.bundleIdentifier==='com.deliverassets.customer');
check('rol fijo en auth',fs.readFileSync(path.join(root,'app/auth.tsx'),'utf8').includes("const APP_ROLE: AppRole = 'cliente'"));
check('sin selector de cuatro roles',!fs.existsSync(path.join(root,'app/role-select.tsx')));
check('namespace de persistencia exclusivo',fs.readFileSync(path.join(root,'services/persistence.ts'),'utf8').includes("@deliver-assets/customer-state-v2"));
check('conserva app/(tabs)/index.tsx',fs.existsSync(path.join(root,'app/(tabs)/index.tsx')));
check('conserva app/checkout.tsx',fs.existsSync(path.join(root,'app/checkout.tsx')));
check('conserva app/shipment/[id].tsx',fs.existsSync(path.join(root,'app/shipment/[id].tsx')));
check('conserva app/tracking.tsx',fs.existsSync(path.join(root,'app/tracking.tsx')));
check('excluye app/business.tsx',!fs.existsSync(path.join(root,'app/business.tsx')));
check('excluye app/rider.tsx',!fs.existsSync(path.join(root,'app/rider.tsx')));
check('excluye app/admin.tsx',!fs.existsSync(path.join(root,'app/admin.tsx')));
check('excluye app/role-select.tsx',!fs.existsSync(path.join(root,'app/role-select.tsx')));
const failed=checks.filter(x=>!x.ok); for(const x of checks)console.log(`${x.ok?'PASS':'FAIL'} · ${x.n}`); console.log(`\n${checks.length-failed.length}/${checks.length} verificaciones aprobadas.`); if(failed.length)process.exit(1);
