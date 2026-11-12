import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
let render, renderSummary
const root = dirname(dirname(fileURLToPath(import.meta.url)))
test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yipyip-visual-controls-'))
  try {
    const result = await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import Summary from './src/visual/VisualReplyFeedback.jsx'; export const renderSummary = summary => renderToStaticMarkup(React.createElement(Summary, { summary })); import Controls, { VisualTrackingPreview } from './src/visual/VisualFeedbackControls.jsx'; export const render = props => renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(Controls, props), React.createElement(VisualTrackingPreview, props)));`, resolveDir: root, loader: 'jsx' }, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', write: false, logLevel: 'silent' })
    const path = join(dir, 'render.cjs'); await writeFile(path, result.outputFiles[0].contents)
    const compiled = (await import(pathToFileURL(path).href)).default
    render = compiled.render; renderSummary = compiled.renderSummary
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('tracking is optional and an explicitly stopped camera has no video preview', () => {
  assert.doesNotMatch(render({}), /<video/)
  const html = render({ enabled: true, visual: { status: 'off' } })
  assert.match(html, /Camera preview/)
  assert.doesNotMatch(html, /<video/)
})
test('live status reports visibility without invented posture, emotion, or gesture coaching', () => {
  const html = render({ enabled: true, cameraRequested: true, visual: { status: 'tracking', handsVisible: 0 } })
  assert.match(html, /<video/)
  assert.match(html, /Tracking · hands out of view/)
  assert.match(html, /role="status"/)
  assert.doesNotMatch(html, /relaxed|upright|confident|natural gestures|poor|score/i)
})
test('camera failure offers retry without disabling voice practice', () => {
  const html = render({ enabled: true, cameraRequested: true, visual: { status: 'error', error: 'Camera disconnected.' } })
  assert.match(html, /role="alert"/)
  assert.match(html, /Retry camera/)
})


test('camera preview includes a visible landmark overlay', () => {
  const html = render({ enabled: true, cameraRequested: true, visual: { status: 'tracking', faceVisible: true, handsVisible: 1 } })
  assert.match(html, /<canvas[^>]*aria-hidden="true"/)
  assert.match(html, /Face in frame/)
  assert.match(html, /1 hand visible/)
})
test('recorded replies display measured visual feedback directly, including when hands cannot be observed', () => {
  const html = renderSummary({ version: 1, status: 'measured', faceVisiblePercent: 100, handsVisiblePercent: 0, handMovement: 'unobserved', facialMovement: 'little' })
  assert.match(html, /Body language/)
  assert.match(html, /100%/)
  assert.match(html, /Hands weren’t visible/)
  assert.doesNotMatch(html, /<details|poor|confident|relaxed|upright/i)
})
test('short or failed visual capture shows explicit feedback instead of disappearing', () => {
  assert.match(renderSummary({ version: 1, status: 'insufficient' }), /Not enough clear camera data/)
  assert.equal(renderSummary(null), '')
})
