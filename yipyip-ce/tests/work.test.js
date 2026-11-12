import test from 'node:test'
import assert from 'node:assert/strict'
import * as work from '../src/work/model.js'
const base = () => ({ coins: 10, pet: { level: 1, xp: 95, mood: 80 }, work: { tasks: [], active: null } })
const draft = { title: 'Clean my room', description: 'Start small', minutes: 20, steps: ['Clear desk', 'Put clothes away'] }
const act = (state, type, payload, now = 1000) => work.workAction(state, { type, payload }, now)

test('task suggestions require a useful title, bounded estimate and editable steps', () => {
  assert.deepEqual(work.validatePlan(draft), draft)
  for (const invalid of [{ ...draft, title: '' }, { ...draft, minutes: 0 }, { ...draft, minutes: 481 }, { ...draft, minutes: 1.5 }, { ...draft, steps: [''] }]) {
    assert.throws(() => work.validatePlan(invalid))
  }
})
test('reviewed task can be saved, edited, and deleted without spending or earning', () => {
  const state = base()
  const saved = act(state, 'SAVE_WORK_TASK', draft)
  const task = saved.work.tasks[0]
  assert.equal(task.minutes, 20)
  const edited = act(saved, 'SAVE_WORK_TASK', { ...task, minutes: 30, title: 'Clear my desk' })
  assert.equal(edited.work.tasks[0].minutes, 30)
  assert.equal(edited.coins, 10)
  assert.equal(act(edited, 'DELETE_WORK_TASK', { id: task.id }).work.tasks.length, 0)
  assert.equal(state.work.tasks.length, 0)
})
test('timer survives reopening and pauses without counting paused time', () => {
  const saved = act(base(), 'SAVE_WORK_TASK', draft)
  const id = saved.work.tasks[0].id
  let state = act(saved, 'START_WORK', { id })
  assert.throws(() => act(state, 'START_WORK', { id }))
  assert.throws(() => act(state, 'DELETE_WORK_TASK', { id }))
  state = act(state, 'PAUSE_WORK', {}, 61000)
  assert.equal(work.elapsedSeconds(state.work.active, 121000), 60)
  state = act(state, 'RESUME_WORK', {}, 121000)
  assert.equal(work.elapsedSeconds(structuredClone(state).work.active, 181000), 120)
})
test('completion earns elapsed whole-minute coins and XP once, ignoring supplied rewards', () => {
  let state = act(base(), 'SAVE_WORK_TASK', draft)
  const id = state.work.tasks[0].id
  state = act(state, 'START_WORK', { id })
  const completed = act(state, 'FINISH_WORK', { id, coins: 9999, elapsedSeconds: 99999 }, 301000)
  assert.equal(completed.coins, 15)
  assert.equal(completed.pet.level, 2)
  assert.equal(completed.pet.xp, 0)
  assert.ok(completed.work.tasks[0].completedAt)
  assert.equal(completed.work.active, null)
  assert.throws(() => act(completed, 'FINISH_WORK', { id }, 302000))
  assert.throws(() => act(completed, 'START_WORK', { id }))
})
test('time is capped, extending does not create past work, and stopping keeps task open', () => {
  let state = act(base(), 'START_WORK', { title: 'Quiet work', minutes: 1 })
  assert.equal(work.elapsedSeconds(state.work.active, 121000), 60)
  state = act(state, 'EXTEND_WORK', { minutes: 5 }, 121000)
  assert.equal(work.elapsedSeconds(state.work.active, 121000), 60)
  const done = act(state, 'FINISH_WORK', {}, 181000)
  assert.equal(done.coins, 12)
  state = act(base(), 'SAVE_WORK_TASK', draft)
  state = act(state, 'START_WORK', { id: state.work.tasks[0].id })
  const stopped = act(state, 'STOP_WORK', {}, 61000)
  assert.equal(stopped.work.active, null)
  assert.equal(stopped.work.tasks[0].completedAt, undefined)
  assert.equal(stopped.coins, 10)
})
test('legacy Dopal tasks retain their titles and durations', () => {
  const tasks = work.importLegacyTasks([{ id: 'old', title: 'Read', type: 'task', timeAllotted: '00:15:00' }, { id: 'session', title: 'Study', type: 'session', breaks: true, studyInterval: 25, numIntervals: 4 }])
  assert.equal(tasks[0].minutes, 15)
  assert.equal(tasks[1].minutes, 100)
})
