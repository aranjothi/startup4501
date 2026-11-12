import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVisualDetector } from '../src/visual/detector.js'
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let worker, terminated = 0, bitmapsClosed = 0
  const sent = []
  const environment = { chrome: { runtime: { getURL: path => `chrome-extension://test/${path}` } }, setTimeout, clearTimeout,
    createImageBitmap: async () => ({ close() { bitmapsClosed++ } }),
    Worker: class { constructor() { worker = this } postMessage(message) { sent.push(message) } terminate() { terminated++ } } }
  return { environment, sent, get worker() { return worker }, get terminated() { return terminated }, get bitmapsClosed() { return bitmapsClosed }, receive(data) { worker.onmessage({ data }) } }
}
test('detector worker loads bundled assets and returns face and hand observations for transferred frames', async () => {
  const f = fixture(), loading = loadVisualDetector({ environment: f.environment, createWorker: () => new f.environment.Worker() })
  assert.match(f.sent[0].assets.hands, /^chrome-extension:\/\/test\/mediapipe\/hand_landmarker.task$/)
  f.receive({ type: 'ready' }); const detector = await loading
  const pending = detector.detect({}, 200); await flush()
  const request = f.sent.at(-1)
  assert.equal(request.type, 'frame'); assert.equal(request.timestamp, 200)
  const observation = { faceLandmarks: [[{}]], handLandmarks: [[{}]] }
  f.receive({ type: 'result', id: request.id, observation })
  assert.deepEqual(await pending, observation)
  detector.close(); assert.equal(f.terminated, 1)
})
test('aborting model startup terminates its worker and rejects readiness', async () => {
  const f = fixture(), controller = new AbortController()
  const loading = loadVisualDetector({ environment: f.environment, createWorker: () => new f.environment.Worker(), signal: controller.signal })
  controller.abort(); await assert.rejects(loading, { name: 'AbortError' })
  assert.equal(f.terminated, 1)
})
test('closing in-flight detection rejects pending results and terminates the worker once', async () => {
  const f = fixture(), loading = loadVisualDetector({ environment: f.environment, createWorker: () => new f.environment.Worker() })
  f.receive({ type: 'ready' }); const detector = await loading
  const pending = detector.detect({}, 100); await flush()
  detector.close(); detector.close()
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(f.terminated, 1)
})
