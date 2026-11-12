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

test('Work starts with an open-ended question and three menu choices', () => {
  const html = render(props({ question: 'What would you like to get started on?' }))
  assert.match(html, /What would you like to get started on\?/)
  assert.match(html, /Create Task/)
  assert.match(html, /Suggest Task/)
  assert.match(html, /No Task, Just Work/)
  assert.doesNotMatch(html, /Describe your task/)
  assert.doesNotMatch(html, /Start quiet work/)
})
test('Suggest Task and quiet work have separate menus', () => {
  const suggest = render(props({ mode: 'suggest' }))
  assert.match(suggest, /Describe your task/)
  assert.match(suggest, /Suggest a task/)
  assert.doesNotMatch(suggest, /Start quiet work/)
  const quiet = render(props({ mode: 'quiet' }))
  assert.match(quiet, /Start quiet work/)
  assert.doesNotMatch(quiet, /Describe your task/)
})
test('Create Task opens a manual task form', () => {
  const html = render(props({ mode: 'create', draft: { title: '', description: '', minutes: 25, steps: [] } }))
  assert.match(html, /Create Task/)
  assert.match(html, /Task title/)
  assert.match(html, /Start session/)
  assert.doesNotMatch(html, /Describe your task/)
})
test('suggested tasks are reviewed with editable title, minutes, and steps before saving', () => {
  const html = render(props({ draft: { title: 'Clear my desk', description: 'Make space', minutes: 15, steps: ['Clear rubbish', 'Put supplies away'] } }))
  assert.match(html, /Review your task/)
  assert.match(html, /value="Clear my desk"/)
  assert.match(html, /value="15"/)
  assert.match(html, /Clear rubbish\nPut supplies away/)
  assert.match(html, /Start session/)
  assert.doesNotMatch(html, /Start quiet work/)
})
test('active work displays elapsed-time rewards and pause controls, blocking a second start', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [], active: { title: 'Read', durationSeconds: 120, elapsedSeconds: 0, runningSince: 1000 } } } }))
  assert.match(html, /01:00/)
  assert.match(html, /Pause/)
  assert.match(html, />Finish<\/button>/)
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
  assert.match(expired, /Time’s up/)
  assert.match(expired, /Add 5 minutes/)
  assert.match(expired, />Finish<\/button>/)
})
test('errors and completion summaries are accessible and completed tasks cannot restart', () => {
  const html = render(props({ error: 'Please retry', notice: 'You earned 2 coins!', userState: { coins: 12, pet, work: { tasks: [{ id: 'done', title: 'Read', minutes: 10, steps: [], completedAt: 60000 }], active: null } } }))
  assert.match(html, /role="alert"[^>]*>Please retry/)
  assert.match(html, /role="status"[^>]*>You earned 2 coins!/)
  assert.match(html, /Completed/)
  assert.doesNotMatch(html, />Start task</)
})
test('Finish opens a confirmation dialog above the inert session without replacing the timer', () => {
  const html = render(props({ confirmation: 'finish', userState: { coins: 10, pet, work: { tasks: [], active: { title: 'Read', durationSeconds: 120, elapsedSeconds: 60, runningSince: null } } } }))
  assert.match(html, /All done\?/)
  assert.match(html, /Finish &amp; collect/)
  assert.match(html, /Keep working/)
  assert.match(html, /role="dialog"/ )
  assert.match(html, /aria-modal="true"/)
  assert.match(html, /class="panel-body" inert=""/)
  assert.match(html, /role="timer"/)
  assert.match(html, />Finish<\/button>/)
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
  assert.match(html, /1 step unchecked/)
  assert.match(html, /Keep working/)
})

test('work sessions never show motivational check-ins or their settings, including legacy enabled profiles', () => {
  for (const runningSince of [1000, null]) {
    const html = render(props({ userState: { coins: 10, pet, work: { checkInsEnabled: true, tasks: [checklistTask], active: { id: 'session', taskId: 'desk', title: 'Tidy desk', durationSeconds: 600, elapsedSeconds: 0, runningSince } } } }))
    assert.doesNotMatch(html, /Companion check-in|Dismiss check-in|A small start counts|Next: File papers/)
    assert.match(html, /role="timer"/)
    assert.match(html, /Steps ·/)
  }
})

test('Work keeps task controls without a separate history button', () => {
  const html = render(props())
  assert.match(html, /No Task, Just Work/)
  assert.doesNotMatch(html, />Work history</)
})

