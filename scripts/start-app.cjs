/**
 * Launch ONLY the branded VRCFX.exe — never stock electron.exe.
 */
const fs = require('fs')
const path = require('path')
const { spawn, execSync } = require('child_process')

const root = path.join(__dirname, '..')
const brandedExe = path.join(root, 'release/win-unpacked/VRCFX.exe')
const isDev = process.argv.includes('--dev')

function ensureReleaseBuild() {
  if (fs.existsSync(brandedExe)) return
  console.log('[VRCFX] Building branded VRCFX.exe (first run)...')
  execSync('npm run electron:build', { cwd: root, stdio: 'inherit' })
  if (!fs.existsSync(brandedExe)) {
    console.error('[VRCFX] Build failed — VRCFX.exe was not created.')
    process.exit(1)
  }
}

function killStrayElectron() {
  if (process.platform !== 'win32') return
  try {
    execSync(
      'powershell -NoProfile -Command "Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force"',
      { stdio: 'ignore' }
    )
  } catch {
    // none running
  }
}

ensureReleaseBuild()
killStrayElectron()

const env = { ...process.env }
if (isDev) {
  env.VITE_DEV_SERVER_URL = env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
} else {
  delete env.VITE_DEV_SERVER_URL
}

console.log(`[VRCFX] Launching ${brandedExe}${isDev ? ' (dev / HMR)' : ''}`)

const child = spawn(brandedExe, [], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: false
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
