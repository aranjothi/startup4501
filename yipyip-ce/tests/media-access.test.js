import test from 'node:test'
import assert from 'node:assert/strict'
import { requestMedia } from '../src/media/access.js'

function fixture(states = { microphone: 'prompt', camera: 'prompt' }) {
  const channels = [], listeners = new Set(), removed = [], opened = [], captured = []
  let stopped = 0
  const stream = { getTracks: () => [{ stop: () => stopped++ }] }
  const environment = {
    location: { protocol: 'chrome-extension:' },
    screen: { availLeft: -1440, availTop: 24, availWidth: 1440, availHeight: 876 },
    crypto: { randomUUID: () => `request-${channels.length}` },
    BroadcastChannel: class {
      constructor(name) { this.name = name; channels.push(this) }
      close() { this.closed = true }
    },
    navigator: {
      permissions: { query: async ({ name }) => ({ state: states[name] }) },
      mediaDevices: { getUserMedia: async constraints => { captured.push(constraints); return stream } },
    },
    chrome: {
      runtime: { getURL: path => `chrome-extension://yipyip/${path}` },
      windows: {
        create: async options => { opened.push(options); return { id: opened.length } },
        remove: async id => { removed.push(id) },
        onRemoved: { addListener: callback => listeners.add(callback), removeListener: callback => listeners.delete(callback) },
      },
    },
  }
  const tick = () => new Promise(resolve => setImmediate(resolve))
  const reply = (status, extra = {}, index = 0) => {
    const id = new URL(opened[index].url).searchParams.get('id')
    channels[index].onmessage({ data: { id, status, ...extra } })
  }
  const cleaned = () => { assert.equal(listeners.size, 0); assert.ok(channels.every(channel => channel.closed)) }
  return { environment, channels, opened, removed, captured, stream, tick, reply, cleaned, listeners, stopped: () => stopped }
}

test('first microphone use opens a permission window, then captures in sidebar after consent', async () => {
  const f = fixture()
  const result = requestMedia({ audio: { echoCancellation: true }, video: false }, { environment: f.environment })
  await f.tick()
  assert.equal(f.opened[0].type, 'popup')
  assert.equal(f.opened[0].width, 340)
  assert.equal(f.opened[0].height, 250)
  assert.equal(f.opened[0].left, -352)
  assert.equal(f.opened[0].top, 36)
  const params = new URL(f.opened[0].url).searchParams
  assert.equal(params.get('audio'), 'true'); assert.equal(params.get('video'), 'false')
  assert.equal(f.captured.length, 0)
  f.channels[0].onmessage({ data: { id: 'another-request', status: 'granted' } })
  assert.equal(f.captured.length, 0)
  f.reply('granted')
  assert.equal(await result, f.stream)
  assert.deepEqual(f.captured, [{ audio: { echoCancellation: true }, video: false }])
  assert.deepEqual(f.removed, [1]); f.cleaned()
})

test('granted microphone skips popup; ungranted camera still requests consent', async () => {
  const f = fixture({ microphone: 'granted', camera: 'prompt' })
  await requestMedia({ audio: true }, { environment: f.environment })
  assert.equal(f.opened.length, 0)
  const camera = requestMedia({ audio: false, video: true }, { environment: f.environment })
  await f.tick()
  assert.equal(new URL(f.opened[0].url).searchParams.get('video'), 'true')
  f.reply('granted'); await camera; f.cleaned()
})

test('Block returns denial without recording and cleans permission listeners', async () => {
  const f = fixture()
  const result = requestMedia({ audio: true }, { environment: f.environment })
  const denied = assert.rejects(result, { name: 'NotAllowedError' })
  await f.tick(); f.reply('error', { name: 'NotAllowedError', message: 'Blocked' })
  await denied
  assert.equal(f.captured.length, 0); f.cleaned()
})

test('closing the window or cancelling the lesson cancels permission without recording', async () => {
  for (const action of ['close', 'abort']) {
    const f = fixture(), controller = new AbortController()
    const result = requestMedia({ audio: true }, { environment: f.environment, signal: controller.signal })
    const cancelled = assert.rejects(result, { name: 'AbortError' })
    await f.tick()
    if (action === 'close') for (const listener of f.listeners) listener(1)
    else controller.abort()
    await cancelled
    assert.equal(f.captured.length, 0); f.cleaned()
  }
})

test('cancellation while opening the popup closes the late window', async () => {
  const f = fixture(), controller = new AbortController()
  let complete
  f.environment.chrome.windows.create = () => new Promise(resolve => { complete = resolve })
  const result = requestMedia({ audio: true }, { environment: f.environment, signal: controller.signal })
  const cancelled = assert.rejects(result, { name: 'AbortError' })
  await f.tick(); controller.abort(); await cancelled
  complete({ id: 42 }); await f.tick()
  assert.deepEqual(f.removed, [42]); assert.equal(f.captured.length, 0); f.cleaned()
})

test('a stream arriving after cancellation is immediately stopped', async () => {
  const f = fixture({ microphone: 'granted' }), controller = new AbortController()
  let complete
  f.environment.navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { complete = resolve })
  const result = requestMedia({ audio: true }, { environment: f.environment, signal: controller.signal })
  const cancelled = assert.rejects(result, { name: 'AbortError' })
  await f.tick(); controller.abort(); complete(f.stream); await cancelled
  assert.equal(f.stopped(), 1)
})

test('closing a popup before its creation callback arrives still cancels the request', async () => {
  const f = fixture()
  let complete
  f.environment.chrome.windows.create = () => new Promise(resolve => { complete = resolve })
  const result = requestMedia({ audio: true }, { environment: f.environment })
  const cancelled = assert.rejects(result, { name: 'AbortError' })
  await f.tick()
  for (const listener of f.listeners) listener(42)
  complete({ id: 42 }); await cancelled
  assert.equal(f.captured.length, 0); f.cleaned()
})

test('popup creation failure rejects and releases listeners', async () => {
  const f = fixture()
  f.environment.chrome.windows.create = async () => { throw new Error('Window unavailable') }
  await assert.rejects(requestMedia({ audio: true }, { environment: f.environment }), /Window unavailable/)
  assert.equal(f.captured.length, 0); f.cleaned()
})
