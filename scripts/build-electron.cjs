const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')

let token = ''
try {
  const authPath = path.join(__dirname, '..', 'build', 'update-auth.json')
  if (fs.existsSync(authPath)) {
    token = JSON.parse(fs.readFileSync(authPath, 'utf-8')).token || ''
  }
} catch {}

if (!token) {
  token = process.env.VRCFX_GH_TOKEN || process.env.GH_TOKEN || ''
}

const define = {
  __VRCFX_GH_TOKEN__: JSON.stringify(token || '')
}

esbuild.buildSync({
  entryPoints: ['electron/main.ts'],
  outfile: 'dist-electron/main.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['electron'],
  define
})

esbuild.buildSync({
  entryPoints: ['electron/preload.ts'],
  outfile: 'dist-electron/preload.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['electron']
})

console.log(
  token
    ? 'Electron main built with private update token embedded'
    : 'Electron main built without update token (Update needs auth for private releases)'
)
