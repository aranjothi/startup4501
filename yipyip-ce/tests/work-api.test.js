import test from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../src/work/api.js'
const plan = { title: 'Read', description: 'One chapter', minutes: 20, steps: ['Open book', 'Read chapter'] }
test('task planner sends a description to the shared server and validates its suggestion', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:8787/api/task-plan')
      assert.deepEqual(JSON.parse(options.body), { description: 'Read a chapter' })
      assert.equal(options.headers.Authorization, undefined)
      return Response.json(plan)
    }
    assert.deepEqual(await api.suggestTask('Read a chapter'), plan)
    globalThis.fetch = async () => Response.json({ ...plan, minutes: -1 })
    await assert.rejects(api.suggestTask('Read'), /minutes/)
  } finally { globalThis.fetch = original }
})
test('planning failure and cancellation reject without returning a fabricated task', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => Response.json({ error: 'Try again shortly' }, { status: 503 })
    await assert.rejects(api.suggestTask('Read'), /Try again shortly/)
    globalThis.fetch = async () => { throw new Error('Network error') }
    await assert.rejects(api.suggestTask('Read'), /unavailable/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(api.suggestTask('Read', controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
test('work actions surface worker errors and return authoritative state', async () => {
  const original = globalThis.chrome
  try {
    globalThis.chrome = { runtime: { sendMessage: async message => {
      assert.deepEqual(message, { type: 'START_WORK', payload: { id: 'task-1' } })
      return { payload: { coins: 10, work: { active: { taskId: 'task-1' } } } }
    } } }
    assert.equal((await api.sendWork('START_WORK', { id: 'task-1' })).work.active.taskId, 'task-1')
    chrome.runtime.sendMessage = async () => ({ error: 'Finish your session first' })
    await assert.rejects(api.sendWork('START_WORK'), /Finish your session first/)
  } finally { globalThis.chrome = original }
})
test('timer controls include the session shown on screen, and reject missing session IDs', async () => {
  const original = globalThis.chrome
  const calls = []
  try {
    globalThis.chrome = { runtime: { sendMessage: async message => {
      calls.push(message)
      return { payload: { coins: 10 } }
    } } }
    await api.sendWork('PAUSE_WORK', {}, 'visible-session')
    assert.equal(calls[0].payload.sessionId, 'visible-session')
    await assert.rejects(api.sendWork('FINISH_WORK'), /session/)
    assert.equal(calls.length, 1)
  } finally { globalThis.chrome = original }
})
