const signals = ['engaged', 'off_topic', 'blocking']
export const ENGAGEMENT_VERSION = 2
export function validEngagement(value, userTurns) {
  return value && signals.includes(value.latest) && (userTurns === 1 ? value.previous === 'none' : signals.includes(value.previous))
}
export function conversationOutcome(value) {
  const concerning = signal => ['off_topic', 'blocking'].includes(signal)
  if (!concerning(value?.latest)) return 'continue'
  return concerning(value?.previous) ? 'paused' : 'warning'
}

export function lessonProgress(messages = [], requiredReplies = 3, paused = false) {
  const replies = messages.filter(message => message.role === 'user')
  const successful = reply => reply.validated === true && !!reply.content?.trim() && !!reply.feedback
    && reply.assessmentVersion === ENGAGEMENT_VERSION && reply.engagement?.latest === 'engaged' && reply.outcome === 'continue'
  const engagedReplies = replies.filter(successful).length
  return {
    engagedReplies, totalReplies: replies.length,
    canComplete: !paused && !replies.some(reply => reply.outcome === 'paused') && engagedReplies >= requiredReplies
      && successful(replies.at(-1) ?? {}) && replies.every(reply => reply.validated === true && !!reply.feedback && !!reply.content?.trim()),
  }
}
