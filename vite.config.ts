import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath, URL } from 'url'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig, type Plugin } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin to copy clay.wasm to the output directory after build.
 *
 * The @shelby-protocol/clay-codes package loads clay.wasm at runtime using
 * paths relative to the bundled JS file. Nitro bundles the JS but doesn't
 * copy the WASM file, so we need to do it manually.
 *
 * This uses Vite's closeBundle hook to run after all builds complete,
 * avoiding conflicts with Nitro's preset hooks.
 *
 * See CLAUDE.md for more details.
 */
function copyClayWasmPlugin(): Plugin {
  return {
    name: 'copy-clay-wasm',
    apply: 'build',
    closeBundle() {
      const source = resolve(__dirname, 'node_modules/@shelby-protocol/clay-codes/dist/clay.wasm')

      // Vercel uses .vercel/output, local builds use .output
      const isVercel = !!process.env.VERCEL

      // For Vercel, copy to __server.func where the actual server code lives
      const destinations = isVercel
        ? [
            resolve(__dirname, '.vercel/output/functions/__server.func/_chunks/_libs/@shelby-protocol/clay.wasm'),
            resolve(__dirname, '.vercel/output/functions/__server.func/_chunks/_libs/dist/clay.wasm'),
          ]
        : [
            resolve(__dirname, '.output/server/_chunks/_libs/@shelby-protocol/clay.wasm'),
            resolve(__dirname, '.output/server/_chunks/_libs/dist/clay.wasm'),
          ]

      if (!existsSync(source)) {
        console.warn('[copy-wasm] Source clay.wasm not found:', source)
        return
      }

      console.log('[copy-wasm] Building for:', isVercel ? 'Vercel' : 'local')

      for (const dest of destinations) {
        try {
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(source, dest)
          console.log('[copy-wasm] Copied clay.wasm to:', dest)
        } catch (error) {
          console.error('[copy-wasm] Failed to copy to:', dest, error)
        }
      }
    },
  }
}

const config = defineConfig(({ mode }) => ({
  define: {
    // Make build mode available in both client and server code
    '__BUILD_MODE__': JSON.stringify(mode),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    // Nitro enables deployment to Vercel, Netlify, Cloudflare, etc.
    nitro({
      // Use Vercel preset when VERCEL env var is set (auto-set by Vercel)
      preset: process.env.VERCEL ? 'vercel' : undefined,
    }),
    viteReact(),
    // Copy clay.wasm after build - see CLAUDE.md for details
    copyClayWasmPlugin(),
    // Note: Compression (gzip/brotli) should be handled at deployment level
    // (Vercel, Cloudflare, Nginx automatically compress responses)
  ],
  build: {
    // Target modern browsers that support ES2022 features needed by crypto libraries
    // Chrome 92+, Firefox 91+, Safari 15.4+, Edge 92+
    target: ['es2022', 'chrome92', 'firefox91', 'safari15.4', 'edge92'],
    // SECURITY: Disable source maps in production to prevent source code exposure
    // Source maps reveal implementation details, file structure, and original code,
    // making reverse engineering easier and potentially exposing security logic.
    // In development, source maps are enabled for debugging.
    sourcemap: process.env.NODE_ENV !== 'production',
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate heavy crypto libraries into their own chunk
          if (id.includes('@noble/post-quantum') ||
              id.includes('@noble/ciphers') ||
              id.includes('@noble/hashes') ||
              id.includes('hash-wasm')) {
            return 'crypto'
          }
          // Separate Aptos SDK (large dependency)
          if (id.includes('@aptos-labs/ts-sdk')) {
            return 'blockchain'
          }
          // React core (rarely changes, cached long-term)
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          // Router
          if (id.includes('@tanstack/react-router') &&
              !id.includes('devtools')) {
            return 'router'
          }
        },
      },
    },
    // Increase chunk size warning limit for crypto libs
    chunkSizeWarningLimit: 600,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
    ],
  },
}))

export default config
