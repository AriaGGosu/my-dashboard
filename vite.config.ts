import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

/**
 * Large TSX/TS files cause Vite's sourcemap pipeline to allocate multi-GB
 * buffers, crashing Node.  This plugin intercepts any source file over
 * SIZE_THRESHOLD bytes (or matching KNOWN_HEAVY_RE) and transforms it with
 * esbuild — fast, native, and without sourcemaps — so downstream plugins
 * never see a huge sourcemap to combine.
 */
const SIZE_THRESHOLD = 50_000 // bytes
const KNOWN_HEAVY_RE =
  /[\\/](?:pages[\\/](?:Valentine\.tsx|valentine[\\/].+\.tsx?)|components[\\/]visuals[\\/].+\.tsx?)$/

function heavyFileTransform(): Plugin {
  return {
    name: 'heavy-file-esbuild-transform',
    enforce: 'pre',
    async transform(code, id) {
      if (!/[\\/]src[\\/].*\.tsx?$/.test(id) || id.includes('node_modules')) return null

      const short = id.replace(/.*[\\/]src[\\/]/, 'src/')
      const isHeavy = code.length >= SIZE_THRESHOLD || KNOWN_HEAVY_RE.test(id)

      if (isHeavy) {
        console.log(`[heavy-transform] esbuild → ${short} (${(code.length/1024).toFixed(0)} KB)`)
      }

      // Transform ALL source files with esbuild (no sourcemaps) to avoid
      // the 7.5 GB external allocation from Vite's sourcemap pipeline.
      const loader = id.endsWith('.ts') ? 'ts' : 'tsx'
      const { transform } = await import('esbuild')
      const result = await transform(code, {
        loader,
        jsx: 'automatic',
        target: 'esnext',
        sourcemap: false,
      })
      return { code: result.code, map: { version: 3, sources: [], mappings: '' } }
    },
  }
}

export default defineConfig({
  plugins: [
    heavyFileTransform(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  css: {
    devSourcemap: false,
  },
  optimizeDeps: {
    esbuildOptions: { sourcemap: false },
    // Pre-bundle only light deps explicitly.  The three.js ecosystem
    // (three, drei, rapier, r3f) is excluded because bundling it in one
    // pass triggers a 7.5 GB allocation that crashes Node.  Vite will
    // serve those packages directly from node_modules as native ESM.
    noDiscovery: true,
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router-dom',
      'framer-motion',
      'gsap',
      'lenis',
      'lenis/react',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'lucide-react',
    ],
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
