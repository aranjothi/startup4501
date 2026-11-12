import test from 'node:test'
import assert from 'node:assert/strict'
import { workAction } from '../src/work/model.js'
const draft = { title: 'Tidy desk', description: '', minutes: 10, steps: ['Clear desk', 'File papers', 'Wipe surface'] }
const base = () => workAction({ coins: 10, pet: { level: 1, xp: 0, mood: 80 } }, { type: 'SAVE_WORK_TASK', payload: draft }, 1000)
const act = (state, type, payload = {}, now = 1000) => workAction(state, { type, payload: { sessionId: state.work.active?.id, ...payload } }, now)
const step = (state, index, completed = true) => act(state, 'SET_WORK_STEP', { id: state.work.tasks[0].id, stepIndex: index, stepText: state.work.tasks[0].steps[index], completed })

test('checking and unchecking a step persists explicit progress without rewards or automatic completion', () => {
  const before = base()
  const checked = step(before, 1)
  assert.deepEqual(checked.work.tasks[0].completedSteps, [1])
  assert.deepEqual(step(checked, 1).work.tasks[0].completedSteps, [1])
  assert.deepEqual(step(checked, 1, false).work.tasks[0].completedSteps, [])
  const all = step(step(checked, 0), 2)
  assert.equal(all.work.tasks[0].completedAt, undefined)
  assert.equal(all.coins, 10)
  assert.equal(all.pet.xp, 0)
  assert.equal(before.work.tasks[0].completedSteps?.length ?? 0, 0)
})
test('partial checklist survives pause, serialized storage, stop, and a fresh session', () => {
  let state = base()
  const id = state.work.tasks[0].id
  state = act(state, 'START_WORK', { id })
  state = step(state, 0)
  state = act(state, 'PAUSE_WORK', {}, 31000)
  state = JSON.parse(JSON.stringify(state))
  state = step(state, 2)
  state = act(state, 'STOP_WORK', {}, 41000)
  state = act(state, 'START_WORK', { id }, 51000)
  assert.deepEqual(state.work.tasks[0].completedSteps, [0, 2])
})
test('editing preserves progress for unchanged steps, even when reordered, but not rewritten steps', () => {
  let state = step(step(base(), 0), 2)
  state = act(state, 'SAVE_WORK_TASK', { ...state.work.tasks[0], steps: ['Wipe surface', 'Clear desk', 'Recycle papers'], completedSteps: [0, 1, 2] })
  assert.deepEqual(state.work.tasks[0].completedSteps, [0, 1])
})
test('duplicate step text retains its own occurrence progress when edited', () => {
  let state = base()
  state = act(state, 'SAVE_WORK_TASK', { ...state.work.tasks[0], steps: ['Read', 'Read', 'Write'] })
  state = step(state, 1)
  state = act(state, 'SAVE_WORK_TASK', { ...state.work.tasks[0], steps: ['Read', 'Write', 'Read'] })
  assert.deepEqual(state.work.tasks[0].completedSteps, [2])
})
test('invalid, stale, and completed-task checklist requests cannot modify task progress', () => {
  const state = base()
  const payload = { id: state.work.tasks[0].id, stepIndex: 0, stepText: 'Clear desk', completed: true }
  for (const change of [{ id: 'missing' }, { stepIndex: -1 }, { stepIndex: 3 }, { stepIndex: 0.5 }, { stepText: 'An old step' }, { completed: 'yes' }]) {
    assert.throws(() => act(state, 'SET_WORK_STEP', { ...payload, ...change }))
  }
  const finished = act(act(state, 'START_WORK', { id: payload.id }), 'FINISH_WORK', {}, 61000)
  assert.throws(() => act(finished, 'SET_WORK_STEP', payload))
  assert.equal(finished.coins, 11)
})
