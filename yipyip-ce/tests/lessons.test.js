import test from 'node:test'
import assert from 'node:assert/strict'
import { practiceStats, monthDays, localDayKey } from '../src/lessons/calendar.js'
import { lessonFeed, recommendedLesson, getLesson, validateProfile } from '../src/lessons/catalog.js'
import { rewardLesson } from '../src/lessons/rewards.js'
const completion = dayKey => ({ dayKey, completedAt: new Date(`${dayKey}T12:00:00`).getTime() })
test('calendar counts each practiced day once and handles yesterday grace', () => {
  const now = new Date(2026, 9, 21, 12)
  const data = ['2026-10-17', '2026-10-18', '2026-10-18', '2026-10-19', '2026-10-20'].map(completion)
  assert.deepEqual(practiceStats(data, now), { current: 4, longest: 4, daysPracticed: 4 })
  assert.deepEqual(practiceStats([...data, completion('2026-10-21')], now), { current: 5, longest: 5, daysPracticed: 5 })
})
test('broken streaks retain longest run and ignore future or invalid dates', () => {
  const data = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-18', '2026-11-01'].map(completion)
  data.push({ dayKey: '2026-02-30', completedAt: 1 })
  assert.deepEqual(practiceStats(data, new Date(2026, 9, 21)), { current: 0, longest: 3, daysPracticed: 4 })
})
test('calendar handles leap February and Monday-based grid', () => {
  assert.equal(monthDays(2024, 1).filter(Boolean).length, 29)
  assert.equal(monthDays(2026, 1).filter(Boolean).length, 28)
  assert.equal(monthDays(2026, 5)[0].day, 1)
  assert.equal(localDayKey(new Date(2026, 9, 21, 0, 1)), '2026-10-21')
})
test('day streak survives DST and year boundaries', () => {
  assert.equal(practiceStats(['2026-03-07', '2026-03-08', '2026-03-09'].map(completion), new Date(2026, 2, 9, 12)).current, 3)
  assert.equal(practiceStats(['2025-12-31', '2026-01-01'].map(completion), new Date(2026, 0, 1, 12)).current, 2)
})
test('survey restricts feed topics and recommendations rotate through them', () => {
  const profile = { topics: ['interview', 'everyday'], confidence: 'starting', dailyGoal: 1 }
  assert.equal(validateProfile(profile), true)
  assert.equal(validateProfile({ ...profile, topics: ['unknown'] }), false)
  assert.deepEqual(lessonFeed(profile).map(section => section.id), ['interview', 'everyday'])
  assert.equal(recommendedLesson(profile).id, 'interview-1')
  assert.equal(recommendedLesson(profile, [{ lessonId: 'interview-1', completedAt: 1 }]).id, 'everyday-1')
  assert.equal(recommendedLesson(profile, [{ lessonId: 'interview-1', completedAt: 1 }, { lessonId: 'everyday-1', completedAt: 2 }]).id, 'interview-2')
})
test('completing lessons awards effort once per attempt', () => {
  const lesson = getLesson('everyday-1')
  const state = { coins: 0, pet: { level: 1, xp: 90, mood: 80 } }
  const attempt = { id: 'attempt', lessonId: lesson.id, ...completion('2026-10-21'), messages: Array.from({ length: 3 }, () => ({ role: 'user', content: 'Hello', validated: true, assessmentVersion: 2, engagement: { latest: 'engaged', previous: 'engaged' }, outcome: 'continue', feedback: { strength: 'A clear greeting.' } })) }
  const first = rewardLesson(state, attempt)
  assert.equal(first.state.coins, 10)
  assert.equal(first.state.pet.level, 2)
  assert.equal(first.state.pet.xp, 20)
  assert.equal(rewardLesson(first.state, attempt).awarded, false)
  assert.throws(() => rewardLesson(state, { ...attempt, messages: attempt.messages.slice(0, 2) }))
  assert.throws(() => rewardLesson(state, { ...attempt, completedAt: undefined }))
})
