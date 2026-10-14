import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const buildOutput = resolve(tmpdir(), 'company_2-ui-build')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: buildOutput, emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
