import test from 'node:test'
import assert from 'node:assert/strict'
import { startVisualCapture } from '../src/visual/capture.js'
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture(overrides = {}) {
  let now = 0, sample, stopped = 0, closed = 0, calls = 0
  const states = [], samples = [], previews = [], events = {}
  let result = { faceLandmarks: [[{ x: .5, y: .5 }]], faceBlendshapes: [{ categories: [{ categoryName: 'mouthSmileLeft', score: .3 }] }], facialTransformationMatrixes: [{ data: [1, 0, 0] }], handLandmarks: [[{ x: .2, y: .6 }]], handedness: [[{ categoryName: 'Left', score: .9 }]] }
  const track = { readyState: 'live', muted: false, stop() { stopped++ }, addEventListener(name, fn) { events[name] = fn } }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] }
  const video = { readyState: 2, currentTime: 0, play: async () => {}, pause() {}, srcObject: null }
  const document = { visibilityState: 'visible', createElement: () => video, addEventListener(name, fn) { events[name] = fn }, removeEventListener(name) { delete events[name] } }
  const capture = startVisualCapture({ onState: value => states.push(value), onSample: value => samples.push(value), onPreview: value => previews.push(value),
    environment: { document, performance: { now: () => now }, setInterval(fn) { sample = fn; return 1 }, clearInterval() { sample = null } },
    getMedia: async constraints => { assert.equal(constraints.audio, false); return stream },
    loadDetector: async () => ({ detect: async () => { calls++; return result }, close() { closed++ } }), ...overrides })
  return { capture, states, samples, previews, events, track, document, get calls() { return calls }, get stopped() { return stopped }, get closed() { return closed },
    setResult(value) { result = value }, async tick(ms = 200, newFrame = true) { now += ms; if (newFrame) video.currentTime += ms / 1000; sample?.(); await flush() } }
}
test('camera preview shows live tracking but only recording samples enter reply feedback', async () => {
  const f = fixture(); await f.capture.ready; await f.tick()
  assert.equal(f.calls, 1)
  assert.equal(f.previews.length, 1)
  assert.equal(f.samples.length, 0)
  f.capture.setRecording(true); await f.tick()
  assert.equal(f.states.at(-1).status, 'tracking')
  assert.equal(f.states.at(-1).handsVisible, 1)
  assert.equal(f.samples.length, 1)
  assert.equal(f.samples[0].faceBlendshapes[0].categories[0].score, .3)
  f.capture.setRecording(false); await f.tick()
  assert.equal(f.calls, 3)
  assert.equal(f.samples.length, 1)
  assert.equal(f.states.at(-1).status, 'tracking')
  f.capture.stop(); assert.equal(f.stopped, 1); assert.equal(f.closed, 1)
})
test('missing hands are unknown visibility; missing faces, hidden pages and stalled video do not invent observations', async () => {
  const f = fixture(); await f.capture.ready; f.capture.setRecording(true)
  f.setResult({ faceLandmarks: [[{}]], handLandmarks: [] }); await f.tick()
  assert.equal(f.states.at(-1).status, 'tracking'); assert.equal(f.states.at(-1).handsVisible, 0)
  f.setResult({ faceLandmarks: [], handLandmarks: [] }); await f.tick()
  assert.equal(f.states.at(-1).status, 'framing')
  const count = f.samples.length
  f.document.visibilityState = 'hidden'; f.events.visibilitychange(); await f.tick()
  assert.equal(f.samples.length, count); assert.equal(f.states.at(-1).status, 'paused')
  f.document.visibilityState = 'visible'; f.events.visibilitychange(); await f.tick(1200, false)
  assert.equal(f.samples.length, count); assert.equal(f.states.at(-1).status, 'framing')
  f.capture.stop()
})
test('cancellation discards an in-flight observation and prevents it leaking into the next reply', async () => {
  let resolve, calls = 0
  const f = fixture({ loadDetector: async () => ({ detect: () => { calls++; return new Promise(done => { resolve = done }) }, close() {} }) })
  await f.capture.ready; f.capture.setRecording(true); await f.tick(); await f.tick()
  assert.equal(calls, 1) // no inference backlog
  f.capture.setRecording(false); f.capture.setRecording(true)
  resolve({ faceLandmarks: [[{}]], handLandmarks: [] }); await flush()
  assert.equal(f.samples.length, 0)
  f.capture.stop()
})
test('permission rejection and camera disconnection produce a recoverable error and clean up', async () => {
  const denied = fixture({ getMedia: async () => { throw new DOMException('Denied', 'NotAllowedError') } })
  await denied.capture.ready
  assert.equal(denied.states.at(-1).status, 'error'); assert.match(denied.states.at(-1).error, /wasn’t allowed/)
  const f = fixture(); await f.capture.ready; f.track.readyState = 'ended'; f.events.ended()
  assert.equal(f.states.at(-1).status, 'error'); assert.equal(f.stopped, 1); assert.equal(f.closed, 1)
  f.capture.stop(); assert.equal(f.stopped, 1)
})
test('leaving during permission or model startup stops late resources without emitting new state', async () => {
  let grant, stopped = 0
  const late = fixture({ getMedia: () => new Promise(done => { grant = done }) })
  late.capture.stop(); const count = late.states.length
  grant({ getTracks: () => [{ stop() { stopped++ } }] }); await late.capture.ready
  assert.equal(stopped, 1); assert.equal(late.states.length, count)
  let loaded, closed = 0
  const model = fixture({ loadDetector: () => new Promise(done => { loaded = done }) })
  await flush(); model.capture.stop()
  loaded({ close() { closed++ } }); await model.capture.ready
  assert.equal(closed, 1); assert.equal(model.stopped, 1)
})
