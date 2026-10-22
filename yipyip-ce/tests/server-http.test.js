import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from '../server/index.js'
import { getLesson } from '../src/lessons/catalog.js'

test('shared server accepts lessons and voice without a connection code and rejects unsafe origins', async () => {
  const lesson = getLesson('everyday-1')
  const { server } = createServer({ allowedOrigins: [], generate: async ({ messages }) => ({ topicId: lesson.topicId, engagement: { latest: 'engaged', previous: 'none' }, reply: 'What did you enjoy about it?', feedback: { strength: 'You shared a detail.', improvement: 'Invite a reply.', suggestion: 'Ask about their week.', evidenceQuote: messages.at(-1).content } }), evaluate: async ({ candidate }) => ({ approved: true, errors: [], engagement: candidate.engagement }), transcription: async () => 'A spoken reply.' })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const headers = { Origin: `chrome-extension://${'a'.repeat(32)}`, 'Content-Type': 'application/json' }
    const body = JSON.stringify({ lessonId: lesson.id, messages: [{ role: 'assistant', content: lesson.opening }, { role: 'user', content: 'I enjoyed cooking.' }] })
    const good = await fetch(`${base}/api/turn`, { method: 'POST', headers, body })
    assert.equal(good.status, 200)
    assert.equal((await good.json()).validation.approved, true)
    assert.equal((await fetch(`${base}/api/turn`, { method: 'POST', headers: { ...headers, Origin: 'https://unrelated.example' }, body })).status, 403)
    assert.equal((await fetch(`${base}/api/turn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status, 403)
    const preflight = await fetch(`${base}/api/turn`, { method: 'OPTIONS', headers })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), headers.Origin)
    const audio = await fetch(`${base}/api/transcribe`, { method: 'POST', headers: { ...headers, 'Content-Type': 'audio/webm' }, body: new Uint8Array(200) })
    assert.equal((await audio.json()).text, 'A spoken reply.')
  } finally { await new Promise(resolve => server.close(resolve)) }
})

test('configured shared server only accepts listed extension origins', async () => {
  const allowed = `chrome-extension://${'a'.repeat(32)}`
  const { server } = createServer({ allowedOrigins: [allowed], transcription: async () => 'A spoken reply.' })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/transcribe`
    const headers = { Origin: allowed, 'Content-Type': 'audio/webm' }
    assert.equal((await fetch(url, { method: 'POST', headers, body: new Uint8Array(200) })).status, 200)
    for (const origin of [`chrome-extension://${'b'.repeat(32)}`, 'http://127.0.0.1:4173']) {
      assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, Origin: origin }, body: new Uint8Array(200) })).status, 403)
    }
  } finally { await new Promise(resolve => server.close(resolve)) }
})
