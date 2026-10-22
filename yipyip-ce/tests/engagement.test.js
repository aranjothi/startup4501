import test from 'node:test'
import assert from 'node:assert/strict'
import { conversationOutcome, validEngagement, lessonProgress } from '../src/lessons/engagement.js'
import { saveAttempt } from '../src/lessons/lessonStore.js'
import { generateValidatedTurn } from '../server/validation.js'
import { rewardLesson } from '../src/lessons/rewards.js'
import { getLesson } from '../src/lessons/catalog.js'

test('one off-topic reply warns; only repeated off-topic or blocking replies pause', () => {
  assert.equal(conversationOutcome({ latest: 'off_topic', previous: 'none' }), 'warning')
  assert.equal(conversationOutcome({ latest: 'blocking', previous: 'engaged' }), 'warning')
  assert.equal(conversationOutcome({ latest: 'off_topic', previous: 'blocking' }), 'paused')
  assert.equal(conversationOutcome({ latest: 'engaged', previous: 'off_topic' }), 'continue')
  assert.equal(validEngagement({ latest: 'off_topic', previous: 'off_topic' }, 1), false)
})

test('paused outcome uses independent classifications and never releases rejected model feedback', async () => {
  const lesson = getLesson('everyday-1')
  const messages = [{ role: 'assistant', content: lesson.opening }, { role: 'user', content: 'purple elephants' }, { role: 'assistant', content: 'How was your week?' }, { role: 'user', content: 'purple elephants again' }]
  const candidate = { topicId: lesson.topicId, reply: 'Let’s pause this practice.', engagement: { latest: 'off_topic', previous: 'off_topic' }, feedback: { strength: 'You tried a reply.', improvement: 'Both replies moved away from the topic.', suggestion: 'Share one thing about your week.', evidenceQuote: 'purple elephants again' } }
  let reviews = 0
  const result = await generateValidatedTurn({ lesson, messages, generate: async () => candidate, evaluate: async ({ candidate }) => ++reviews === 1 ? { approved: false, errors: ['EXPLANATION_TOO_GENERIC'], engagement: candidate.engagement } : { approved: true, errors: [], engagement: candidate.engagement } })
  assert.equal(result.outcome, 'paused'); assert.equal(result.validation.attempts, 1)
  assert.notEqual(result.feedback.improvement, candidate.feedback.improvement)
  await assert.rejects(generateValidatedTurn({ lesson, messages, generate: async () => candidate, evaluate: async () => ({ approved: false, errors: ['MISCLASSIFIED_ENGAGEMENT'] }) }), /VALIDATION_FAILED/)
})

test('paused practice cannot claim completion rewards', () => {
  const attempt = { id: 'paused', lessonId: 'everyday-1', paused: true, completedAt: Date.now(), dayKey: '2026-10-21', messages: Array.from({ length: 3 }, () => ({ role: 'user', content: 'Hello', validated: true, feedback: {} })) }
  assert.throws(() => rewardLesson({ coins: 0 }, attempt), /engaged replies/)
})

test('first turn cannot invent a previous failure or prematurely pause the conversation', async () => {
  const lesson = getLesson('everyday-1')
  const result = await generateValidatedTurn({ lesson, messages: [{ role: 'assistant', content: lesson.opening }, { role: 'user', content: 'purple elephants' }],
    generate: async () => ({ topicId: lesson.topicId, reply: 'How was your week?', engagement: { latest: 'off_topic', previous: 'off_topic' }, feedback: { strength: 'You tried a reply.', improvement: 'Bring it back to the week.', suggestion: 'Share one thing you did.', evidenceQuote: 'purple elephants' } }),
    evaluate: async ({ candidate }) => ({ approved: true, errors: [], engagement: candidate.engagement }),
  })
  assert.equal(result.engagement.previous, 'none')
  assert.equal(result.outcome, 'warning')
})

const reply = (signal = 'engaged', outcome = 'continue') => ({ role: 'user', content: 'A practice reply', validated: true, assessmentVersion: 2, feedback: { strength: 'A detail.' }, engagement: { latest: signal }, outcome })
const attemptFor = messages => ({ id: 'quality-test', lessonId: 'everyday-1', completedAt: Date.now(), dayKey: '2026-10-21', messages })
const state = () => ({ coins: 0, pet: { xp: 0, level: 1, mood: 50 } })

test('validated off-topic and dismissive replies do not earn progress or rewards', async () => {
  const messages = [reply('off_topic', 'warning'), reply('blocking', 'warning'), reply('blocking', 'paused')]
  assert.equal(lessonProgress(messages).engagedReplies, 0)
  assert.equal(lessonProgress(messages).canComplete, false)
  assert.throws(() => rewardLesson(state(), attemptFor(messages)), /engaged replies/)
  // Reject before IndexedDB is touched: failed attempts cannot become calendar completions.
  await assert.rejects(saveAttempt(attemptFor(messages), true), /engaged replies/)
})

test('a dismissal disables completion even after three good replies; genuine recovery can finish', () => {
  const messages = [reply(), reply(), reply(), reply('blocking', 'warning')]
  assert.equal(lessonProgress(messages).engagedReplies, 3)
  assert.equal(lessonProgress(messages).canComplete, false)
  assert.throws(() => rewardLesson(state(), attemptFor(messages)), /engaged replies/)
  messages.push(reply())
  assert.equal(lessonProgress(messages).canComplete, true)
  assert.equal(rewardLesson(state(), attemptFor(messages)).state.coins, 10)
})

test('legacy feedback alone cannot qualify unassessed replies for new rewards', () => {
  const messages = Array.from({ length: 3 }, () => ({ role: 'user', content: 'Nah fam', validated: true, feedback: {} }))
  assert.equal(lessonProgress(messages).canComplete, false)
  assert.throws(() => rewardLesson(state(), attemptFor(messages)), /engaged replies/)
  const outdated = [reply(), reply(), reply()].map(({ assessmentVersion, ...message }) => message)
  assert.equal(lessonProgress(outdated).canComplete, false)
  assert.throws(() => rewardLesson(state(), attemptFor(outdated)), /engaged replies/)
})

test('lesson partners have names while retaining their scenario roles', () => {
  const lesson = getLesson('introductions-1')
  assert.equal(lesson.partnerName, 'Alex')
  assert.equal(lesson.partner, 'Someone new')
  assert.match(lesson.opening, /I’m Alex/)
})

test('independent review overrides an overly generous dismissal classification before release', async () => {
  const lesson = getLesson('introductions-1'), seen = []
  const messages = [{ role: 'assistant', content: lesson.opening }, { role: 'user', content: 'qwerty nonsense' }, { role: 'assistant', content: 'What is a hobby you enjoy?' }, { role: 'user', content: 'Nah fam' }]
  const result = await generateValidatedTurn({ lesson, messages,
    generate: async ({ assessment }) => { seen.push(assessment); return { topicId: lesson.topicId, reply: 'Let’s pause.', engagement: { latest: 'engaged', previous: 'off_topic' }, feedback: { strength: 'No topic-related contribution yet.', improvement: 'The reply refuses to share an interest.', suggestion: 'Share one hobby.', evidenceQuote: 'Nah fam' } } },
    evaluate: async () => ({ approved: true, errors: [], engagement: { latest: 'blocking', previous: 'off_topic' } }),
  })
  assert.equal(seen.length, 1)
  assert.equal(result.engagement.latest, 'blocking')
  assert.equal(result.outcome, 'paused')
})
