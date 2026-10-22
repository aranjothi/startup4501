import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }
import { serverUrl } from './src/lessons/serverUrl.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = serverUrl(env.VITE_AI_SERVER_URL)
  return {
  // Retired focus-mode media files are not part of the conversation prototype.
  publicDir: false,
  build: { assetsInlineLimit: 0, rollupOptions: { input: { main: 'index.html', mediaPermission: 'media-permission.html' } } },
  plugins: [
    react(),
    crx({ manifest: { ...manifest, host_permissions: [`${apiUrl}/*`] } }),
  ],
  }
})
