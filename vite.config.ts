import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages — относительные пути; Vercel — корень домена
  base: process.env.VERCEL ? '/' : './',
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
