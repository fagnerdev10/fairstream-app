import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// V36 FORCE RELOAD - CACHE BUSTER
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/asaas': {
          target: 'https://www.asaas.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
          secure: true
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_MODEL': JSON.stringify(env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'),

      // 🚀 INJEÇÃO FORÇADA R2 (DEFINITIVA V67) - SEM CHAVES HARDCODED
      'import.meta.env.VITE_R2_ACCOUNT_ID': JSON.stringify(env.VITE_R2_ACCOUNT_ID || ""),
      'import.meta.env.VITE_R2_ACCESS_KEY_ID': JSON.stringify(env.VITE_R2_ACCESS_KEY_ID || ""),
      'import.meta.env.VITE_R2_SECRET_ACCESS_KEY': JSON.stringify(env.VITE_R2_SECRET_ACCESS_KEY || ""),
      'import.meta.env.VITE_R2_BUCKET_NAME': JSON.stringify(env.VITE_R2_BUCKET_NAME || "fairstream-media"),
      'import.meta.env.VITE_R2_PUBLIC_DOMAIN': JSON.stringify(env.VITE_R2_PUBLIC_DOMAIN || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
