import test from 'node:test'
import assert from 'node:assert/strict'
import * as landing from '../src/work/landing.js'

test('Work chooses from varied open-ended prompts using the supplied random value', () => {
  const first = landing.pickWorkQuestion(() => 0)
  const last = landing.pickWorkQuestion(() => .999)
  assert.notEqual(first, last)
  assert.ok(landing.WORK_QUESTIONS.includes(first))
  assert.ok(landing.WORK_QUESTIONS.includes(last))
  assert.ok(landing.WORK_QUESTIONS.every(question => question.endsWith('?')))
})
