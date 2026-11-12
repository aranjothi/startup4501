import test from 'node:test'
import assert from 'node:assert/strict'

let listener
const data = {
  userState: {
    id: 'existing-user', coins: 10, treats: 2,
    pet: { name: 'Original Pal', level: 4, xp: 80, hunger: 65, mood: 70, lastDecayAt: Date.now() },
  },
  tasks: [{ id: 'old-task', title: 'Keep for later' }],
}
const event = () => ({ addListener() {} })
globalThis.chrome = {
  runtime: {
    id: 'yipyip-test', onInstalled: event(), onStartup: event(),
    onMessage: { addListener(fn) { listener = fn } },
  },
  storage: { local: {
    async get(key) {
      // Yield to exercise competing read-modify-write requests.
      await new Promise(resolve => setTimeout(resolve, 2))
      return { [key]: structuredClone(data[key]) }
    },
    async set(value) { Object.assign(data, structuredClone(value)) },
  } },
  alarms: { onAlarm: event() },
}
await import('../src/background/index.js')
const send = message => new Promise(resolve => listener(message, { id: 'yipyip-test' }, resolve))

test('loading the new app preserves existing pet and legacy task progress', async () => {
  const response = await send({ type: 'GET_STATE' })
  assert.equal(response.payload.pet.name, 'Original Pal')
  assert.equal(response.payload.pet.level, 4)
  assert.equal(response.payload.pet.xp, 80)
  assert.equal(response.payload.coins, 10)
  assert.equal(data.tasks[0].id, 'old-task')
})
test('simultaneous purchases cannot spend the same coins twice', async () => {
  const responses = await Promise.all([send({ type: 'BUY_TREAT' }), send({ type: 'BUY_TREAT' })])
  assert.equal(responses.filter(response => response.type === 'BUY_TREAT_SUCCESS').length, 1)
  assert.equal(responses.filter(response => response.type === 'BUY_TREAT_FAILED').length, 1)
  assert.equal(data.userState.coins, 0)
  assert.equal(data.userState.treats, 3)
})
test('renaming a pet cannot modify its coins or level', async () => {
  await send({ type: 'RENAME_PET', payload: { name: 'New Pal', coins: 1000, level: 100 } })
  assert.equal(data.userState.pet.name, 'New Pal')
  assert.equal(data.userState.coins, 0)
  assert.equal(data.userState.pet.level, 4)
})
test('legacy free-form reward requests are no longer supported', async () => {
  const response = await send({ type: 'ADD_COINS', payload: { coins: 10000, xp: 10000 } })
  assert.equal(response.type, 'ERROR')
  assert.equal(data.userState.coins, 0)
  assert.equal(data.userState.pet.xp, 80)
})
test('cosmetic purchase messages ignore supplied prices and serialize duplicate buys', async () => {
  data.userState.coins = 40
  const results = await Promise.all([
    send({ type: 'BUY_COSMETIC', payload: { id: 'coral-bow', cost: 0 } }),
    send({ type: 'BUY_COSMETIC', payload: { id: 'coral-bow', cost: 0 } }),
  ])
  assert.equal(results.filter(result => result.error).length, 1)
  assert.equal(data.userState.coins, 20)
  assert.deepEqual(data.userState.ownedCosmetics, ['coral-bow'])
  assert.equal(data.userState.pet.cosmetics, undefined)
})
test('background rejects unowned equips and applies owned equipment without spending', async () => {
  assert.ok((await send({ type: 'EQUIP_COSMETIC', payload: { id: 'gold-crown' } })).error)
  assert.ok((await send({ type: 'BUY_COSMETIC', payload: { id: 'blue-cap' } })).error)
  const equipped = await send({ type: 'EQUIP_COSMETIC', payload: { id: 'coral-bow', coins: 999 } })
  assert.equal(equipped.payload.pet.cosmetics.neck, 'coral-bow')
  assert.equal(equipped.payload.coins, 20)
  const removed = await send({ type: 'EQUIP_COSMETIC', payload: { id: null, slot: 'neck' } })
  assert.deepEqual(removed.payload.pet.cosmetics, {})
  assert.deepEqual(removed.payload.ownedCosmetics, ['coral-bow'])
})
test('work messages save reviewed tasks and serialize completion rewards exactly once', async () => {
  const saved = await send({ type: 'SAVE_WORK_TASK', payload: { title: 'Read', description: '', minutes: 10, steps: ['Read a chapter'] } })
  assert.ok(saved.payload?.work?.tasks?.length)
  const id = saved.payload.work.tasks.at(-1).id
  await send({ type: 'START_WORK', payload: { id } })
  data.userState.work.active.runningSince = Date.now() - 120000
  const before = data.userState.coins
  const payload = { sessionId: data.userState.work.active.id }
  const results = await Promise.all([send({ type: 'FINISH_WORK', payload }), send({ type: 'FINISH_WORK', payload })])
  assert.equal(results.filter(result => !result.error).length, 1)
  assert.equal(data.userState.coins, before + 2)
})

