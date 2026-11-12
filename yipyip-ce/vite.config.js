import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }
import { serverUrl } from './src/lessons/serverUrl.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Only ship the detector assets; retired permission pages stay disconnected.
const workCameraAssets = () => ({
  name: 'work-camera-assets',
  generateBundle() {
    const wasm = 'node_modules/@mediapipe/tasks-vision/wasm/'
    for (const file of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
      this.emitFile({ type: 'asset', fileName: `mediapipe/wasm/${file}`, source: readFileSync(new URL(wasm + file, import.meta.url)) })
    }
    this.emitFile({ type: 'asset', fileName: 'mediapipe/face_landmarker.task', source: readFileSync(new URL('assets/mediapipe/face_landmarker.task', import.meta.url)) })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = serverUrl(env.VITE_AI_SERVER_URL)
  return {
  resolve: { alias: mode === 'camera-test' ? [{ find: './faceDetector.js', replacement: fileURLToPath(new URL('tests/work-camera-detector.js', import.meta.url)) }] : [] },
  publicDir: false,
  build: { assetsInlineLimit: 0, rollupOptions: { input: { main: 'index.html', mediaPermission: 'media-permission.html' } } },
  plugins: [
    react(),
    workCameraAssets(),
    crx({ manifest: { ...manifest, host_permissions: [`${apiUrl}/*`] } }),
  ],
  }
})
