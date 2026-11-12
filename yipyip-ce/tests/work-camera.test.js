import test from 'node:test'
import assert from 'node:assert/strict'
import { startPresenceCamera } from '../src/work/presenceCamera.js'

function fixture(overrides = {}) {
  let stopped = 0, closed = 0, now = 0, detected = false, sample
  const states = [], events = {}
  const track = { readyState: 'live', muted: false, stop() { stopped++ }, addEventListener(name, fn) { events[name] = fn } }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] }
  const video = { currentTime: 0, readyState: 2, play: async () => {}, pause() {}, srcObject: null }
  const document = { visibilityState: 'visible', createElement: () => video, addEventListener(name, fn) { events[name] = fn }, removeEventListener(name) { delete events[name] } }
  const environment = { document, performance: { now: () => now }, setInterval(fn) { sample = fn; return 1 }, clearInterval() { sample = null } }
  const camera = startPresenceCamera({
    environment, onState: state => states.push(state),
    getMedia: async constraints => { assert.equal(constraints.audio, false); return stream },
    loadDetector: async () => ({ detectForVideo: () => ({ faceLandmarks: detected ? [[{}]] : [] }), close() { closed++ } }),
    ...overrides,
  })
  return { camera, states, track, events, document, video, get stopped() { return stopped }, get closed() { return closed },
    tick(present, ms = 200, newFrame = true) { detected = present; now += ms; if (newFrame) video.currentTime += ms / 1000; sample?.() } }
}

test('camera presence tolerates brief gaps, detects departure, and returns when a face reappears', async () => {
  const f = fixture(); await f.camera.ready
  f.tick(true)
  f.tick(true, 1200, false)
  assert.equal(f.states.at(-1).present, false)
  f.tick(true)
  assert.equal(f.states.at(-1).present, true)
  assert.equal(f.states.at(-1).present, true)
  f.tick(false); f.tick(false, 400)
  assert.equal(f.states.at(-1).present, true)
  f.tick(false, 400)
  assert.equal(f.states.at(-1).present, false)
  f.tick(true)
  assert.equal(f.states.at(-1).present, true)
  f.document.visibilityState = 'hidden'; f.events.visibilitychange()
  assert.equal(f.states.at(-1).present, false)
  f.camera.stop()
  assert.equal(f.stopped, 1)
  assert.equal(f.closed, 1)
})

test('a stalled video or lost camera revokes presence; stopping tears down resources', async () => {
  const f = fixture(); await f.camera.ready
  f.tick(true)
  f.track.readyState = 'ended'; f.events.ended()
  assert.equal(f.states.at(-1).status, 'error')
  assert.equal(f.states.at(-1).present, false)
  assert.equal(f.stopped, 1)
  assert.equal(f.closed, 1)
  f.camera.stop()
  assert.equal(f.stopped, 1)
})

test('permission errors are visible and cancellation stops a late camera stream', async () => {
  const denied = fixture({ getMedia: async () => { throw new DOMException('Denied', 'NotAllowedError') } })
  await denied.camera.ready
  assert.equal(denied.states.at(-1).status, 'error')
  assert.match(denied.states.at(-1).error, /wasn’t allowed/)
  denied.camera.stop()
  let resolve, stopped = 0
  const late = fixture({ getMedia: () => new Promise(done => { resolve = done }) })
  late.camera.stop()
  resolve({ getTracks: () => [{ stop() { stopped++ } }] })
  await late.camera.ready
  assert.equal(stopped, 1)
  assert.equal(late.states.at(-1).present, false)
})

test('cancelling during model initialization closes the model when it resolves', async () => {
  let resolve, closed = 0
  const f = fixture({ loadDetector: () => new Promise(done => { resolve = done }) })
  await new Promise(done => setImmediate(done))
  f.camera.stop()
  resolve({ close() { closed++ } })
  await f.camera.ready
  assert.equal(closed, 1)
  assert.equal(f.stopped, 1)
})
