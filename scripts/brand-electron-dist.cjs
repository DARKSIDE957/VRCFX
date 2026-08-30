/**
 * Rebrand node_modules/electron/dist/electron.exe so even accidental `electron .`
 * launches show VRCFX in Task Manager / taskbar instead of Electron.
 */
const path = require('path')
const fs = require('fs')
const { patchExecutableAt } = require('./patch-exe-branding.cjs')

const electronExe = path.join(__dirname, '../node_modules/electron/dist/electron.exe')

if (!fs.existsSync(electronExe)) {
  console.log('[brand-electron] electron.exe not installed yet — skip')
  process.exit(0)
}

try {
  console.log('[brand-electron] Patching dev Electron binary...')
  patchExecutableAt(electronExe)
  console.log('[brand-electron] Done — dev runs will not show Electron branding')
} catch (err) {
  console.warn('[brand-electron] Warning:', err.message || err)
}