test('all three work flows open modal dialogs above an inert landing screen', () => {
  for (const options of [
    { mode: 'create', draft: { title: '', description: '', minutes: 25, steps: [] } },
    { mode: 'suggest' },
    { mode: 'quiet' },
  ]) {
    const html = render(props(options))
    assert.match(html, /role="dialog"/)
    assert.match(html, /aria-modal="true"/)
    assert.match(html, /class="panel-body" inert=""/)
    assert.match(html, /Work options/)
    assert.match(html, /aria-label="Close /)
  }
})

test('every setup flow offers optional Work Mode with camera accountability and double rewards', () => {
  for (const extra of [{ mode: 'create', draft: { title: '', description: '', minutes: 25, steps: [] } }, { mode: 'suggest' }, { mode: 'quiet' }]) {
    const html = render(props(extra))
    assert.match(html, /Work Mode/)
    assert.match(html, /2× coins and XP/)
    assert.match(html, /aria-pressed="false"/)
  }
})

test('Work Mode starts with a camera check and cannot start before a face is detected', () => {
  const html = render(props({ mode: 'camera', camera: { status: 'away', present: false } }))
  assert.match(html, /Camera check/)
  assert.match(html, /disabled=""[^>]*>Start session/)
})

test('the camera-check exit transition keeps a single preview attached', () => {
  const html = render(props({ mode: 'camera', camera: { status: 'present', present: true }, userState: { coins: 10, pet, work: { tasks: [], active: { id: 'focus', title: 'Read', workMode: true, presenceAt: 61000, durationSeconds: 600, elapsedSeconds: 0, runningSince: 61000 } } } }))
  assert.equal((html.match(/<video/g) ?? []).length, 1)
})

test('task setup keeps optional writing behind a closed disclosure and leads with Start session', () => {
  const html = render(props({ mode: 'create', draft: { title: 'Read', description: '', minutes: 25, steps: [] } }))
  assert.match(html, /<details class="work-extra">[\s\S]*<summary>Details &amp; steps<\/summary>[\s\S]*Description[\s\S]*Steps/)
  assert.doesNotMatch(html, /<details class="work-extra" open/)
  assert.match(html, />Start session<\/button>/)
  assert.match(html, />Save for later<\/button>/)
  assert.doesNotMatch(html, /Give your task a name|estimate is a starting point|Earn 1 coin/)
})

test('Work Mode is a compact toggle pill rather than a paragraph of setup copy', () => {
  const html = render(props({ mode: 'quiet', workMode: true }))
  assert.match(html, /aria-pressed="true"[^>]*>[\s\S]*Work Mode/)
  assert.doesNotMatch(html, /Camera accountability\.|Gentle encouragement as you work|Start a timer without/)
})

test('active work keeps extra controls and checklist expandable without coaching paragraphs', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [checklistTask], active: { id: 'session', taskId: 'desk', title: 'Tidy desk', durationSeconds: 600, elapsedSeconds: 0, runningSince: 1000 } } } }))
  assert.match(html, />Pause<\/button>/)
  assert.match(html, />Finish<\/button>/)
  assert.match(html, /<details class="work-extra work-session-options"><summary>Options<\/summary>[\s\S]*Add 5 minutes[\s\S]*Stop session/)
  assert.match(html, /<details class="work-extra work-session-steps"><summary>Steps/)
  assert.doesNotMatch(html, /keeping you company|earned so far|per full minute|You can go back|Next small step:/)
})


test('editing an existing task saves changes without starting another session', () => {
  const html = render(props({ mode: 'edit', draft: checklistTask }))
  assert.match(html, />Save changes<\/button>/)
  assert.doesNotMatch(html, />Start session<\/button>/)
})

test('camera check stays the modal title when starting a reviewed task', () => {
  const html = render(props({ mode: 'camera', draft: checklistTask, camera: { present: true, status: 'present' } }))
  assert.match(html, /<h2[^>]*>Camera check<\/h2>/)
  assert.doesNotMatch(html, />Save changes<\/button>/)
})

test('saved task cards lead with title and Start while notes, checklist, and management stay collapsed', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [{ ...checklistTask, description: 'Make some space' }], active: null } } }))
  assert.match(html, /class="work-task-heading"[\s\S]*Tidy desk[\s\S]*>Start<\/button>/)
  assert.match(html, /<details class="work-extra work-task-details"><summary>Details<\/summary>[\s\S]*Make some space[\s\S]*Clear desk[\s\S]*Edit Tidy desk/)
  assert.doesNotMatch(html, /<details class="work-extra work-task-details" open|up to 10 coins/)
})


test('stop confirmation also uses the session modal and prevents repeated requests while busy', () => {
  const html = render(props({ busy: true, confirmation: 'stop', userState: { coins: 10, pet, work: { tasks: [], active: { id: 'session', title: 'Read', durationSeconds: 120, elapsedSeconds: 60, runningSince: null } } } }))
  assert.match(html, /role="dialog"/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /disabled=""[^>]*>Stop without rewards<\/button>/)
  assert.match(html, /role="timer"/)
})

test('active work shows a bounded session progress ring without adding extra decisions', () => {
  const html = render(props({ userState: { coins: 10, pet, work: { tasks: [], active: { title: 'Read', durationSeconds: 120, elapsedSeconds: 0, runningSince: 1000 } } } }))
  assert.match(html, /role="progressbar"[^>]*aria-label="Session progress"[^>]*aria-valuenow="50"/)
  assert.match(html, /class="work-progress-ring"/)
  assert.match(html, /class="work-reward-chip/)
  assert.match(html, />Pause<\/button>/)
  assert.match(html, />Finish<\/button>/)
})
