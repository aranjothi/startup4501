import test from 'node:test'
import assert from 'node:assert/strict'
import * as checkIns from '../src/work/checkIns.js'
import { workAction } from '../src/work/model.js'
const active = { id: 'session', taskId: 'task', title: 'Tidy', durationSeconds: 1200, elapsedSeconds: 0, runningSince: 1000 }
const task = { id: 'task', title: 'Tidy', steps: ['Clear desk', 'File papers'], completedSteps: [0] }
const work = () => ({ active: structuredClone(active), tasks: [structuredClone(task)] })
const state = () => ({ coins: 5, pet: { xp: 10, level: 1, mood: 80 }, work: work() })

test('check-ins encourage a start and use the next unchecked step without inventing task progress', () => {
  const first = checkIns.currentCheckIn(work(), 0)
  assert.equal(first.id, 'start')
  assert.equal(first.nextStep, 'File papers')
  assert.ok(first.message)
  const quiet = work(); quiet.active.taskId = null
  assert.equal(checkIns.currentCheckIn(quiet, 0).nextStep, undefined)
  const complete = work(); complete.tasks[0].completedSteps = [0, 1]
  assert.equal(checkIns.currentCheckIn(complete, 0).nextStep, undefined)
})
test('check-ins advance at milestones using working time, without a backlog of old messages', () => {
  const current = work()
  assert.equal(checkIns.currentCheckIn(current, 299).id, 'start')
  assert.equal(checkIns.currentCheckIn(current, 300).id, 'momentum')
  assert.equal(checkIns.currentCheckIn(current, 600).id, 'halfway')
  assert.equal(checkIns.currentCheckIn(current, 900).id, 'steady')
  current.active.dismissedCheckIns = ['steady']
  assert.equal(checkIns.currentCheckIn(current, 950), null)
})
test('paused, expired, disabled, or absent sessions never show a check-in', () => {
  const paused = work(); paused.active.runningSince = null
  const disabled = work(); disabled.checkInsEnabled = false
  for (const current of [paused, disabled, { active: null, tasks: [] }]) assert.equal(checkIns.currentCheckIn(current, 600), null)
  assert.equal(checkIns.currentCheckIn(work(), 1200), null)
  const short = work(); short.active.durationSeconds = 60
  assert.equal(checkIns.currentCheckIn(short, 59).id, 'start')
})
test('dismissal survives reopening, is session-scoped, and never grants rewards', () => {
  const before = state()
  const dismissed = workAction(before, { type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId: 'session', checkInId: 'halfway' } }, 601000)
  assert.equal(checkIns.currentCheckIn(JSON.parse(JSON.stringify(dismissed.work)), 600), null)
  assert.equal(dismissed.coins, 5)
  assert.equal(dismissed.pet.xp, 10)
  assert.equal(before.work.active.dismissedCheckIns, undefined)
  assert.throws(() => workAction(before, { type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId: 'old', checkInId: 'halfway' } }, 601000), /session has changed/)
  assert.throws(() => workAction(before, { type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId: 'session', checkInId: 'invented' } }, 601000))
  assert.throws(() => workAction(before, { type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId: 'session', checkInId: 'steady' } }, 601000), /not available yet/)
  // A click on the previous message can arrive just as the next milestone starts.
  const late = workAction(before, { type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId: 'session', checkInId: 'start' } }, 601000)
  assert.equal(checkIns.currentCheckIn(late.work, 600).id, 'halfway')
})
test('preference persists across new sessions and extensions do not reshow an old milestone', () => {
  const before = state()
  let changed = workAction(before, { type: 'SET_WORK_CHECK_INS', payload: { enabled: false } })
  assert.equal(changed.work.checkInsEnabled, false)
  assert.throws(() => workAction(before, { type: 'SET_WORK_CHECK_INS', payload: { enabled: 'yes' } }))
  changed = workAction(changed, { type: 'STOP_WORK', payload: { sessionId: 'session' } })
  changed = workAction(changed, { type: 'START_WORK', payload: { title: 'Quiet work', minutes: 10 } }, 1000)
  assert.equal(checkIns.currentCheckIn(changed.work, 0), null)
  let extended = state()
  extended.work.active.dismissedCheckIns = ['halfway']
  extended = workAction(extended, { type: 'EXTEND_WORK', payload: { sessionId: 'session', minutes: 5 } }, 601000)
  assert.equal(checkIns.currentCheckIn(extended.work, 600), null)
})
