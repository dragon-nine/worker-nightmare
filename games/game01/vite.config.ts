import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/game01/',
  build: {
    outDir: '../../dist/game01',
    emptyOutDir: true,
  },
})
