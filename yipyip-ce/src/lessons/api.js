import { serverUrl } from './serverUrl.js'
import { validEngagement, conversationOutcome, ENGAGEMENT_VERSION } from './engagement.js'

const BASE = serverUrl(import.meta.env?.VITE_AI_SERVER_URL)
async function request(path, { body, contentType, signal }) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': contentType }, body, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(150000)]) : AbortSignal.timeout(150000) })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Conversation practice is temporarily unavailable. Please try again shortly.')
  }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Couldn’t get a reply. Please retry.')
  return result
}
export async function lessonTurn(lessonId, messages, signal, confidence) {
  const result = await request('/api/turn', { body: JSON.stringify({ lessonId, confidence, messages: messages.map(({ role, content, source }) => ({ role, content, ...(role === 'user' ? { source: source === 'voice' ? 'voice' : 'typed' } : {}) })) }), contentType: 'application/json', signal })
  if (result.validation?.approved !== true || typeof result.reply !== 'string' || !result.feedback) throw new Error('The reply could not be validated. Please retry.')
  if (result.assessmentVersion !== ENGAGEMENT_VERSION || !validEngagement(result.engagement, messages.filter(message => message.role === 'user').length) || result.outcome !== conversationOutcome(result.engagement)) throw new Error('The conversation feedback could not be validated. Please retry.')
  return result
}
export async function transcribeReply(blob, signal) {
  const result = await request('/api/transcribe', { body: blob, contentType: blob.type || 'audio/webm', signal })
  if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('No speech was detected. Please try again.')
  return result.text
}
