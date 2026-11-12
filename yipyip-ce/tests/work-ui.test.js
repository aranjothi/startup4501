import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
let render
// Compile the actual JSX and render it with React; no source-text assertions.
test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yipyip-work-test-'))
  try {
    const result = await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { WorkView } from './src/work/WorkScreen.jsx'; export const render = props => renderToStaticMarkup(React.createElement(WorkView, props));`, resolveDir: root, loader: 'jsx' }, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty' }, plugins: [{ name: 'test-images', setup(build) { build.onLoad({ filter: /\.png$/ }, () => ({ contents: "export default 'test-image.png'" })) } }], logLevel: 'silent' })
    const path = join(dir, 'render.cjs')
    await writeFile(path, result.outputFiles[0].contents)
    render = (await import(pathToFileURL(path).href)).default.render
  } finally { await rm(dir, { recursive: true, force: true }) }
})
const pet = { name: 'Pal', mood: 85 }
const props = extra => ({ userState: { coins: 10, pet, work: { tasks: [], active: null } }, now: 61000, ...extra })

test('Work offers task planning and a standalone timer when no tasks exist', () => {
  const html = render(props())
  assert.match(html, /Describe your task/)
  assert.match(html, /Suggest a task/)
  assert.match(html, /Create manually/)
  assert.match(html, /Start quiet work/)
  assert.match(html, /No tasks yet/)
})
test('suggested tasks are reviewed with editable title, minutes, and steps before saving', () => {
  const html = render(props({ draft: { title: 'Clear my desk', description: 'Make space', minutes: 15, steps: ['Clear rubbish', 'Put supplies away'] } }))
  assert.match(html, /Review your task/)
  assert.match(html, /value="Clear my desk"/)
  assert.match(html, /value="15"/)
  assert.match(html, /Clear rubbish\nPut supplies away/)
  assert.match(html, /Save task/)
  assert.doesNotMatch(html, /Start quiet work/)
})
test('active work displays elapsed-time rewards and pause controls, blocking a second start', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [], active: { title: 'Read', durationSeconds: 120, elapsedSeconds: 0, runningSince: 1000 } } } }))
  assert.match(html, /01:00/)
  assert.match(html, /Pause/)
  assert.match(html, /Complete task/)
  assert.match(html, /Stop session/)
  assert.match(html, /1 coin/)
  assert.doesNotMatch(html, /Start quiet work/)
})
test('paused work offers resume; expiry asks for completion rather than auto-paying', () => {
  const userState = { coins: 10, pet, work: { tasks: [], active: { title: 'Read', durationSeconds: 120, elapsedSeconds: 60, runningSince: null } } }
  const paused = render(props({ userState }))
  assert.match(paused, /Resume/)
  assert.match(paused, /01:00/)
  userState.work.active.elapsedSeconds = 120
  const expired = render(props({ userState }))
  assert.match(expired, /Time to check in/)
  assert.match(expired, /Add 5 minutes/)
  assert.match(expired, /Complete task/)
})
test('errors and completion summaries are accessible and completed tasks cannot restart', () => {
  const html = render(props({ error: 'Please retry', notice: 'You earned 2 coins!', userState: { coins: 12, pet, work: { tasks: [{ id: 'done', title: 'Read', minutes: 10, steps: [], completedAt: 60000 }], active: null } } }))
  assert.match(html, /role="alert"[^>]*>Please retry/)
  assert.match(html, /role="status"[^>]*>You earned 2 coins!/)
  assert.match(html, /Completed/)
  assert.doesNotMatch(html, />Start task</)
})
test('completion confirmation replaces the timer so the final action stays visible', () => {
  const html = render(props({ confirmation: 'finish', userState: { coins: 10, pet, work: { tasks: [], active: { title: 'Read', durationSeconds: 120, elapsedSeconds: 60, runningSince: null } } } }))
  assert.match(html, /All done\?/)
  assert.match(html, /Finish &amp; collect/)
  assert.match(html, /Keep working/)
  assert.doesNotMatch(html, />Complete task</)
})
