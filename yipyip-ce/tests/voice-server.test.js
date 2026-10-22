import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import WebSocket from 'ws'
import { createServer } from '../server/index.js'

test('live voice relays audio and validated transcript events without returning provider credentials', async () => {
  const upstream = new EventEmitter(), sent = []
  upstream.terminate = () => { upstream.ended = true; upstream.emit('terminated') }
  const terminated = once(upstream, 'terminated', { signal: AbortSignal.timeout(3000) })
  upstream.send = raw => {
    const event = JSON.parse(raw); sent.push(event)
    if (event.type === 'session.update') queueMicrotask(() => upstream.emit('message', Buffer.from(JSON.stringify({ type: 'session.updated' }))))
    if (event.type === 'input_audio_buffer.append') queueMicrotask(() => upstream.emit('message', Buffer.from(JSON.stringify({ type: 'conversation.item.input_audio_transcription.delta', item_id: 'one', delta: 'Um, hello' }))))
    if (event.type === 'input_audio_buffer.commit') queueMicrotask(() => upstream.emit('message', Buffer.from(JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'one', transcript: 'Hello.' }))))
  }
  const { server } = createServer({ allowedOrigins: ['http://127.0.0.1:4173'], voiceConnect: () => { setImmediate(() => upstream.emit('open')); return upstream } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const received = []
  const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/api/voice`, { origin: 'http://127.0.0.1:4173' })
  const closed = once(socket, 'close')
  socket.on('message', raw => {
    const event = JSON.parse(raw.toString()); received.push(event)
    if (event.type === 'ready') socket.send(JSON.stringify({ type: 'append', audio: Buffer.alloc(4800).toString('base64') }))
    if (event.type === 'transcript') socket.send(JSON.stringify({ type: 'commit' }))
  })
  try {
    await closed
    await terminated
    assert.deepEqual(received, [{ type: 'ready' }, { type: 'transcript', text: 'Um, hello' }, { type: 'complete', text: 'Um, hello' }])
    assert.equal(sent[0].session.type, 'transcription')
    assert.equal(sent[0].session.audio.input.turn_detection, null)
    assert.match(sent[0].session.audio.input.transcription.prompt, /hesitations/)
    assert.ok(upstream.ended)
  } finally { socket.terminate(); await new Promise(resolve => server.close(resolve)) }
})

test('voice upgrade rejects unrelated sites before opening an upstream connection', async () => {
  let connections = 0
  const { server } = createServer({ allowedOrigins: [], voiceConnect: () => { connections++; throw new Error('Should not open') } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/api/voice`, { origin: 'https://unrelated.example' })
  try {
    const error = await new Promise(resolve => socket.on('error', resolve))
    assert.match(error.message, /403/); assert.equal(connections, 0)
  } finally { socket.terminate(); await new Promise(resolve => server.close(resolve)) }
})
