import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed on GitHub Pages under https://<user>.github.io/citation-generator/
// so assets must be served from that sub-path.
export default defineConfig({
  base: '/citation-generator/',
  plugins: [react()],
  server: { port: 5173, open: true },
})
