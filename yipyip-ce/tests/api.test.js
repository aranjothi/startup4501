import test from 'node:test'
import assert from 'node:assert/strict'
import { lessonTurn, transcribeReply } from '../src/lessons/api.js'
import { serverUrl } from '../src/lessons/serverUrl.js'

test('lessons and transcription use the server directly without Chrome storage or user credentials', async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return Response.json(url.endsWith('/api/turn') ? { reply: 'How was your week?', feedback: { strength: 'Clear opening.' }, engagement: { latest: 'engaged', previous: 'none' }, outcome: 'continue', assessmentVersion: 2, validation: { approved: true } } : { text: 'My week was good.' })
  }
  try {
    await lessonTurn('everyday-1', [{ role: 'user', content: 'Hello' }])
    assert.equal(await transcribeReply(new Blob(['audio'], { type: 'audio/webm' })), 'My week was good.')
    assert.deepEqual(calls.map(call => call.url), ['http://127.0.0.1:8787/api/turn', 'http://127.0.0.1:8787/api/transcribe'])
    assert.ok(calls.every(call => !('Authorization' in call.options.headers)))
  } finally { globalThis.fetch = originalFetch }
})

test('service errors keep the user in the lesson without sending them to settings', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Network unavailable') }
  try {
    await assert.rejects(lessonTurn('everyday-1', []), /temporarily unavailable/)
  } finally { globalThis.fetch = originalFetch }
})

test('server URL accepts hosted HTTPS and loopback HTTP, but rejects credentials and unsafe URLs', () => {
  assert.equal(serverUrl(), 'http://127.0.0.1:8787')
  assert.equal(serverUrl('https://api.example.com/'), 'https://api.example.com')
  for (const url of ['http://public.example.com', 'https://user:secret@example.com', 'https://example.com?key=secret', 'https://example.com/api', 'file:///tmp/key']) {
    assert.throws(() => serverUrl(url))
  }
})
