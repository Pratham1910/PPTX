import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'PPTAutomation',
        short_name: 'PPTAuto',
        description: 'Markdown-first presentation editor — build professional decks in minutes',
        theme_color: '#6366f1',
        background_color: '#0f1117',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon.svg',     sizes: 'any',     type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Mermaid is 3.3 MB — raise the precache limit above the default 2 MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'fs/promises':      resolve(__dirname, 'src/_stubs/fs.ts'),
      'node:fs/promises': resolve(__dirname, 'src/_stubs/fs.ts'),
      'os':               resolve(__dirname, 'src/_stubs/os.ts'),
      'node:os':          resolve(__dirname, 'src/_stubs/os.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
