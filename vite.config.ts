import { fileURLToPath, URL } from 'url'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vite'

/**
 * Vite/Nitro config for the SecuPaste web app.
 *
 * Encrypted blob persistence uses filesystem or S3-compatible storage on the
 * server. There is no WASM copy step; the former Shelby clay.wasm plugin was
 * removed with that backend.
 */
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
