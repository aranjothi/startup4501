import test from 'node:test'
import assert from 'node:assert/strict'
import { workAction } from '../src/work/model.js'
import * as history from '../src/work/history.js'
const base = () => ({ coins: 0, pet: { xp: 0, level: 1, mood: 80 } })
const act = (state, type, payload = {}, now = 1000) => workAction(state, { type, payload: { sessionId: state.work?.active?.id, ...payload } }, now)

test('completion records elapsed work, planned duration, rewards, and an independent checklist snapshot', () => {
  let state = act(base(), 'SAVE_WORK_TASK', { title: 'Desk', description: '', minutes: 10, steps: ['Clear', 'Wipe'] })
  const id = state.work.tasks[0].id
  state = act(state, 'SET_WORK_STEP', { id, stepIndex: 0, stepText: 'Clear', completed: true })
  state = act(state, 'START_WORK', { id })
  state = act(state, 'PAUSE_WORK', {}, 61000)
  state = act(state, 'RESUME_WORK', {}, 121000)
  const finished = act(state, 'FINISH_WORK', { coins: 999, xp: 999 }, 151000)
  const entry = finished.work.history[0]
  assert.equal(entry.seconds, 90)
  assert.equal(entry.plannedSeconds, 600)
  assert.equal(entry.startedAt, 1000)
  assert.equal(entry.coins, 1)
  assert.equal(entry.xp, 1)
  assert.deepEqual(entry.checklist, { steps: ['Clear', 'Wipe'], completedSteps: [0] })
  const removed = act(finished, 'DELETE_WORK_TASK', { id })
  assert.deepEqual(removed.work.history[0], entry)
  finished.work.tasks[0].steps[0] = 'Changed later'
  assert.equal(entry.checklist.steps[0], 'Clear')
})
test('quiet work is recorded without a checklist, while stopped sessions never claim completion', () => {
  const running = act(base(), 'START_WORK', { title: 'Quiet work', minutes: 10 })
  const finished = act(running, 'FINISH_WORK', {}, 151000)
  assert.equal(finished.work.history[0].taskId, null)
  assert.equal(finished.work.history[0].checklist, null)
  assert.equal(finished.work.history[0].xp, 2)
  assert.equal(act(running, 'STOP_WORK').work.history?.length ?? 0, 0)
})
test('history sorts newest first, preserves older entries, and summarizes saved sessions without mutating state', () => {
  const work = { history: [
    { id: 'old', title: 'Read', seconds: 65, coins: 1, completedAt: 1000 },
    { id: 'new', title: 'Quiet work', seconds: 125, coins: 2, xp: 2, completedAt: 3000 },
    { id: 'middle', title: 'Desk', seconds: 30, coins: 0, xp: 0, completedAt: 2000 },
  ] }
  const entries = history.listWorkHistory(work)
  assert.deepEqual(entries.map(item => item.id), ['new', 'middle', 'old'])
  assert.equal(entries[2].xp, 1)
  assert.equal(entries[2].checklist, undefined)
  assert.deepEqual(history.summarizeWorkHistory(entries), { sessions: 3, seconds: 220, coins: 3, xp: 3 })
  assert.equal(work.history[0].id, 'old')
  assert.equal(work.history[0].xp, undefined)
  assert.deepEqual(history.listWorkHistory({}), [])
})
test('history durations preserve seconds and format work longer than an hour', () => {
  assert.equal(history.formatWorkDuration(0), '0s')
  assert.equal(history.formatWorkDuration(45), '45s')
  assert.equal(history.formatWorkDuration(90), '1m 30s')
  assert.equal(history.formatWorkDuration(3600), '1h')
  assert.equal(history.formatWorkDuration(3661), '1h 1m 1s')
})
test('history retains the latest 100 completed sessions without changing existing rewards', () => {
  let state = base()
  for (let index = 0; index < 101; index++) {
    state = act(state, 'START_WORK', { title: `Session ${index}`, minutes: 1 }, index * 100000 + 1000)
    state = act(state, 'FINISH_WORK', {}, index * 100000 + 61000)
  }
  const entries = history.listWorkHistory(state.work)
  assert.equal(entries.length, 100)
  assert.equal(entries[0].title, 'Session 100')
  assert.equal(entries.at(-1).title, 'Session 1')
  assert.equal(state.coins, 101)
  assert.equal(history.summarizeWorkHistory(entries).coins, 100)
})
