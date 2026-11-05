import test from 'node:test'
import assert from 'node:assert/strict'
import * as calendar from '../src/lessons/calendar.js'

const cases = [
  { completed: 0, goal: 3, expected: '0 / 3 today · 3 lessons to go' },
  { completed: 2, goal: 3, expected: '2 / 3 today · 1 lesson to go' },
  { completed: 3, goal: 3, expected: '3 / 3 today · Goal complete!' },
  { completed: 4, goal: 3, expected: '4 / 3 today · Goal complete!' },
  { completed: 1, goal: 1, expected: '1 / 1 today · Goal complete!' },
  { completed: 1, goal: 2, expected: '1 / 2 today · 1 lesson to go' },
  { completed: 0, goal: undefined, expected: '0 / 1 today · 1 lesson to go' },
]

for (const { completed, goal, expected } of cases) {
  test(`daily goal status for ${completed}/${goal ?? 'missing'}`, () => {
    assert.equal(calendar.dailyGoalStatus?.(completed, goal), expected)
  })
}
