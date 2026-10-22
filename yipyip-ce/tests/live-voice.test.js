import test from 'node:test'
import assert from 'node:assert/strict'
import { speechPause } from '../src/media/speechPause.js'
import { connectLiveVoice } from '../src/media/liveVoice.js'

test('silence and a single click do not send; a sustained phrase sends after a pause', () => {
  const detect = speechPause()
  assert.equal(detect(0, 10000).stopped, false)
  assert.equal(detect(.1, 10100).heardSpeech, false)
  assert.equal(detect(0, 12000).stopped, false)
  detect(.1, 13000)
  assert.equal(detect(.1, 13100).heardSpeech, true)
  assert.equal(detect(0, 14000).stopped, false)
  assert.equal(detect(0, 14600).stopped, true)
})

function fixture() {
  let socket, port, time = 0, tracksStopped = 0, contextClosed = 0
  const partials = [], finals = [], errors = [], statuses = [], sent = [], timers = new Map()
  let nextTimer = 0
  let captured
  const capturing = new Promise(resolve => { captured = resolve })
  const media = { getTracks: () => [{ stop: () => tracksStopped++ }] }
  const environment = {
    btoa, performance: { now: () => time },
    setTimeout: (callback, ms) => { const id = ++nextTimer; timers.set(id, { callback, ms }); return id },
    clearTimeout: id => timers.delete(id),
    WebSocket: class {
      constructor() { this.readyState = 1; socket = this }
      send(value) { sent.push(JSON.parse(value)) }
      close() { this.readyState = 3; this.onclose?.() }
    },
    AudioContext: class {
      constructor() { this.sampleRate = 24000; this.state = 'running'; this.audioWorklet = { addModule: async () => {} } }
      async resume() {}
      createMediaStreamSource() { return { connect() {}, disconnect() {} } }
      async close() { this.state = 'closed'; contextClosed++ }
    },
    AudioWorkletNode: class {
      constructor() { this.port = port = { postMessage(value) { if (value === 'flush') port.onmessage?.({ data: { flushed: true } }) } } }
      connect() {} disconnect() {}
    },
  }
  const session = connectLiveVoice(media, { onStatus: value => { statuses.push(value); if (value === 'recording') captured() }, onTranscript: value => partials.push(value), onComplete: value => finals.push(value), onError: value => errors.push(value) }, environment)
  const emit = event => socket.onmessage({ data: JSON.stringify(event) })
  const frame = (rms, now) => { time = now; port.onmessage?.({ data: { pcm: new ArrayBuffer(4800), rms } }) }
  const fire = ms => { for (const [id, timer] of timers) if (timer.ms === ms) { timers.delete(id); timer.callback(); break } }
  return { session, emit, frame, fire, capturing, partials, finals, errors, statuses, sent, stopped: () => tracksStopped, closed: () => contextClosed }
}

test('partials stay drafts; a pause commits once and only final text auto-sends', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(.1, 100); f.frame(.1, 200)
  await f.emit({ type: 'transcript', text: 'Hello' })
  assert.deepEqual(f.partials, ['Hello']); assert.equal(f.finals.length, 0)
  f.frame(0, 1800)
  assert.equal(f.sent.filter(event => event.type === 'commit').length, 1)
  assert.ok(f.stopped() > 0)
  await f.emit({ type: 'complete', text: 'Hello there.' })
  await f.emit({ type: 'complete', text: 'Duplicate' })
  assert.deepEqual(f.finals, ['Hello there.']); assert.deepEqual(f.errors, []); assert.equal(f.closed(), 1)
})

test('cancel blocks late partials/finals and closes capture', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.session.cancel()
  await f.emit({ type: 'complete', text: 'Should not send' })
  assert.deepEqual(f.finals, []); assert.ok(f.stopped() > 0); assert.equal(f.closed(), 1)
})

test('invalid or uncommitted final transcripts never send', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  await f.emit({ type: 'complete', text: 'Premature' })
  assert.equal(f.finals.length, 0); assert.equal(f.errors.length, 1)
})

test('quiet speech below the former volume threshold finishes after a pause', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(.004, 100); f.frame(.004, 200); f.frame(0, 1800)
  assert.equal(f.sent.filter(event => event.type === 'commit').length, 1)
  await f.emit({ type: 'complete', text: 'A quiet reply.' })
  assert.deepEqual(f.finals, ['A quiet reply.']); assert.deepEqual(f.errors, [])
})

test('recognized brief fillers confirm speech even without two loud frames', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(.001, 100)
  await f.emit({ type: 'transcript', text: 'uh' })
  f.frame(0, 1700)
  assert.equal(f.sent.filter(event => event.type === 'commit').length, 1)
  await f.emit({ type: 'complete', text: 'uh' })
  assert.deepEqual(f.finals, ['uh']); assert.deepEqual(f.errors, [])
})

test('quiet captured audio is finalized at the idle deadline rather than discarded as no speech', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(.001, 100); f.frame(.001, 200)
  f.fire(12000)
  assert.equal(f.sent.filter(event => event.type === 'commit').length, 1)
  await f.emit({ type: 'complete', text: 'Um, a quiet sentence.' })
  assert.deepEqual(f.finals, ['Um, a quiet sentence.']); assert.deepEqual(f.errors, [])
})

test('manual stop submits short quiet audio for recognition, without a loudness-based rejection', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(.001, 100); f.session.stop()
  assert.equal(f.sent.filter(event => event.type === 'commit').length, 1)
  await f.emit({ type: 'complete', text: 'Um.' })
  assert.deepEqual(f.finals, ['Um.'])
})

test('a muted microphone never auto-sends and shows an input-specific error', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(0, 100); f.frame(0, 200)
  f.fire(12000)
  assert.equal(f.finals.length, 0)
  assert.match(f.errors[0], /quiet or muted/)
})

test('duplicate transcript notifications do not indefinitely postpone a pause', async () => {
  const f = fixture()
  await f.emit({ type: 'ready' })
  f.frame(.001, 100)
  await f.emit({ type: 'transcript', text: 'Um, hello.' })
  f.frame(0, 1000)
  await f.emit({ type: 'transcript', text: 'Um, hello.' })
  f.frame(0, 1700)
  assert.equal(f.sent.filter(event => event.type === 'commit').length, 1)
  f.session.cancel()
})

test('opening speech and a pause are buffered through the connection handshake', async () => {
  const f = fixture()
  await f.capturing
  f.frame(.004, 100); f.frame(.004, 200); f.frame(0, 1800)
  assert.deepEqual(f.sent, [])
  assert.ok(f.stopped() > 0)
  await f.emit({ type: 'ready' })
  assert.deepEqual(f.sent.map(event => event.type), ['append', 'append', 'append', 'commit'])
  await f.emit({ type: 'complete', text: 'Um, I enjoy cooking.' })
  assert.deepEqual(f.finals, ['Um, I enjoy cooking.']); assert.deepEqual(f.errors, [])
})

test('cancelling during connection discards buffered opening audio and never sends', async () => {
  const f = fixture()
  await f.capturing
  f.frame(.004, 100)
  f.session.cancel()
  await f.emit({ type: 'ready' })
  assert.deepEqual(f.sent, []); assert.deepEqual(f.finals, []); assert.equal(f.closed(), 1)
})
