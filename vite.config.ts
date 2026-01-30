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

      // 🚀 INJEÇÃO FORÇADA R2 (DEFINITIVA V67)
      'import.meta.env.VITE_R2_ACCOUNT_ID': JSON.stringify(env.VITE_R2_ACCOUNT_ID || "f143a476c77f9ae5d723ca4c1414a2a9"),
      'import.meta.env.VITE_R2_ACCESS_KEY_ID': JSON.stringify(env.VITE_R2_ACCESS_KEY_ID || "f44f6fcf825b7cecd591244031956559"),
      'import.meta.env.VITE_R2_SECRET_ACCESS_KEY': JSON.stringify(env.VITE_R2_SECRET_ACCESS_KEY || "44439c36ecaf37e6f6a7d519a4f49be3e3dc05e04ae424f1146312cd029f6f69"),
      'import.meta.env.VITE_R2_BUCKET_NAME': JSON.stringify(env.VITE_R2_BUCKET_NAME || "fairstream-media"),
      'import.meta.env.VITE_R2_PUBLIC_DOMAIN': JSON.stringify(env.VITE_R2_PUBLIC_DOMAIN || "https://pub-99a7a23d0c59423cb2935c60315cb443.r2.dev/"),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
