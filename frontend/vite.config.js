import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'brand-logo.png', 'brand-logo2.png', 'brand-logo3.png'],
      manifest: {
        name: 'PickleTracker',
        short_name: 'PickleTracker',
        description: 'Track pickleball tournaments, schedules, and performance.',
        theme_color: '#1c350a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/brand-logo2.png',
            sizes: '1024x682',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/brand-logo.png',
            sizes: '1536x1024',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
