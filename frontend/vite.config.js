import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    // Set on Vercel builds so you can confirm which revision the tab is running (DevTools console).
    'import.meta.env.VITE_COMMIT': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || ''),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // New builds activate quickly so users do not stay on months-old cached bundles (PWA).
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        importScripts: ['sw-push.js'],
        // Always fetch fresh HTML from the network so every deployment reaches
        // users on their next visit — even if their SW is from an older build.
        // Falls back to the cached response only when the network is unavailable.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 5,
              cacheName: 'navigation-cache',
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'brand-logo.png', 'brand-logo2.png', 'brand-logo3.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'PickleTracker',
        short_name: 'PickleTracker',
        description: 'Track pickleball tournaments, log casual play and drills, analyse performance and connect with players nearby.',
        theme_color: '#1c350a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
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