test('a delayed completion cannot finish a replacement work session', async () => {
  const first = await send({ type: 'START_WORK', payload: { title: 'First session', minutes: 10 } })
  const oldId = first.payload.work.active.id
  await send({ type: 'STOP_WORK', payload: { sessionId: oldId } })
  const second = await send({ type: 'START_WORK', payload: { title: 'New session', minutes: 20 } })
  const newId = second.payload.work.active.id
  const coins = second.payload.coins
  const delayed = await send({ type: 'FINISH_WORK', payload: { sessionId: oldId } })
  assert.match(delayed.error, /session has changed/)
  assert.equal(data.userState.work.active.id, newId)
  assert.equal(data.userState.coins, coins)
})

test('checklist messages persist partial progress and repeated checks never pay rewards', async () => {
  const saved = await send({ type: 'SAVE_WORK_TASK', payload: { title: 'Checklist test', description: '', minutes: 10, steps: ['Read', 'Write'] } })
  const id = saved.payload.work.tasks.at(-1).id
  const before = saved.payload.coins
  const payload = { id, stepIndex: 0, stepText: 'Read', completed: true }
  const results = await Promise.all([send({ type: 'SET_WORK_STEP', payload }), send({ type: 'SET_WORK_STEP', payload })])
  assert.ok(results.every(result => !result.error))
  const loaded = await send({ type: 'GET_WORK' })
  assert.deepEqual(loaded.payload.work.tasks.find(task => task.id === id).completedSteps, [0])
  assert.equal(loaded.payload.coins, before)
})

test('check-in preferences and dismissals persist without changing rewards', async () => {
  const initial = await send({ type: 'GET_WORK' })
  const sessionId = initial.payload.work.active.id
  const before = initial.payload.coins
  const off = await send({ type: 'SET_WORK_CHECK_INS', payload: { enabled: false } })
  assert.equal(off.payload?.work.checkInsEnabled, false)
  await send({ type: 'SET_WORK_CHECK_INS', payload: { enabled: true } })
  const results = await Promise.all([
    send({ type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId, checkInId: 'start' } }),
    send({ type: 'DISMISS_WORK_CHECK_IN', payload: { sessionId, checkInId: 'start' } }),
  ])
  assert.ok(results.every(result => !result.error))
  const loaded = await send({ type: 'GET_WORK' })
  assert.deepEqual(loaded.payload.work.active.dismissedCheckIns, ['start'])
  assert.equal(loaded.payload.coins, before)
})

test('completed work history persists its checklist and XP; viewing it cannot grant rewards again', async () => {
  const current = await send({ type: 'GET_WORK' })
  if (current.payload.work.active) await send({ type: 'STOP_WORK', payload: { sessionId: current.payload.work.active.id } })
  const saved = await send({ type: 'SAVE_WORK_TASK', payload: { title: 'History task', description: '', minutes: 10, steps: ['Read', 'Write'] } })
  const id = saved.payload.work.tasks.at(-1).id
  await send({ type: 'SET_WORK_STEP', payload: { id, stepIndex: 0, stepText: 'Read', completed: true } })
  await send({ type: 'START_WORK', payload: { id } })
  data.userState.work.active.runningSince = Date.now() - 91000
  const completed = await send({ type: 'FINISH_WORK', payload: { sessionId: data.userState.work.active.id } })
  const entry = completed.payload.work.history.at(-1)
  assert.equal(entry.xp, 1)
  assert.deepEqual(entry.checklist, { steps: ['Read', 'Write'], completedSteps: [0] })
  const loaded = await send({ type: 'GET_WORK' })
  assert.deepEqual(loaded.payload.work.history.at(-1), entry)
  assert.equal(loaded.payload.coins, completed.payload.coins)
})
