import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'script',
      manifest: {
        id: './',
        name: 'Whack-a-Note',
        short_name: 'Whack-a-Note',
        description:
          'A fast, playful music-reading game for practising treble and bass clef notes.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#eaf6f4',
        theme_color: '#3e5eb8',
        icons: [
          {
            src: './whack-a-note-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './whack-a-note-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: './whack-a-note-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
