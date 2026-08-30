const { app, BrowserWindow, nativeImage } = require('electron')
const fs = require('fs')
const path = require('path')

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true
    }
  })

  const svgHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 512px;
            height: 512px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          .logo-container {
            width: 480px;
            height: 480px;
            border-radius: 96px;
            background: linear-gradient(135deg, #10121a 0%, #06070a 100%);
            border: 6px solid rgba(0, 242, 254, 0.4);
            box-shadow: 0 0 60px rgba(0, 242, 254, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: 82%;
            height: 82%;
          }
        </style>
      </head>
      <body>
        <div class="logo-container">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="50,6 92,28 92,72 50,94 8,72 8,28"
              stroke="#262b3d"
              stroke-width="3"
              fill="rgba(10, 12, 18, 0.95)"
            />
            <polygon
              points="50,12 86,31 86,69 50,88 14,69 14,31"
              stroke="#00f2fe"
              stroke-width="2.5"
              stroke-dasharray="18 6"
            />
            <path
              d="M28 35 L42 66 L50 48 L58 66 L72 35"
              stroke="url(#vrcfx-grad)"
              stroke-width="6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M50 48 L64 35"
              stroke="#ff0080"
              stroke-width="5"
              stroke-linecap="round"
            />
            <circle cx="50" cy="48" r="3.5" fill="#00f2fe" />
            <defs>
              <linearGradient id="vrcfx-grad" x1="28" y1="35" x2="72" y2="66" gradientUnits="userSpaceOnUse">
                <stop stop-color="#00f2fe" />
                <stop offset="0.5" stop-color="#7928ca" />
                <stop offset="1" stop-color="#ff0080" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </body>
    </html>
  `

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(svgHtml)}`)
  await new Promise((r) => setTimeout(r, 600))

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 })

  const buildDir = path.join(__dirname, '../build')
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })

  // Save 512x512 icon.png
  const png512 = image.toPNG()
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512)
  console.log('Saved build/icon.png (512x512)')

  // Generate ICO with multi-resolution PNG frames
  const sizes = [256, 128, 64, 48, 32, 16]
  const pngFrames = []

  for (const size of sizes) {
    const resized = image.resize({ width: size, height: size, quality: 'best' })
    pngFrames.push({ size, buffer: resized.toPNG() })
  }

  // Build Windows ICO file buffer
  const icoBuffer = createIcoFromPngBuffers(pngFrames)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
  console.log('Saved build/icon.ico with multi-resolution frames:', sizes)

  app.quit()
})

function createIcoFromPngBuffers(frames) {
  const count = frames.length
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffsetStart = headerSize + dirEntrySize * count

  let currentOffset = dataOffsetStart
  const entries = []

  for (const frame of frames) {
    const size = frame.size >= 256 ? 0 : frame.size
    const length = frame.buffer.length
    entries.push({
      width: size,
      height: size,
      colors: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: length,
      imageOffset: currentOffset,
      buffer: frame.buffer
    })
    currentOffset += length
  }

  const out = Buffer.alloc(currentOffset)
  // ICONDIR header
  out.writeUInt16LE(0, 0) // Reserved
  out.writeUInt16LE(1, 2) // Type 1 = ICO
  out.writeUInt16LE(count, 4) // Number of images

  let entryPos = headerSize
  for (const e of entries) {
    out.writeUInt8(e.width, entryPos)
    out.writeUInt8(e.height, entryPos + 1)
    out.writeUInt8(e.colors, entryPos + 2)
    out.writeUInt8(e.reserved, entryPos + 3)
    out.writeUInt16LE(e.planes, entryPos + 4)
    out.writeUInt16LE(e.bitCount, entryPos + 6)
    out.writeUInt32LE(e.bytesInRes, entryPos + 8)
    out.writeUInt32LE(e.imageOffset, entryPos + 12)
    entryPos += dirEntrySize

    e.buffer.copy(out, e.imageOffset)
  }

  return out
}
