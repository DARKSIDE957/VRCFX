const sharp = require('sharp')
const pngToIco = require('png-to-ico')
const fs = require('fs')
const path = require('path')

async function main() {
  const sourceImage = 'C:\\Users\\Pc\\.gemini\\antigravity-ide\\brain\\1c4c0cb6-eda3-485a-b6f1-28c6ca9abb09\\.user_uploaded\\media_1787869889666.png'
  const buildDir = path.join(__dirname, '../build')
  const publicDir = path.join(__dirname, '../public')
  const srcAssetsDir = path.join(__dirname, '../src/assets')

  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
  if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true })

  // 1. Generate 512x512 PNG
  const png512Path = path.join(buildDir, 'icon.png')
  await sharp(sourceImage)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(png512Path)
  console.log('Created build/icon.png (512x512)')

  // Copy to public/icon.png and src/assets/logo.png
  await sharp(sourceImage)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'icon.png'))

  await sharp(sourceImage)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toFile(path.join(srcAssetsDir, 'logo.png'))

  // 2. Generate 256, 128, 64, 48, 32, 16 PNGs for ICO
  const sizes = [256, 128, 64, 48, 32, 16]
  const tempPngs = []

  for (const size of sizes) {
    const tempPath = path.join(buildDir, `icon_${size}.png`)
    await sharp(sourceImage)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(tempPath)
    tempPngs.push(tempPath)
  }

  // 3. Convert to multi-resolution Windows ICO
  const convertFn = pngToIco.default || pngToIco
  const icoBuffer = await convertFn(tempPngs)
  const icoPath = path.join(buildDir, 'icon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log('Created build/icon.ico successfully with multi-resolution frames!')

  // Cleanup temp intermediate pngs
  for (const p of tempPngs) {
    fs.unlinkSync(p)
  }
}

main().catch(console.error)
