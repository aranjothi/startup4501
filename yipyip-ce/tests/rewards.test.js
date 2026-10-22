import test from 'node:test'
import assert from 'node:assert/strict'
import { rewardSession } from '../src/practice/rewards.js'
import { SCENARIOS } from '../src/practice/scenarios.js'

const state = () => ({ coins: 0, treats: 0, pet: { level: 1, xp: 0, mood: 99 }, rewardedSessionIds: [] })
const session = (overrides = {}) => ({ id: 'session-one', scenarioId: 'everyday', duration: 11, blob: new Blob(['recorded video']), ...overrides })
test('practice earns fixed rewards without changing the input state', () => {
  const before = state()
  const result = rewardSession(before, session())
  assert.equal(result.awarded, true)
  assert.equal(result.state.coins, 10)
  assert.equal(result.state.pet.xp, 30)
  assert.equal(result.state.pet.mood, 100)
  assert.equal(before.coins, 0)
})
test('saving or claiming the same recording twice cannot duplicate rewards', () => {
  const first = rewardSession(state(), session())
  const second = rewardSession(first.state, session())
  assert.equal(second.awarded, false)
  assert.equal(second.state.coins, 10)
  assert.equal(second.state.pet.xp, 30)
})
test('leveling consumes XP at each level threshold', () => {
  const before = state()
  before.pet.xp = 90
  const { state: after } = rewardSession(before, session())
  assert.equal(after.pet.level, 2)
  assert.equal(after.pet.xp, 20)
})
test('unrecorded, invalid, and too-short sessions cannot earn rewards', () => {
  for (const overrides of [{ duration: 9 }, { duration: NaN }, { duration: -1 }, { duration: 303 }, { blob: null }, { blob: new Blob() }, { scenarioId: 'unknown' }]) {
    assert.throws(() => rewardSession(state(), session(overrides)))
  }
  assert.throws(() => rewardSession(state(), null))
})
test('every supported conversation scenario is eligible on the same terms', () => {
  for (const scenario of SCENARIOS) assert.equal(rewardSession(state(), session({ scenarioId: scenario.id })).state.coins, 10)
})
