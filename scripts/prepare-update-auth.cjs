#!/usr/bin/env node
/**
 * Embeds a GitHub token for private-release updates at Electron build time.
 * Prefer a fine-grained PAT with read-only access to this private repo's contents/releases.
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const outFile = path.join(__dirname, '..', 'build', 'update-auth.json')

function resolveToken() {
  if (process.env.VRCFX_GH_TOKEN) return process.env.VRCFX_GH_TOKEN.trim()
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim()
  try {
    return execSync('gh auth token', { encoding: 'utf-8' }).trim()
  } catch {
    return ''
  }
}

const token = resolveToken()
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify({ token: token || '' }, null, 2), 'utf-8')
if (token) {
  console.log('Wrote build/update-auth.json for private update checks')
} else {
  console.warn('No GitHub token found — packaged Update button will not reach private releases')
}
