import path from 'path'
import { defineConfig, type Plugin } from 'vite'

/* ------------------------------------------------------------------ */
/*  Custom esbuild transform — replaces Vite's built-in esbuild.      */
/*  Transforms all src .ts/.tsx with esbuild and ZERO sourcemaps,     */
/*  preventing the multi-GB memory allocation that crashes Node.      */
/* ------------------------------------------------------------------ */

function esbuildTransformPlugin(): Plugin {
  return {
    name: 'esbuild-no-sourcemap',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.tsx?$/.test(id) || id.includes('node_modules')) return null
      if (!/[\\/]src[\\/]/.test(id)) return null

      const loader = id.endsWith('.ts') ? ('ts' as const) : ('tsx' as const)
      const { transform } = await import('esbuild')
      const result = await transform(code, {
        loader,
        jsx: 'automatic',
        jsxImportSource: 'react',
        target: 'esnext',
        sourcemap: false,
      })
      return { code: result.code, map: null }
    },
  }
}

/* ------------------------------------------------------------------ */

export default defineConfig({
  plugins: [
    esbuildTransformPlugin(),
  ],

  /* Disable Vite's built-in esbuild — our plugin handles everything */
  esbuild: false,

  server: {
    /* Don't pre-transform files in the background after startup */
    preTransformRequests: false,
    warmup: { clientFiles: [] },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  css: { devSourcemap: false },

  optimizeDeps: {
    esbuildOptions: { sourcemap: false },
  },

  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
          'r3f-vendor': ['@react-three/fiber', '@react-three/drei'],
          'animation-vendor': ['gsap', 'framer-motion'],
        },
      },
    },
  },
})
