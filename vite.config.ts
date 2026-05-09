import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/static': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
} as const

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { ...apiProxy } },
  preview: { proxy: { ...apiProxy } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
