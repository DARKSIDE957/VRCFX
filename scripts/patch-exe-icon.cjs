const path = require('path')
const { patchExecutableAt } = require('./patch-exe-branding.cjs')

const exePath = process.argv[2] || path.join(__dirname, '../release/win-unpacked/VRCFX.exe')
patchExecutableAt(exePath)
console.log('SUCCESS:', path.basename(exePath))
