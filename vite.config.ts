import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const ghClientId = (env.VITE_GITHUB_CLIENT_ID || env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || 'Ov23liemnwcrhjAbci6R').replace(/["',;]/g, '').trim();
    const googleClientId = (env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').replace(/["',;]/g, '').trim();
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      base: '/',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 2500,
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                return 'vendor';
              }
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.VITE_GITHUB_CLIENT_ID': JSON.stringify(ghClientId),
        'process.env.GITHUB_CLIENT_ID': JSON.stringify(ghClientId),
        'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(googleClientId)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
