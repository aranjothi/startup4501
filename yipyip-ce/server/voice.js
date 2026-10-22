import WebSocket, { WebSocketServer } from 'ws'
import { VERBATIM_CONTEXT } from './transcriptionConfig.js'
import { retainRecognizedFillers } from '../src/lessons/disfluency.js'

export function openTranscription() {
  if (!process.env.OPENAI_API_KEY) throw new Error('AI_NOT_CONFIGURED')
  return new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, handshakeTimeout: 12000,
  })
}

// The browser can append audio and commit one turn, never change model/session settings.
export function attachVoiceServer(server, { allowed, takeRequest, connect = openTranscription }) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 20000 })
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/api/voice' || !allowed(request.headers.origin ?? '') || sockets.clients.size >= 4 || !takeRequest()) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return
    }
    sockets.handleUpgrade(request, socket, head, client => {
      let upstream, ready = false, committed = false, completed = false, total = 0, transcript = ''
      const send = data => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data)) }
      const fail = (code = 'TRANSCRIPTION_UNAVAILABLE') => { send({ type: 'error', code: typeof code === 'string' ? code : 'TRANSCRIPTION_UNAVAILABLE', message: 'Live transcription could not be completed.' }); client.close(1011) }
      const limit = setTimeout(fail, 95000)
      const handshake = setTimeout(fail, 15000)
      client.on('close', () => { clearTimeout(limit); clearTimeout(handshake); if (upstream) upstream.terminate() })
      client.on('error', () => client.close())
      try { upstream = connect() } catch { fail(); return }
      upstream.on('open', () => {
        if (client.readyState !== WebSocket.OPEN) { upstream.terminate(); return }
        upstream.send(JSON.stringify({ type: 'session.update', session: {
          type: 'transcription', audio: { input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: { model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || 'gpt-live-transcribe', prompt: VERBATIM_CONTEXT },
            turn_detection: null,
          } },
        } }))
      })
      upstream.on('error', fail)
      upstream.on('close', () => { if (!completed && client.readyState === WebSocket.OPEN) fail() })
      upstream.on('message', raw => {
        try {
          const event = JSON.parse(raw.toString())
          if (event.type === 'session.updated') { ready = true; clearTimeout(handshake); send({ type: 'ready' }) }
          if (event.type === 'conversation.item.input_audio_transcription.delta') {
            if (typeof event.delta !== 'string' || transcript.length + event.delta.length > 4000) { fail(); return }
            transcript += event.delta
            send({ type: 'transcript', text: transcript })
          }
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            if (!committed || typeof event.transcript !== 'string' || event.transcript.length > 4000) { fail(); return }
            const text = retainRecognizedFillers(event.transcript, transcript)
            if (!text) { fail('NO_WORDS_RECOGNIZED'); return }
            completed = true
            send({ type: 'complete', text }); client.close(1000)
          }
          if (event.type === 'error' || event.type === 'conversation.item.input_audio_transcription.failed') fail()
        } catch { fail() }
      })
      client.on('message', (raw, binary) => {
        try {
          const event = JSON.parse(raw.toString())
          if (binary || !ready || committed) { fail(); return }
          if (event.type === 'append' && typeof event.audio === 'string' && event.audio.length <= 16000 && /^[A-Za-z0-9+/]+={0,2}$/.test(event.audio)) {
            const bytes = Buffer.from(event.audio, 'base64')
            total += bytes.length
            if (!bytes.length || bytes.length % 2 || total > 3 * 1024 * 1024) { fail(); return }
            upstream.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: event.audio }))
          } else if (event.type === 'commit' && total >= 4800) {
            committed = true; upstream.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
          } else fail()
        } catch { fail() }
      })
    })
  })
  return sockets
}
