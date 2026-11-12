import test from 'node:test'
import assert from 'node:assert/strict'
import { workCompletion, conversationCompletion, presentCompletion, scheduleRewardNotification } from '../src/rewards/completion.js'

const state = { coins: 12, pet: { level: 2, xp: 1 }, work: { history: [{ id: 'work-1', title: 'Read', coins: 2, xp: 2 }] } }
test('work notifications use the completed session’s saved rewards, including zero-minute completions', () => {
  const result = workCompletion(state, 'work-1')
  assert.equal(result.state, state)
  assert.deepEqual(result.notification, { id: 'work:work-1', title: 'Task complete!', coins: 2, xp: 2, awarded: true })
  const empty = workCompletion({ ...state, work: { history: [{ id: 'short', coins: 0, xp: 0 }] } }, 'short')
  assert.equal(empty.notification.coins, 0)
  assert.throws(() => workCompletion(state, 'missing'))
})
test('conversation notifications report actual awards without inventing rewards for retries', () => {
  const result = conversationCompletion({ payload: state, awarded: true }, 'lesson-1')
  assert.equal(result.notification.title, 'Conversation complete!')
  assert.equal(result.notification.coins, 10)
  assert.equal(result.notification.xp, 30)
  const retry = conversationCompletion({ payload: state, awarded: false }, 'lesson-1')
  assert.equal(retry.notification.coins, 0)
  assert.equal(retry.notification.xp, 0)
  assert.equal(retry.notification.awarded, false)
  assert.throws(() => conversationCompletion({ error: 'Could not save' }, 'lesson-1'))
})
test('successful completions return home with updated pet state and a notification, without replaying duplicates', () => {
  const calls = [], seen = new Set()
  const effects = { setUserState: value => calls.push(['state', value]), setScreen: value => calls.push(['screen', value]), setNotification: value => calls.push(['notification', value]) }
  for (const completion of [workCompletion(state, 'work-1'), conversationCompletion({ payload: state, awarded: true }, 'lesson-1')]) {
    calls.length = 0
    presentCompletion(completion, effects, seen)
    assert.deepEqual(calls, [['state', state], ['screen', 'home'], ['notification', completion.notification]])
    calls.length = 0
    presentCompletion(completion, effects, seen)
    assert.deepEqual(calls, [])
  }
})
function fakeClock() {
  let now = 0, id = 0
  const pending = new Map()
  return { setTimeout(fn, delay) { pending.set(++id, { fn, at: now + delay }); return id }, clearTimeout(id) { pending.delete(id) },
    advance(ms) { const target = now + ms; while (true) { const next = [...pending.entries()].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; pending.delete(next[0]); now = next[1].at; next[1].fn() } now = target }, get count() { return pending.size } }
}
test('reward notification holds for five seconds, then exits before removal', () => {
  const clock = fakeClock(), events = []
  scheduleRewardNotification(() => events.push('fade'), () => events.push('remove'), clock)
  clock.advance(4999); assert.deepEqual(events, [])
  clock.advance(1); assert.deepEqual(events, ['fade'])
  clock.advance(259); assert.deepEqual(events, ['fade'])
  clock.advance(1); assert.deepEqual(events, ['fade', 'remove'])
})
test('replacing or unmounting a notification cancels both its hold and exit timers', () => {
  const clock = fakeClock(), events = []
  let cancel = scheduleRewardNotification(() => events.push('fade'), () => events.push('remove'), clock)
  cancel(); clock.advance(6000); assert.deepEqual(events, [])
  cancel = scheduleRewardNotification(() => events.push('fade'), () => events.push('remove'), clock)
  clock.advance(5000); cancel(); clock.advance(1000)
  assert.deepEqual(events, ['fade']); assert.equal(clock.count, 0)
})
