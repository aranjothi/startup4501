import test from 'node:test'
import assert from 'node:assert/strict'
import { WORK_ACTIONS, workAction, elapsedSeconds } from '../src/work/model.js'

test('retired check-in requests cannot change saved work or rewards', () => {
  const original = { coins: 10, pet: { xp: 0, level: 1, mood: 80 }, work: { checkInsEnabled: true, tasks: [], active: null } }
  const started = workAction(original, { type: 'START_WORK', payload: { minutes: 10 } }, 1000)
  const snapshot = structuredClone(started)
  for (const type of ['SET_WORK_CHECK_INS', 'DISMISS_WORK_CHECK_IN']) {
    assert.equal(WORK_ACTIONS.includes(type), false)
    assert.throws(() => workAction(started, { type, payload: { enabled: false, sessionId: started.work.active.id, checkInId: 'start' } }), /Unknown work request/)
  }
  assert.deepEqual(started, snapshot)
  assert.equal(elapsedSeconds(started.work.active, 61000), 60)
  assert.equal(started.work.active.dismissedCheckIns, undefined)
  assert.equal(started.work.active.checkInDurationSeconds, undefined)
})
