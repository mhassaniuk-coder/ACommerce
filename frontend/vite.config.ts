import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (normalizedId.includes('/node_modules/')) {
              if (
                normalizedId.includes('/react-router') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/react/')
              ) {
                return 'react-vendor';
              }
              if (normalizedId.includes('/@tanstack/react-query/') || normalizedId.includes('/axios/')) {
                return 'data-vendor';
              }
              if (normalizedId.includes('/@supabase/')) {
                return 'supabase-vendor';
              }
              if (
                normalizedId.includes('/firebase/auth/') ||
                normalizedId.includes('/@firebase/auth/') ||
                normalizedId.includes('/@firebase/app-check/')
              ) {
                return 'firebase-auth';
              }
              if (
                normalizedId.includes('/firebase/firestore/') ||
                normalizedId.includes('/firebase/storage/') ||
                normalizedId.includes('/@firebase/firestore/') ||
                normalizedId.includes('/@firebase/storage/')
              ) {
                return 'firebase-data';
              }
              if (
                normalizedId.includes('/firebase/app/') ||
                normalizedId.includes('/@firebase/app/') ||
                normalizedId.includes('/@firebase/component/') ||
                normalizedId.includes('/@firebase/util/')
              ) {
                return 'firebase-core';
              }
              if (
                normalizedId.includes('/firebase/analytics/') ||
                normalizedId.includes('/@firebase/analytics/')
              ) {
                return 'firebase-analytics';
              }
              if (normalizedId.includes('/framer-motion/')) {
                return 'motion-vendor';
              }
              if (normalizedId.includes('/recharts/')) {
                return 'charts-vendor';
              }
              if (normalizedId.includes('/lucide-react/')) {
                return 'icon-vendor';
              }
            }
          }
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
