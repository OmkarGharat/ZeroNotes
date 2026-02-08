import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import Sitemap from 'vite-plugin-sitemap';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      Sitemap({
        hostname: 'https://zeronotes.vercel.app',
        exclude: ['/google3e6afdea06b1bb18.html']
      })
    ],
    build: {
      outDir: 'dist',
      target: 'esnext',
      sourcemap: false,
      minify: 'terser', // BlockSuite is large, terser helps
      chunkSizeWarningLimit: 2000,
    },
    server: {
      host: true,
      port: 5173,
    },
    optimizeDeps: {
      include: [
        '@blocksuite/presets',
        '@blocksuite/store',
        '@blocksuite/blocks',
        '@blocksuite/global',
        '@blocksuite/icons/lit',
        'yjs',
        'pako',
        'lodash'
      ]
      ,
    },
    define: {
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
      'global': 'window'
    }

  };
});