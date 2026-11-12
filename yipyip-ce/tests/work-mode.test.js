import test from 'node:test'
import assert from 'node:assert/strict'
import { workAction, elapsedSeconds } from '../src/work/model.js'
const base = () => ({ coins: 0, pet: { xp: 0, level: 1, mood: 80 } })
const act = (state, type, payload = {}, now = 0) => workAction(state, { type, payload: { sessionId: state.work?.active?.id, ...payload } }, now)
const plan = { title: 'Read', description: '', minutes: 5, steps: [] }
const present = (state, now) => act(state, 'REPORT_WORK_PRESENCE', { present: true }, now)

test('task Work Mode is saved, editable, and used when starting; older tasks stay standard', () => {
  let state = act(base(), 'SAVE_WORK_TASK', { ...plan, workMode: true })
  const task = state.work.tasks[0]
  assert.equal(task.workMode, true)
  assert.equal(act(state, 'START_WORK', { id: task.id }).work.active.workMode, true)
  state = act(state, 'SAVE_WORK_TASK', { ...task, workMode: false })
  assert.equal(act(state, 'START_WORK', { id: task.id }).work.active.workMode, false)
  assert.equal(act(base(), 'START_WORK', { minutes: 5 }).work.active.workMode, false)
})

test('Work Mode only counts fresh camera presence and pays double coins and XP once', () => {
  let state = act(base(), 'START_WORK', { minutes: 5, workMode: true })
  assert.equal(elapsedSeconds(state.work.active, 60000), 0)
  for (let now = 1000; now <= 61000; now += 1000) state = present(state, now)
  const completed = act(state, 'FINISH_WORK', { coins: 999, xp: 999 }, 61000)
  assert.equal(completed.coins, 2)
  assert.equal(completed.pet.xp, 2)
  assert.equal(completed.work.history[0].workMode, true)
  assert.equal(completed.work.history[0].seconds, 60)
  assert.throws(() => act(completed, 'FINISH_WORK'))
})

test('camera loss, closing Work, or stale heartbeats cannot accrue unattended time', () => {
  let state = present(act(base(), 'START_WORK', { minutes: 5, workMode: true }), 1000)
  state = present(state, 2000)
  state = act(state, 'REPORT_WORK_PRESENCE', { present: false }, 2500)
  assert.equal(elapsedSeconds(state.work.active, 60000), 1.5)
  state = present(state, 60000)
  // A missing camera heartbeat expires after two seconds, even across reopening.
  assert.equal(elapsedSeconds(structuredClone(state).work.active, 120000), 3.5)
  state = present(state, 120000)
  assert.equal(elapsedSeconds(state.work.active, 120000), 3.5)
})

test('manual pause requires explicit resume even when the face returns', () => {
  let state = present(act(base(), 'START_WORK', { minutes: 5, workMode: true }), 1000)
  state = act(state, 'PAUSE_WORK', {}, 2000)
  state = present(state, 10000)
  assert.equal(elapsedSeconds(state.work.active, 11000), 1)
  state = act(state, 'RESUME_WORK', {}, 11000)
  assert.equal(elapsedSeconds(state.work.active, 12000), 2)
  state = act(state, 'PAUSE_WORK', {}, 12000)
  assert.throws(() => act(state, 'RESUME_WORK', {}, 60000), /camera/i)
})

test('presence updates are scoped and cannot turn a standard session into doubled rewards', () => {
  const standard = act(base(), 'START_WORK', { minutes: 5 })
  assert.throws(() => present(standard, 1000), /Work Mode/i)
  const state = act(base(), 'START_WORK', { minutes: 5, workMode: true })
  assert.throws(() => act(state, 'REPORT_WORK_PRESENCE', { present: true, sessionId: 'old' }), /session has changed/)
  assert.throws(() => act(state, 'REPORT_WORK_PRESENCE', { present: 'yes' }), /presence/i)
  const completed = act(standard, 'FINISH_WORK', { workMode: true }, 60000)
  assert.equal(completed.coins, 1)
})
