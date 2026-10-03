import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  server: { port: 5173, strictPort: true, fs: { allow: [repositoryRoot] } },
  plugins: [react()],
})
