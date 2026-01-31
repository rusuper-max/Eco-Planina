import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EcoMountain - Upravljanje Otpadom',
        short_name: 'EcoMountain',
        description: 'Sistem za upravljanje prikupljanjem i reciklažom otpada',
        theme_color: '#10b981',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API calls with network-first strategy
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        // Don't cache these
        navigateFallbackDenylist: [/^\/api/, /^\/debug/],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid confusion
      },
    }),
  ],

  build: {
    // Increase chunk size warning limit (still aim to stay under)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Core React ecosystem - cached across all pages
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],

          // Supabase - used everywhere but heavy
          'vendor-supabase': [
            '@supabase/supabase-js',
          ],

          // Map libraries - only loaded on pages with maps
          'vendor-maps': [
            'leaflet',
            'react-leaflet',
            'react-leaflet-cluster',
          ],

          // Excel export - only loaded when exporting
          'vendor-excel': [
            'exceljs',
            'xlsx',
          ],

          // PDF generation - only loaded when generating PDFs
          'vendor-pdf': [
            '@react-pdf/renderer',
          ],

          // Error tracking - loaded async
          'vendor-sentry': [
            '@sentry/react',
          ],

          // UI utilities
          'vendor-ui': [
            'lucide-react',
            'react-hot-toast',
          ],
        },
      },
    },
  },
})
