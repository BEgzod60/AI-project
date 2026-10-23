import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8001';

export default defineConfig({
  // HTTPS=1 — telefonda mikrofonni sinash uchun (brauzer faqat HTTPS'da ruxsat beradi)
  plugins: [react(), ...(process.env.HTTPS ? [basicSsl()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Uzoq muddatli kesh: vendor, react-router va har bir sahifa ajratiladi
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/media': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
