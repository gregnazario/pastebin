import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use browser-compatible mock for argon2
      'argon2-browser': '/src/mocks/argon2-browser.ts',
      // Mock Shelby for local testing
      '../shelby/ShelbyService': '/src/mocks/shelby.ts',
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['argon2-browser'],
  },
});