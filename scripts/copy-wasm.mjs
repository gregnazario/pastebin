/**
 * Post-build script to copy clay.wasm to the correct location
 *
 * The @shelby-protocol/clay-codes package loads clay.wasm at runtime using
 * paths relative to the bundled JS file. After Nitro bundles the code,
 * the WASM file needs to be copied to the output directory.
 *
 * See CLAUDE.md for more details on this requirement.
 */

import { copyFile, mkdir } from 'fs/promises'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const source = resolve(
  projectRoot,
  'node_modules/@shelby-protocol/clay-codes/dist/clay.wasm'
)

const destinations = [
  // Primary location where the bundled clay-codes.mjs looks for it
  resolve(projectRoot, '.output/server/_chunks/_libs/@shelby-protocol/clay.wasm'),
  // Fallback location (../dist/clay.wasm from the bundled file)
  resolve(projectRoot, '.output/server/_chunks/_libs/dist/clay.wasm'),
]

async function copyWasm() {
  console.log('Copying clay.wasm to output directories...')

  for (const dest of destinations) {
    try {
      // Ensure the destination directory exists
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(source, dest)
      console.log(`  ✓ Copied to ${dest}`)
    } catch (error) {
      console.error(`  ✗ Failed to copy to ${dest}:`, error.message)
    }
  }

  console.log('Done!')
}

copyWasm().catch((error) => {
  console.error('Failed to copy WASM files:', error)
  process.exit(1)
})
