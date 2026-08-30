declare const __VRCFX_GH_TOKEN__: string

import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { spawn } from 'child_process'

/** Private GitHub releases feed for VRCFX updates */
export const UPDATE_REPO = {
  owner: 'DARKSIDE957',
  repo: 'VRCFX'
} as const

export type UpdateCheckResult = {
  status: 'up_to_date' | 'available' | 'downloading' | 'ready' | 'error' | 'dev_mode'
  currentVersion: string
  latestVersion?: string
  releaseName?: string
  releaseNotes?: string
  downloadUrl?: string
  progress?: number
  message?: string
  error?: string
}

type GitHubRelease = {
  tag_name: string
  name: string
  body?: string
  draft?: boolean
  prerelease?: boolean
  assets: {
    name: string
    browser_download_url: string
    url: string
    size: number
  }[]
}

function normalizeVersion(v: string): string {
  return v.trim().replace(/^v/i, '')
}

function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = normalizeVersion(b).split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0
    const db = pb[i] || 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

function resolveUpdateToken(): string {
  // Build-time inject (esbuild define) or runtime env
  const embedded =
    typeof __VRCFX_GH_TOKEN__ !== 'undefined' ? String(__VRCFX_GH_TOKEN__ || '') : ''
  if (embedded && embedded !== 'undefined') return embedded.trim()

  if (process.env.VRCFX_GH_TOKEN) return process.env.VRCFX_GH_TOKEN.trim()
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim()

  // Optional local secret file next to the packaged resources (never commit)
  try {
    const candidates = [
      path.join(process.resourcesPath || '', 'update-auth.json'),
      path.join(app.getPath('userData'), 'update-auth.json')
    ]
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
        if (raw?.token) return String(raw.token).trim()
      }
    }
  } catch {
    // ignore
  }
  return ''
}

function githubRequest(apiPath: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: apiPath,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'VRCFX-Updater',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`GitHub API ${res.statusCode}: ${body.slice(0, 200)}`))
            return
          }
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

function downloadFile(
  url: string,
  dest: string,
  token: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doRequest = (target: string, redirectsLeft: number) => {
      const parsed = new URL(target)
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: {
            Accept: 'application/octet-stream',
            'User-Agent': 'VRCFX-Updater',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirectsLeft > 0
          ) {
            doRequest(res.headers.location, redirectsLeft - 1)
            return
          }
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`Download failed (HTTP ${res.statusCode})`))
            return
          }

          const total = parseInt(res.headers['content-length'] || '0', 10)
          let received = 0
          const file = fs.createWriteStream(dest)
          res.on('data', (chunk: Buffer) => {
            received += chunk.length
            if (total > 0 && onProgress) {
              onProgress(Math.min(99, Math.round((received / total) * 100)))
            }
          })
          res.pipe(file)
          file.on('finish', () => {
            file.close()
            onProgress?.(100)
            resolve()
          })
          file.on('error', (err) => {
            try {
              fs.unlinkSync(dest)
            } catch {}
            reject(err)
          })
        }
      )
      req.on('error', reject)
      req.end()
    }
    doRequest(url, 5)
  })
}

function pickInstallerAsset(release: GitHubRelease): GitHubRelease['assets'][0] | null {
  const assets = release.assets || []
  const preferred =
    assets.find((a) => /setup.*\.exe$/i.test(a.name)) ||
    assets.find((a) => /\.exe$/i.test(a.name) && !/portable/i.test(a.name)) ||
    assets.find((a) => /\.exe$/i.test(a.name))
  return preferred || null
}

export class AppUpdater {
  private getWindow: () => BrowserWindow | null
  private busy = false

  constructor(getWindow: () => BrowserWindow | null) {
    this.getWindow = getWindow
  }

  private emit(channel: string, payload: any) {
    const win = this.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }

  public async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app.getVersion() || '1.0.0'

    if (!app.isPackaged) {
      return {
        status: 'dev_mode',
        currentVersion,
        message: 'Updates are available in the installed release build.'
      }
    }

    if (this.busy) {
      return {
        status: 'downloading',
        currentVersion,
        message: 'An update is already in progress…'
      }
    }

    const token = resolveUpdateToken()
    if (!token) {
      return {
        status: 'error',
        currentVersion,
        error: 'Update service is not configured for this build.'
      }
    }

    try {
      const release = (await githubRequest(
        `/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.repo}/releases/latest`,
        token
      )) as GitHubRelease

      if (!release?.tag_name || release.draft) {
        return {
          status: 'up_to_date',
          currentVersion,
          message: 'No published release found.'
        }
      }

      const latestVersion = normalizeVersion(release.tag_name)
      if (compareVersions(latestVersion, currentVersion) <= 0) {
        return {
          status: 'up_to_date',
          currentVersion,
          latestVersion,
          releaseName: release.name,
          message: `You're on the latest version (v${currentVersion}).`
        }
      }

      const asset = pickInstallerAsset(release)
      if (!asset) {
        return {
          status: 'error',
          currentVersion,
          latestVersion,
          error: 'A newer release exists, but no Windows installer was found.'
        }
      }

      return {
        status: 'available',
        currentVersion,
        latestVersion,
        releaseName: release.name,
        releaseNotes: release.body || '',
        downloadUrl: asset.url,
        message: `VRCFX v${latestVersion} is available.`
      }
    } catch (err: any) {
      return {
        status: 'error',
        currentVersion,
        error: err?.message || 'Failed to check for updates.'
      }
    }
  }

  public async checkAndInstall(): Promise<UpdateCheckResult> {
    const check = await this.checkForUpdates()
    if (check.status !== 'available' || !check.downloadUrl) {
      return check
    }

    const token = resolveUpdateToken()
    if (!token) {
      return { ...check, status: 'error', error: 'Update service is not configured for this build.' }
    }

    this.busy = true
    this.emit('update:status', {
      status: 'downloading',
      currentVersion: check.currentVersion,
      latestVersion: check.latestVersion,
      progress: 0,
      message: `Downloading VRCFX v${check.latestVersion}…`
    })

    try {
      const dest = path.join(
        app.getPath('temp'),
        `VRCFX-Setup-${check.latestVersion || 'update'}.exe`
      )
      if (fs.existsSync(dest)) {
        try {
          fs.unlinkSync(dest)
        } catch {}
      }

      await downloadFile(check.downloadUrl, dest, token, (progress) => {
        this.emit('update:status', {
          status: 'downloading',
          currentVersion: check.currentVersion,
          latestVersion: check.latestVersion,
          progress,
          message: `Downloading update… ${progress}%`
        })
      })

      this.emit('update:status', {
        status: 'ready',
        currentVersion: check.currentVersion,
        latestVersion: check.latestVersion,
        progress: 100,
        message: 'Starting installer…'
      })

      // Launch visible NSIS installer, then quit so files can be replaced
      const child = spawn(dest, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      })
      child.unref()

      setTimeout(() => {
        app.quit()
      }, 600)

      return {
        status: 'ready',
        currentVersion: check.currentVersion,
        latestVersion: check.latestVersion,
        message: 'Installer launched. VRCFX will close so the update can finish.'
      }
    } catch (err: any) {
      this.busy = false
      const result: UpdateCheckResult = {
        status: 'error',
        currentVersion: check.currentVersion,
        latestVersion: check.latestVersion,
        error: err?.message || 'Failed to download or launch the updater.'
      }
      this.emit('update:status', result)
      return result
    }
  }
}
