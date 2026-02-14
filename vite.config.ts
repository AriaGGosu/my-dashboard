import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Sin sourcemaps en producción — ahorra RAM y tamaño
    sourcemap: false,
    // Aumentar límite de chunks para evitar warnings
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Separar dependencias pesadas en chunks independientes
        manualChunks: {
          'three-vendor': ['three'],
          'r3f-vendor': ['@react-three/fiber', '@react-three/drei'],
          'animation-vendor': ['gsap', 'framer-motion'],
        },
      },
    },
  },
})