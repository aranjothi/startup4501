import { build } from 'esbuild'
import { readFileSync, writeFileSync } from 'node:fs'
await build({ entryPoints: ['tests/browser-fixture.js'], bundle: true, format: 'iife', outfile: 'dist/test-fixture.js' })
const html = readFileSync('dist/index.html', 'utf8').replace('<head>', '<head><script src="/test-fixture.js"></script>')
writeFileSync('dist/test-room.html', html)
console.log('Test harness: http://127.0.0.1:4173/test-room.html')
console.log('Synthetic media and mock Chrome APIs only. Rebuild before loading or sharing dist/.')
