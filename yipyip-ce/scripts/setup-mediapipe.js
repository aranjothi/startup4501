import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const dest = resolve(root, 'public/mediapipe/wasm')

mkdirSync(dest, { recursive: true })

const files = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

for (const file of files) {
  const srcFile = resolve(src, file)
  const destFile = resolve(dest, file)
  if (!existsSync(srcFile)) {
    console.error(`Missing: ${srcFile} — run npm install first`)
    process.exit(1)
  }
  if (!existsSync(destFile)) {
    copyFileSync(srcFile, destFile)
    console.log(`Copied ${file}`)
  }
}
