import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/scan-line': 'http://localhost:3002',
      '/api/generate': 'http://localhost:3002',
    },
  },
})
