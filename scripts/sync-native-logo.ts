/**
 * Copies the canonical web logo into Android and Apple native resource locations.
 * This prevents branding drift across web and native app shells.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

type LogoSyncTarget = {
  label: string
  sourcePath: string
  path: string
}

const logoTargets: LogoSyncTarget[] = [
  {
    label: 'android',
    sourcePath: resolve(process.cwd(), 'public/logo192.png'),
    path: resolve(process.cwd(), 'native/android/app/src/main/res/drawable/pastebin_logo.png'),
  },
  {
    label: 'apple',
    sourcePath: resolve(process.cwd(), 'public/logo512.png'),
    // iOS app icon variants are generated from this source in the Xcode pre-build phase.
    path: resolve(process.cwd(), 'native/apple/Assets.xcassets/pastebin-logo.imageset/pastebin-logo.png'),
  },
]

function ensureSourceExists(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Missing logo source: ${path}`)
  }
}

function copyLogoToTarget(target: LogoSyncTarget): void {
  ensureSourceExists(target.sourcePath)
  mkdirSync(dirname(target.path), { recursive: true })
  copyFileSync(target.sourcePath, target.path)
  console.log(`Synced logo to ${target.label}: ${target.path}`)
}

function run(): void {
  for (const target of logoTargets) {
    copyLogoToTarget(target)
  }

  console.log('Native logo sync complete.')
}

run()
