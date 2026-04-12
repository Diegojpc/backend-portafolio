import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2017',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        manualChunks: {
          vendor_three: ['three', '@react-three/fiber', '@react-three/drei'],
          vendor_motion: ['framer-motion', 'gsap'],
        },
      },
    },
  },
  server: {
    host: true,
  },
});