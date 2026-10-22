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
