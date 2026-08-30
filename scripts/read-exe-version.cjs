const fs = require('fs')
const path = require('path')
const ResEdit = require('resedit')

const exePath = process.argv[2] || path.join(__dirname, '../release/win-unpacked/VRCFX.exe')
const buf = fs.readFileSync(exePath)
const exe = ResEdit.NtExecutable.from(buf, { ignoreCert: true })
const res = ResEdit.NtExecutableResource.from(exe)

const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries)
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)

console.log('EXE:', exePath)
console.log('Icon groups:', groups.map((g) => ({ id: g.id, lang: g.lang, icons: g.icons?.length })))
if (viList[0]) {
  const vi = viList[0]
  console.log('Version strings (1033):', vi.getStringValues({ lang: 1033, codepage: 1200 }))
}
