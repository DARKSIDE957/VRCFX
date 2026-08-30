#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
const version = pkg.version
const tag = `v${version}`
const releaseDir = path.join(__dirname, '..', 'release')

const setup =
  fs.readdirSync(releaseDir).find((f) => /^VRCFX-Setup-.*\.exe$/i.test(f)) ||
  fs.readdirSync(releaseDir).find((f) => /Setup.*\.exe$/i.test(f))

if (!setup) {
  console.error('No NSIS setup exe found in release/. Run npm run electron:dist first.')
  process.exit(1)
}

const setupPath = path.join(releaseDir, setup)
const notes = [
  `VRCFX ${tag}`,
  '',
  'Windows installer for the VRCFX companion.',
  'Install or update, then launch VRCFX from the Start menu or desktop shortcut.'
].join('\n')

const notesFile = path.join(releaseDir, 'release-notes.txt')
fs.writeFileSync(notesFile, notes, 'utf-8')

try {
  execSync(
    `gh release view ${tag} --repo DARKSIDE957/VRCFX`,
    { stdio: 'ignore' }
  )
  console.log(`Release ${tag} exists — uploading asset…`)
  execSync(
    `gh release upload ${tag} "${setupPath}" --repo DARKSIDE957/VRCFX --clobber`,
    { stdio: 'inherit' }
  )
} catch {
  console.log(`Creating release ${tag}…`)
  execSync(
    `gh release create ${tag} "${setupPath}" --repo DARKSIDE957/VRCFX --title "VRCFX ${tag}" --notes-file "${notesFile}"`,
    { stdio: 'inherit' }
  )
}

console.log(`Published ${setup} to DARKSIDE957/VRCFX ${tag}`)
