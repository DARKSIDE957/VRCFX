/**
 * Dev launcher: prefer branded VRCFX.exe (correct taskbar/Task Manager identity)
 * with Vite HMR. Falls back to stock electron.exe if release build is missing.
 */
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const root = path.join(__dirname, '..')
const brandedExe = path.join(root, 'release/win-unpacked/VRCFX.exe')
const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

const env = {
  ...process.env,
  VITE_DEV_SERVER_URL: devUrl
}

function run(cmd, args, label) {
  console.log(`[VRCFX] ${label}`)
  const child = spawn(cmd, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: false
  })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 0)
  })
}

if (fs.existsSync(brandedExe)) {
  run(brandedExe, [], `Starting branded app: ${brandedExe}`)
} else {
  const electronPath = require('electron')
  console.warn(
    '[VRCFX] release/win-unpacked/VRCFX.exe not found — using Electron dev binary (Task Manager will show "Electron").'
  )
  console.warn('[VRCFX] Run: npm run electron:build — then npm start for correct branding.')
  run(electronPath, ['.'], 'Starting electron .')
}
