import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(); const ignored=new Set(['node_modules','.expo','android','ios','dist','dist-test','web-build','.git','.runtime']); let bytes=0; let files=0
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else{bytes+=fs.statSync(full).size;files++}}}
walk(root)
const checks=[
 ['código propio menor de 2 MB',bytes<2*1024*1024],
 ['sin pantallas Customer',!fs.existsSync(path.join(root,'app/(tabs)'))],
 ['sin pantallas Rider',!fs.existsSync(path.join(root,'app/rider.tsx'))],
 ['sin pantallas Control',!fs.existsSync(path.join(root,'app/admin.tsx'))],
 ['script de limpieza presente',fs.existsSync(path.join(root,'scripts/clean-business.ps1'))],
 ['script release presente',fs.existsSync(path.join(root,'scripts/build-release.ps1'))],
]
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${name}`)
console.log(`Fuente auditada: ${files} archivos · ${(bytes/1024).toFixed(1)} KB`)
if(checks.some(([,ok])=>!ok))process.exit(1)
