const fs = require('fs')
const path = require('path')
const ResEdit = require('resedit')

const APP_NAME = 'VRCFX'

function patchExecutableAt(exePath) {
  if (!fs.existsSync(exePath)) {
    throw new Error(`Executable not found: ${exePath}`)
  }

  const iconPath = path.join(__dirname, '../build/icon.ico')
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon not found: ${iconPath} — run: node scripts/generate-exe-icon.cjs`)
  }

  const exeBuffer = fs.readFileSync(exePath)
  const exe = ResEdit.NtExecutable.from(exeBuffer, { ignoreCert: true })
  const res = ResEdit.NtExecutableResource.from(exe)

  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath))
  const iconData = iconFile.icons.map((item) => item.data)
  const iconGroups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)

  if (iconGroups.length === 0) {
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, iconData)
  } else {
    for (const group of iconGroups) {
      ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        group.id,
        group.lang,
        iconData
      )
    }
  }

  const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries)
  if (viList.length > 0) {
    const vi = viList[0]
    vi.setFileVersion(1, 0, 0, 0, 1033)
    vi.setProductVersion(1, 0, 0, 0, 1033)
    vi.setStringValues(
      { lang: 1033, codepage: 1200 },
      {
        CompanyName: APP_NAME,
        FileDescription: APP_NAME,
        ProductName: APP_NAME,
        InternalName: APP_NAME,
        OriginalFilename: 'VRCFX.exe',
        LegalCopyright: `Copyright ${new Date().getFullYear()} ${APP_NAME}`
      }
    )
    vi.outputToResourceEntries(res.entries)
  }

  res.outputResource(exe)
  fs.writeFileSync(exePath, Buffer.from(exe.generate()))
}

module.exports = { patchExecutableAt }

if (require.main === module) {
  const exePath = process.argv[2] || path.join(__dirname, '../release/win-unpacked/VRCFX.exe')
  try {
    console.log('Branding', exePath)
    patchExecutableAt(exePath)
    console.log('SUCCESS:', path.basename(exePath))
  } catch (err) {
    console.error(err.message || err)
    process.exit(1)
  }
}
