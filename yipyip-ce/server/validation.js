import { getLesson } from '../src/lessons/catalog.js'
import { validEngagement, conversationOutcome, ENGAGEMENT_VERSION } from '../src/lessons/engagement.js'

export function validateRequest(body) {
  const lesson = getLesson(body?.lessonId)
  if (!lesson || !Array.isArray(body.messages) || body.messages.length < 2 || body.messages.length > 18) throw new Error('INVALID_CONVERSATION')
  for (let i = 0; i < body.messages.length; i++) {
    const message = body.messages[i]
    if (message.role !== (i % 2 === 0 ? 'assistant' : 'user') || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 4000) throw new Error('INVALID_CONVERSATION')
  }
  if (body.messages.at(-1).role !== 'user' || body.messages[0].content !== lesson.opening) throw new Error('INVALID_CONVERSATION')
  return { lesson: { ...lesson, learnerLevel: ['starting', 'building', 'confident'].includes(body.confidence) ? body.confidence : 'starting' }, messages: body.messages.map(({ role, content, source }) => ({ role, content, ...(role === 'user' ? { source: source === 'voice' ? 'voice' : 'typed' } : {}) })) }
}
export const TURN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['topicId', 'reply', 'feedback', 'engagement'],
  properties: {
    topicId: { type: 'string' }, reply: { type: 'string' },
    engagement: { type: 'object', additionalProperties: false, required: ['latest', 'previous'], properties: { latest: { type: 'string', enum: ['engaged', 'off_topic', 'blocking'] }, previous: { type: 'string', enum: ['none', 'engaged', 'off_topic', 'blocking'] } } },
    feedback: { type: 'object', additionalProperties: false, required: ['strength', 'improvement', 'suggestion', 'evidenceQuote'], properties: Object.fromEntries(['strength', 'improvement', 'suggestion', 'evidenceQuote'].map(key => [key, { type: 'string' }])) },
  },
}
export const REVIEW_SCHEMA = { type: 'object', additionalProperties: false, required: ['approved', 'errors', 'engagement'], properties: { approved: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } }, engagement: TURN_SCHEMA.properties.engagement } }
export function validateTurn(candidate, lesson, userText, userTurns = 1) {
  const errors = []
  if (!candidate || candidate.topicId !== lesson.topicId) errors.push('WRONG_TOPIC')
  if (typeof candidate?.reply !== 'string' || !candidate.reply.trim() || candidate.reply.length > 1200) errors.push('INVALID_REPLY')
  for (const field of ['strength', 'improvement', 'suggestion', 'evidenceQuote']) {
    if (typeof candidate?.feedback?.[field] !== 'string' || !candidate.feedback[field].trim() || candidate.feedback[field].length > 800) errors.push(`INVALID_${field.toUpperCase()}`)
  }
  if (candidate?.feedback?.evidenceQuote && !userText.includes(candidate.feedback.evidenceQuote)) errors.push('UNSUPPORTED_QUOTE')
  if (!validEngagement(candidate?.engagement, userTurns)) errors.push('INVALID_ENGAGEMENT')
  const feedback = Object.values(candidate?.feedback ?? {}).join(' ')
  if (/\b(your|you have|you showed)\s+(eye contact|posture|facial expression|body language)\b/i.test(feedback)) errors.push('UNSUPPORTED_VISUAL_CLAIM')
  return errors
}

function reviewedSetback(lesson, messages, engagement) {
  const text = messages.at(-1).content.trim()
  const quote = text.slice(0, 120)
  const paused = conversationOutcome(engagement) === 'paused'
  // These strings are application copy, not rejected model feedback. The
  // independent review supplies only validated classification enums.
  return {
    topicId: lesson.topicId, engagement,
    reply: paused ? 'This practice conversation has paused.' : 'Could you answer my last question with one detail so we have something to talk about?',
    feedback: {
      strength: 'This turn needs a different approach before it can count toward the lesson.',
      improvement: engagement.latest === 'blocking'
        ? `“${quote}” shuts down the exchange instead of answering ${lesson.partnerName ?? 'your partner'}’s question.${paused ? ' This follows another off-topic or conversation-blocking reply, so the practice has paused.' : ''}`
        : `“${quote}” does not answer the question or stay with this conversation.${paused ? ' Two consecutive replies have stalled the exchange, so the practice has paused.' : ''}`,
      suggestion: `Try one relevant detail or a related question. Your goal: ${lesson.goal}`,
      evidenceQuote: quote,
    },
  }
}

// Failed candidates are only available to the correction loop, never the client.
export async function generateValidatedTurn({ lesson, messages, generate, evaluate }) {
  let errors = [], candidate, assessment
  const userTurns = messages.filter(message => message.role === 'user').length
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      candidate = await generate({ lesson, messages, candidate, errors, assessment })
      if (assessment && candidate) candidate = { ...candidate, engagement: assessment }
      // There is objectively no prior user turn on the first exchange. Derive
      // that fact from the transcript instead of asking a model to infer it.
      if (userTurns === 1 && candidate?.engagement) candidate = { ...candidate, engagement: { ...candidate.engagement, previous: 'none' } }
      errors = validateTurn(candidate, lesson, messages.at(-1).content, userTurns)
      if (!errors.length) {
        const review = await evaluate({ lesson, messages, candidate })
        const reviewed = userTurns === 1 && review?.engagement ? { ...review.engagement, previous: 'none' } : review?.engagement
        if (!validEngagement(reviewed, userTurns)) errors = ['INVALID_REVIEW_ENGAGEMENT']
        else {
          assessment = reviewed
          if (conversationOutcome(reviewed) !== 'continue') {
            const setback = reviewedSetback(lesson, messages, reviewed)
            const setbackErrors = validateTurn(setback, lesson, messages.at(-1).content, userTurns)
            if (!setbackErrors.length) return { ...setback, outcome: conversationOutcome(reviewed), assessmentVersion: ENGAGEMENT_VERSION, validation: { approved: true, attempts: attempt } }
            errors = setbackErrors
            continue
          }
          const mismatch = candidate.engagement.latest !== reviewed.latest || candidate.engagement.previous !== reviewed.previous
          if (!Array.isArray(review.errors)) errors = ['INVALID_REVIEW_ERRORS']
          else if (review?.approved !== true || review.errors.length || mismatch) errors = [...review.errors, ...(mismatch ? ['ENGAGEMENT_MISMATCH_USE_REVIEWED_ASSESSMENT'] : [])]
          if (review?.approved !== true && !errors.length) errors = ['REVIEW_REJECTED']
        }
      }
      if (!errors.length) return { ...candidate, outcome: conversationOutcome(candidate.engagement), assessmentVersion: ENGAGEMENT_VERSION, validation: { approved: true, attempts: attempt } }
    } catch (error) {
      if (['AI_UNAVAILABLE', 'AI_NOT_CONFIGURED'].includes(error.message)) throw error
      errors = ['INVALID_MODEL_OUTPUT']
    }
  }
  throw new Error('VALIDATION_FAILED')
}
