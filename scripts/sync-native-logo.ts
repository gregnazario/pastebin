/**
 * Copies the canonical web logo into Android and Apple native resource locations.
 * This prevents branding drift across web and native app shells.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

type LogoSyncTarget = {
  label: string
  path: string
}

const sourceLogoPath = resolve(process.cwd(), 'public/logo192.png')

const logoTargets: LogoSyncTarget[] = [
  {
    label: 'android',
    path: resolve(process.cwd(), 'native/android/app/src/main/res/drawable/pastebin_logo.png'),
  },
  {
    label: 'apple',
    path: resolve(process.cwd(), 'native/apple/AppShellDemoApp/Sources/Resources/pastebin-logo.png'),
  },
]

function ensureSourceExists(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Missing logo source: ${path}`)
  }
}

function copyLogoToTarget(sourcePath: string, target: LogoSyncTarget): void {
  mkdirSync(dirname(target.path), { recursive: true })
  copyFileSync(sourcePath, target.path)
  console.log(`Synced logo to ${target.label}: ${target.path}`)
}

function run(): void {
  ensureSourceExists(sourceLogoPath)

  for (const target of logoTargets) {
    copyLogoToTarget(sourceLogoPath, target)
  }

  console.log('Native logo sync complete.')
}

run()
