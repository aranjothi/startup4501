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

const checklistTask = { id: 'desk', title: 'Tidy desk', description: '', minutes: 10, steps: ['Clear desk', 'File papers'], completedSteps: [0] }
test('task cards offer a saved checklist and show completed and remaining steps', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [checklistTask], active: null } } }))
  assert.match(html, /1 of 2 steps done/)
  assert.match(html, /type="checkbox"[^>]*checked=""/)
  assert.match(html, /Clear desk/)
  assert.match(html, /File papers/)
})
test('active and paused tasks show saved checklist progress and disable changes while saving', () => {
  const html = render(props({ busy: true, userState: { coins: 10, pet, work: { tasks: [checklistTask], active: { id: 'session', taskId: 'desk', title: 'Tidy desk', durationSeconds: 600, elapsedSeconds: 60, runningSince: null } } } }))
  assert.match(html, /1 of 2 steps done/)
  assert.match(html, /type="checkbox"[^>]*disabled=""/)
  assert.match(html, /Resume/)
})
test('completed tasks show a read-only checklist and completion confirmation reports unfinished steps', () => {
  const userState = { coins: 10, pet, work: { tasks: [{ ...checklistTask, completedAt: 60000 }], active: null } }
  assert.match(render(props({ userState })), /type="checkbox"[^>]*disabled=""/)
  userState.work.tasks[0].completedAt = undefined
  userState.work.active = { id: 'session', taskId: 'desk', title: 'Tidy desk', durationSeconds: 600, elapsedSeconds: 60, runningSince: null }
  const html = render(props({ userState, confirmation: 'finish' }))
  assert.match(html, /1 step is still unchecked/)
  assert.match(html, /Keep working/)
})

test('running work displays an accessible companion check-in with the next step and dismiss control', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [checklistTask], active: { id: 'session', taskId: 'desk', title: 'Tidy desk', durationSeconds: 600, elapsedSeconds: 0, runningSince: 1000 } } } }))
  assert.match(html, /aria-label="Companion check-in"/)
  assert.match(html, /Next small step: File papers/)
  assert.match(html, /Dismiss check-in/)
  assert.match(html, /Companion check-ins/)
})
test('paused or disabled work shows no check-in, and the disabled preference is reflected', () => {
  const userState = { coins: 10, pet, work: { checkInsEnabled: false, tasks: [], active: { id: 'session', title: 'Quiet work', durationSeconds: 600, elapsedSeconds: 60, runningSince: 1000 } } }
  let html = render(props({ userState }))
  assert.match(html, /Companion check-ins/)
  assert.doesNotMatch(html, /Dismiss check-in/)
  userState.work.checkInsEnabled = true
  userState.work.active.runningSince = null
  html = render(props({ userState }))
  assert.doesNotMatch(html, /aria-label="Companion check-in"/)
})

test('Work exposes history even while a session is running', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [], active: { id: 'session', title: 'Read', durationSeconds: 600, elapsedSeconds: 0, runningSince: 1000 } } } }))
  assert.match(html, />Work history</)
})
test('empty Work history explains how sessions are recorded', () => {
  const html = render(props({ view: 'history' }))
  assert.match(html, /No completed sessions yet/)
  assert.match(html, /Finish a work session/)
  assert.doesNotMatch(html, /Suggest a task/)
})
test('Work history shows session time, saved rewards, and a read-only checklist', () => {
  const html = render(props({ view: 'history', userState: { coins: 100, pet, work: { tasks: [], active: null, history: [
    { id: 'old', title: 'Older quiet session', taskId: null, seconds: 65, coins: 1, completedAt: 1000 },
    { id: 'new', title: 'Finished desk task', taskId: 'deleted-task', seconds: 90, plannedSeconds: 600, coins: 1, xp: 1, completedAt: 2000, checklist: { steps: ['Clear desk', 'Wipe desk'], completedSteps: [0] } },
  ] } } }))
  assert.ok(html.indexOf('Finished desk task') < html.indexOf('Older quiet session'))
  assert.match(html, /1m 30s/)
  assert.match(html, /10m/)
  assert.match(html, /1 of 2 steps done/)
  assert.match(html, /type="checkbox"[^>]*disabled=""/)
  assert.match(html, /2 coins/)
  assert.match(html, /2 XP/)
  assert.doesNotMatch(html, /Finish &amp; collect/)
})
