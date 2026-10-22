import test from 'node:test'
import assert from 'node:assert/strict'
import { transcriptFillers, retainRecognizedFillers } from '../src/lessons/disfluency.js'
import { validateRequest } from '../server/validation.js'
import { getLesson } from '../src/lessons/catalog.js'

test('counts literal hesitations, including elongated spellings, without penalizing meaningful words', () => {
  assert.deepEqual(transcriptFillers('Um, I, uh, uhh, uuh, ummm, erm, er, I like cooking.'), { total: 7, counts: { um: 2, uh: 3, erm: 1, er: 1 } })
  assert.equal(transcriptFillers('I like cooking, you know my friend, and summer is fun.').total, 0)
  assert.equal(transcriptFillers('Uh-huh, um-hmm, yes.').total, 0)
})

test('keeps fillers heard in the live transcript when the final merely cleans them away', () => {
  assert.equal(retainRecognizedFillers('I like cooking.', 'Um, I, uh, like cooking.'), 'Um, I, uh, like cooking.')
  assert.equal(retainRecognizedFillers('', 'uh'), 'uh')
})

test('never invents fillers or overrides meaningful recognition corrections', () => {
  assert.equal(retainRecognizedFillers('I like hiking.', 'Um, I like cooking.'), 'I like hiking.')
  assert.equal(retainRecognizedFillers('I like cooking.', 'I like cooking.'), 'I like cooking.')
  assert.equal(retainRecognizedFillers('', 'Something unfinished'), '')
})

test('voice source and verbatim fillers reach the conversation evaluator intact', () => {
  const lesson = getLesson('everyday-1')
  const result = validateRequest({ lessonId: lesson.id, messages: [{ role: 'assistant', content: lesson.opening }, { role: 'user', source: 'voice', content: 'Um, I, uh, enjoy cooking.' }] })
  assert.equal(result.messages[1].source, 'voice')
  assert.equal(result.messages[1].content, 'Um, I, uh, enjoy cooking.')
})
