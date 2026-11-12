import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { localDayKey } from '../src/lessons/calendar.js'
let render
const root = dirname(dirname(fileURLToPath(import.meta.url)))
test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yipyip-history-test-'))
  try {
    const result = await build({ stdin: { resolveDir: root, loader: 'jsx', contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import HistoryScreen from './src/lessons/HistoryScreen.jsx'; export const render = props => renderToStaticMarkup(React.createElement(HistoryScreen, props));` }, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty' }, plugins: [{ name: 'test-images', setup(build) { build.onLoad({ filter: /\.png$/ }, () => ({ contents: "export default 'test-image.png'" })) } }], logLevel: 'silent' })
    const path = join(dir, 'render.cjs')
    await writeFile(path, result.outputFiles[0].contents)
    render = (await import(pathToFileURL(path).href)).default.render
  } finally { await rm(dir, { recursive: true, force: true }) }
})
const defaults = { coins: 10, completions: [], legacySessions: [] }

test('History offers Conversations and Work tabs while retaining the conversation calendar', () => {
  const html = render(defaults)
  assert.match(html, /aria-label="History"/)
  assert.match(html, /role="tablist"/)
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*>Conversations</)
  assert.match(html, /role="tab"[^>]*aria-selected="false"[^>]*>Work</)
  assert.match(html, /role="tabpanel"/)
  assert.match(html, /Practice calendar/)
})
test('the Work tab displays sessions and saved checklist details within the shared History screen', () => {
  const html = render({ ...defaults, initialSection: 'work', work: { tasks: [], active: null, history: [
    { id: 'old', title: 'Older quiet session', taskId: null, seconds: 65, coins: 1, completedAt: 1000 },
    { id: 'new', title: 'Finished desk task', taskId: 'deleted-task', seconds: 90, plannedSeconds: 600, coins: 1, xp: 1, completedAt: 2000, checklist: { steps: ['Clear desk', 'Wipe desk'], completedSteps: [0] } },
  ] } })
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*>Work</)
  assert.match(html, /Saved work summary/)
  assert.ok(html.indexOf('Finished desk task') < html.indexOf('Older quiet session'))
  assert.match(html, /1m 30s/)
  assert.match(html, /10m/)
  assert.match(html, /1 of 2 steps done/)
  assert.match(html, /type="checkbox"[^>]*disabled=""/)
  assert.match(html, /2 coins/)
  assert.match(html, /2 XP/)
  assert.doesNotMatch(html, /aria-label="Work history"/)
  assert.doesNotMatch(html, /Practice calendar/)
  assert.doesNotMatch(html, /Finish &amp; collect/)
})
test('empty Work history and an active timer are handled without directing Back to a timer', () => {
  const html = render({ ...defaults, initialSection: 'work', work: { tasks: [], history: [], active: { id: 'active', runningSince: 1000 } } })
  assert.match(html, /No completed sessions yet/)
  assert.match(html, /Your work session is still running/)
  assert.doesNotMatch(html, /Go back to return to your timer/)
})
test('conversation open/delete actions and earlier recordings remain in the Conversations tab', () => {
  const now = Date.now()
  const html = render({ ...defaults, completions: [{ id: 'attempt', lessonId: 'everyday-1', completedAt: now, dayKey: localDayKey(now) }], legacySessions: [{ id: 'recording', scenarioId: 'small-talk', createdAt: now, duration: 60 }] })
  assert.match(html, /Open Keep the conversation going/)
  assert.match(html, /Delete Keep the conversation going/)
  assert.match(html, /Earlier recordings/)
})
