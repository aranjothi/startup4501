import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { generateValidatedTurn, validateRequest } from './validation.js'
import { generateTurn, evaluateTurn, transcribe } from './provider.js'
import { attachVoiceServer } from './voice.js'

try { process.loadEnvFile('.env') } catch (error) { if (error.code !== 'ENOENT') throw error }
const errors = {
  AI_NOT_CONFIGURED: 'Conversation practice is temporarily unavailable. Please try again shortly.',
  AI_UNAVAILABLE: 'The AI service is unavailable. Check the server’s model settings, API access, or billing, then retry.',
  VALIDATION_FAILED: 'We couldn’t validate that reply and feedback. Your message is still here; please retry.',
  INVALID_CONVERSATION: 'This conversation could not be processed. Please start a new lesson.',
  TRANSCRIPTION_FAILED: 'Couldn’t transcribe this recording. Try again or type your reply.',
}
async function readBody(request, limit) {
  const parts = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error('BODY_TOO_LARGE')
    parts.push(chunk)
  }
  return Buffer.concat(parts)
}
export function createServer({ allowedOrigins = process.env.YIPYIP_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean), generate = generateTurn, evaluate = evaluateTurn, transcription = transcribe, voiceConnect } = {}) {
  const windows = new Map()
  const allowed = origin => allowedOrigins?.length ? allowedOrigins.includes(origin) : /^chrome-extension:\/\/[a-p]{32}$/.test(origin) || origin === 'http://127.0.0.1:4173'
  function takeRequest() {
    const minute = Math.floor(Date.now() / 60000)
    const count = windows.get(minute) ?? 0
    windows.clear(); windows.set(minute, count + 1)
    return count < 30
  }
  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin ?? ''
    const send = (status, body) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)) }
    if (!allowed(origin)) return send(403, { error: 'Origin not allowed.' })
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }
    if (request.method !== 'POST') return send(405, { error: 'Method not allowed.' })
    if (!takeRequest()) return send(429, { error: 'Please wait a moment before sending another reply.' })
    try {
      if (request.url === '/api/turn') {
        const input = validateRequest(JSON.parse((await readBody(request, 100000)).toString('utf8')))
        return send(200, await generateValidatedTurn({ ...input, generate, evaluate }))
      }
      if (request.url === '/api/transcribe') {
        const type = (request.headers['content-type'] ?? '').split(';')[0]
        if (!['audio/webm', 'audio/mp4', 'audio/ogg'].includes(type)) return send(400, { error: 'Unsupported audio format.' })
        const bytes = await readBody(request, 8 * 1024 * 1024)
        if (bytes.length < 100) return send(400, { error: 'Record a spoken reply before transcribing.' })
        return send(200, { text: await transcription(bytes, type) })
      }
      return send(404, { error: 'Not found.' })
    } catch (error) {
      const message = errors[error.message]
      return send(error.message === 'INVALID_CONVERSATION' ? 400 : message ? 503 : 400, { error: message ?? 'Couldn’t process this request. Please retry.' })
    }
  })
  server.requestTimeout = 180000
  attachVoiceServer(server, { allowed, takeRequest, connect: voiceConnect })
  return { server }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.YIPYIP_HOST || '127.0.0.1'
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !process.env.YIPYIP_ALLOWED_ORIGINS?.trim()) {
    throw new Error('Set YIPYIP_ALLOWED_ORIGINS to your extension origin before exposing the shared server.')
  }
  const { server } = createServer()
  const port = Number(process.env.YIPYIP_PORT || 8787)
  server.listen(port, host, () => {
    console.log(`YipYip AI server listening on ${host}:${port}`)
    console.log(process.env.OPENAI_API_KEY ? 'OpenAI key loaded.' : 'Add OPENAI_API_KEY to .env to enable natural replies and transcription.')
  })
}
