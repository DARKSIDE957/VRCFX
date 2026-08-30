/**
 * Generates build/icon.png + build/icon.ico for the Windows executable only.
 * Concept: OLED black + ornate frame + bold "F.X" (no extra elements).
 */
const sharp = require('sharp')
const pngToIco = require('png-to-ico')
const fs = require('fs')
const path = require('path')

const SIZE = 1024

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5a5a5a"/>
      <stop offset="50%" stop-color="#3a3a3a"/>
      <stop offset="100%" stop-color="#2a2a2a"/>
    </linearGradient>
  </defs>

  <!-- OLED black -->
  <rect width="${SIZE}" height="${SIZE}" fill="#000000"/>

  <!-- Outer frame -->
  <rect x="72" y="72" width="880" height="880" fill="none" stroke="url(#frameGrad)" stroke-width="7" rx="4"/>

  <!-- Inner frame -->
  <rect x="108" y="108" width="808" height="808" fill="none" stroke="#2e2e2e" stroke-width="3"/>

  <!-- Corner flourishes (simplified, crisp at small sizes) -->
  <g fill="none" stroke="#4a4a4a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <!-- top-left -->
    <path d="M108 200 C108 108 108 108 200 108"/>
    <path d="M132 176 C140 132 176 132 176 132"/>
    <path d="M148 220 C120 192 120 160 148 132"/>
    <!-- top-right -->
    <path d="M824 108 C916 108 916 108 916 200"/>
    <path d="M848 132 C848 132 884 132 892 176"/>
    <path d="M876 132 C904 160 904 192 876 220"/>
    <!-- bottom-left -->
    <path d="M108 824 C108 916 108 916 200 916"/>
    <path d="M132 892 C132 884 132 848 176 848"/>
    <path d="M148 876 C120 904 120 936 148 964"/>
    <!-- bottom-right -->
    <path d="M824 916 C916 916 916 916 916 824"/>
    <path d="M848 848 C884 848 892 884 892 892"/>
    <path d="M876 964 C904 936 904 904 876 876"/>
  </g>

  <!-- Mid-edge accents -->
  <g fill="none" stroke="#353535" stroke-width="4" stroke-linecap="round">
    <path d="M420 108 C460 118 500 118 540 108"/>
    <path d="M916 420 C906 460 906 500 916 540"/>
    <path d="M604 916 C564 906 524 906 484 916"/>
    <path d="M108 604 C118 564 118 524 108 484"/>
  </g>

  <!-- F.X — only logo text -->
  <text
    x="512"
    y="548"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Rockwell, 'Courier New', Courier, Georgia, serif"
    font-weight="700"
    font-size="290"
    fill="#FFFFFF"
    letter-spacing="-6"
  >F.X</text>
</svg>`

async function main() {
  const buildDir = path.join(__dirname, '../build')
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })

  const masterPng = await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer()

  const pngPath = path.join(buildDir, 'icon.png')
  fs.writeFileSync(pngPath, masterPng)
  console.log(`Wrote ${pngPath} (${SIZE}x${SIZE})`)

  const sizes = [256, 128, 64, 48, 32, 16]
  const tempPngs = []

  for (const size of sizes) {
    const tempPath = path.join(buildDir, `icon_${size}.png`)
    await sharp(masterPng)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(tempPath)
    tempPngs.push(tempPath)
  }

  const convertFn = pngToIco.default || pngToIco
  const icoBuffer = await convertFn(tempPngs)
  const icoPath = path.join(buildDir, 'icon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log(`Wrote ${icoPath} (${sizes.join(', ')}px frames)`)

  for (const p of tempPngs) fs.unlinkSync(p)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
