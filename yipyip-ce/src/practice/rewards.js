import { MIN_REWARD_SECONDS, SESSION_REWARD, SCENARIOS } from './scenarios.js'

// The service worker applies this once per saved recording, never from UI amounts.
export function rewardSession(state, session) {
  if (!session || !SCENARIOS.some(s => s.id === session.scenarioId)
    || !Number.isFinite(session.duration) || session.duration < MIN_REWARD_SECONDS
    || session.duration > 302 || !session.blob?.size) {
    throw new Error('Record at least 10 seconds before claiming a practice reward.')
  }
  if ((state.rewardedSessionIds ?? []).includes(session.id)) return { state, awarded: false }
  const next = structuredClone(state)
  next.coins += SESSION_REWARD.coins
  next.pet.xp += SESSION_REWARD.xp
  next.pet.mood = Math.min(100, next.pet.mood + SESSION_REWARD.mood)
  next.pet.lastActiveAt = Date.now()
  while (next.pet.xp >= next.pet.level * 100) {
    next.pet.xp -= next.pet.level * 100
    next.pet.level += 1
  }
  next.rewardedSessionIds = [...(next.rewardedSessionIds ?? []), session.id]
  return { state: next, awarded: true }
}
