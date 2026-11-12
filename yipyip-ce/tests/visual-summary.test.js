import test from 'node:test'
import assert from 'node:assert/strict'
import { createVisualReplySession } from '../src/visual/summary.js'
function observation(timestamp, { face = true, hand = true, offset = 0, expression = .1, jaw = .1 } = {}) {
  return { timestamp, faceLandmarks: face ? [[{ x: .5, y: .5 }]] : [],
    faceBlendshapes: face ? [{ categories: [{ categoryName: 'browInnerUp', score: expression }, { categoryName: 'jawOpen', score: jaw }] }] : [],
    handLandmarks: hand ? [Array.from({ length: 21 }, (_, i) => ({ x: .2 + offset + (i % 5) * .02, y: .4 + Math.floor(i / 5) * .02 }))] : [],
    handedness: hand ? [[{ categoryName: 'Left', score: .99 }]] : [] }
}
function session() {
  let now = 0
  const reply = createVisualReplySession({ now: () => now })
  return { reply, time(value) { now = value } }
}
test('recorded replies produce bounded, aggregate face/hand feedback without retaining landmarks', () => {
  const f = session(); f.reply.status('recording')
  for (let i = 1; i <= 12; i++) f.reply.sample(observation(i * 200, { offset: i * .03, expression: i % 2 ? .15 : .5 }))
  f.time(2600); f.reply.status('transcribing'); f.reply.status('idle', 'complete')
  const summary = f.reply.take()
  assert.equal(summary.status, 'measured')
  assert.equal(summary.faceVisiblePercent, 100); assert.equal(summary.handsVisiblePercent, 100)
  assert.equal(summary.handMovement, 'observed'); assert.equal(summary.facialMovement, 'observed')
  assert.doesNotMatch(JSON.stringify(summary), /landmarks|blendshapes|handedness|matrix|bitmap/i)
  assert.equal(f.reply.take(), null)
})
test('jitter and speech-related jaw movement do not become invented gesture or expression improvements', () => {
  const f = session(); f.reply.status('recording')
  for (let i = 1; i <= 12; i++) f.reply.sample(observation(i * 200, { offset: i % 2 ? .0001 : 0, expression: i % 2 ? .101 : .1, jaw: i % 2 ? .1 : .9 }))
  f.time(2600); f.reply.status('transcribing')
  const summary = f.reply.take()
  assert.equal(summary.handMovement, 'little'); assert.equal(summary.facialMovement, 'little')
})
test('missing hands remain unobserved and short or empty recordings return an explicit fallback', () => {
  const f = session(); f.reply.status('recording')
  for (let i = 1; i <= 8; i++) f.reply.sample(observation(i * 200, { hand: false }))
  f.time(1800); f.reply.status('transcribing')
  assert.equal(f.reply.take().handMovement, 'unobserved')
  f.reply.status('recording'); f.time(1850); f.reply.status('transcribing')
  assert.equal(f.reply.take().status, 'insufficient')
})
test('cancellation, errors, new recordings, and non-recording preview samples cannot leak into another reply', () => {
  const f = session()
  f.reply.sample(observation(200)); assert.equal(f.reply.take(), null)
  for (const reason of ['cancel', 'error']) {
    f.reply.status('recording'); f.reply.sample(observation(400))
    f.reply.status('idle', reason); assert.equal(f.reply.take(), null)
  }
  f.reply.status('recording'); f.reply.sample(observation(600)); f.reply.status('transcribing')
  f.reply.status('requesting'); assert.equal(f.reply.take(), null)
})
test('long detection gaps and invalid coordinates cannot manufacture movement or full-reply coverage', () => {
  const f = session(); f.reply.status('recording')
  f.reply.sample(observation(200)); f.reply.sample(observation(10000, { offset: 10 }))
  f.time(10200); f.reply.status('transcribing')
  assert.equal(f.reply.take().status, 'insufficient')
})
