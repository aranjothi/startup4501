import { getLesson } from './catalog.js'
import { SESSION_REWARD } from '../practice/scenarios.js'
import { lessonProgress } from './engagement.js'
export function rewardLesson(state, attempt) {
  const lesson = getLesson(attempt?.lessonId)
  if (!lesson || attempt.paused || !Number.isFinite(attempt.completedAt) || !attempt.dayKey
    || !lessonProgress(attempt.messages, lesson.requiredReplies, attempt.paused).canComplete) throw new Error('Complete three engaged replies and bring the conversation back on track before collecting a reward.')
  if ((state.rewardedLessonAttemptIds ?? []).includes(attempt.id)) return { state, awarded: false }
  const next = structuredClone(state)
  next.coins += SESSION_REWARD.coins
  next.pet.xp += SESSION_REWARD.xp
  next.pet.mood = Math.min(100, next.pet.mood + SESSION_REWARD.mood)
  next.pet.lastActiveAt = Date.now()
  while (next.pet.xp >= next.pet.level * 100) { next.pet.xp -= next.pet.level * 100; next.pet.level++ }
  next.rewardedLessonAttemptIds = [...(next.rewardedLessonAttemptIds ?? []), attempt.id]
  return { state: next, awarded: true }
}
