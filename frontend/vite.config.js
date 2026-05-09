import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Unique per production build so PWA purge + console logging work even without Vercel env (CI, previews).
const GIT_OR_CI_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.CI_COMMIT_SHA ||
  '';
const VITE_COMMIT_VALUE = GIT_OR_CI_SHA || `build-${Date.now()}`;

export default defineConfig({
  define: {
    // Build fingerprint: git SHA when available, else timestamp at `vite build` time.
    'import.meta.env.VITE_COMMIT': JSON.stringify(VITE_COMMIT_VALUE),
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        importScripts: ['sw-push.js'],
        // Do not precache HTML: Workbox's default SPA NavigationRoute serves precached
        // index.html for every navigation, which overrides NetworkFirst and keeps users
        // on an old app shell after deploys.
        globPatterns: ['**/*.{js,css,woff2,ico,png,svg,jpg,jpeg,gif,webp,json,webmanifest}'],
        // Disable default SPA fallback (NavigationRoute → precached index.html); combined
        // with navigate NetworkFirst below, document loads come from the network when online.
        navigateFallback: null,
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
        prefer_related_applications: false,
        related_applications: [
          { platform: 'webapp', url: 'https://pickletracker.onrender.com/manifest.webmanifest' },
        ],
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
