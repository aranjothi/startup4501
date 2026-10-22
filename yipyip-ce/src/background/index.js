import { getSession } from '../practice/sessionStore.js'
import { rewardSession } from '../practice/rewards.js'
import { getAttempt } from '../lessons/lessonStore.js'
import { rewardLesson } from '../lessons/rewards.js'
import { buyCosmetic, equipCosmetic } from '../pet/cosmetics.js'
import { validateProfile } from '../lessons/catalog.js'

const HUNGER_DECAY_PER_MIN = 100 / 852
const MOOD_DECAY_PER_MIN = 100 / 1440

async function initialize() {
  await chrome.sidePanel.setOptions({ path: 'index.html', enabled: true })
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  // Keep old task data for a future return, but retire all productivity alarms.
  await chrome.alarms.clear('taskComplete')
  await chrome.alarms.clear('uiTimerExpiry')
  await chrome.storage.local.remove(['activeTask', 'activeUITimer'])
  await chrome.action.setBadgeText({ text: '' })
  await chrome.action.setIcon({ path: 'src/assets/ui/yipyip_logo.png' })
  if (chrome.offscreen && await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument()
  if (!await chrome.alarms.get('hungerDecay')) chrome.alarms.create('hungerDecay', { periodInMinutes: 1 })
}
chrome.runtime.onInstalled.addListener(() => {
  initialize().catch(console.error)
})
chrome.runtime.onStartup.addListener(() => initialize().catch(console.error))

async function getState() {
  const { userState } = await chrome.storage.local.get('userState')
  const now = Date.now()
  const state = userState ?? {
    id: crypto.randomUUID(), coins: 0, treats: 0, rewardedSessionIds: [],
    pet: { name: 'Pal', level: 1, xp: 0, hunger: 100, mood: 100, lastActiveAt: now, lastDecayAt: now },
  }
  const minutes = Math.max(0, (now - (state.pet.lastDecayAt ?? now)) / 60000)
  state.pet.hunger = Math.max(0, state.pet.hunger - minutes * HUNGER_DECAY_PER_MIN)
  state.pet.mood = Math.max(0, state.pet.mood - minutes * MOOD_DECAY_PER_MIN)
  state.pet.lastDecayAt = now
  return state
}
const saveState = state => chrome.storage.local.set({ userState: state })

// Serialize read-modify-write operations so purchases and rewards cannot race.
let queue = Promise.resolve()
function serialize(action) {
  const result = queue.then(action)
  queue = result.catch(() => {})
  return result
}

async function handle(message) {
  const state = await getState()
  switch (message.type) {
    case 'GET_STATE':
      await saveState(state)
      return { type: 'STATE', payload: state }
    case 'COMPLETE_PRACTICE': {
      const session = await getSession(message.payload?.sessionId)
      const result = rewardSession(state, session)
      await saveState(result.state)
      return { type: 'PRACTICE_COMPLETED', payload: result.state, awarded: result.awarded }
    }
    case 'SET_LEARNING_PROFILE':
      if (!validateProfile(message.payload)) throw new Error('Choose at least one topic and a daily goal.')
      state.learningProfile = { topics: [...new Set(message.payload.topics)], confidence: message.payload.confidence, dailyGoal: message.payload.dailyGoal, updatedAt: Date.now() }
      await saveState(state)
      return { type: 'STATE', payload: state }
    case 'COMPLETE_LESSON': {
      const attempt = await getAttempt(message.payload?.attemptId)
      const result = rewardLesson(state, attempt)
      await saveState(result.state)
      return { type: 'LESSON_COMPLETED', payload: result.state, awarded: result.awarded }
    }
    case 'BUY_COSMETIC': {
      const next = buyCosmetic(state, message.payload?.id)
      await saveState(next)
      return { type: 'STATE', payload: next }
    }
    case 'EQUIP_COSMETIC': {
      const next = equipCosmetic(state, message.payload)
      await saveState(next)
      return { type: 'STATE', payload: next }
    }
    case 'BUY_TREAT':
      if (state.coins < 10) return { type: 'BUY_TREAT_FAILED', error: 'You need 10 coins for a treat.' }
      state.coins -= 10
      state.treats = (state.treats ?? 0) + 1
      await saveState(state)
      return { type: 'BUY_TREAT_SUCCESS', payload: state }
    case 'USE_TREAT':
      if (!(state.treats > 0)) return { type: 'USE_TREAT_FAILED', error: 'Pick up a treat in the shop first.' }
      if (state.pet.hunger >= 99.99) return { type: 'USE_TREAT_FAILED', error: `${state.pet.name} is already well fed!` }
      state.treats -= 1
      state.pet.hunger = Math.min(100, state.pet.hunger + 10)
      await saveState(state)
      return { type: 'USE_TREAT_SUCCESS', payload: state }
    case 'RENAME_PET':
      state.pet.name = String(message.payload?.name ?? '').trim().slice(0, 24) || 'Pal'
      await saveState(state)
      return { type: 'STATE', payload: state }
    default:
      return { type: 'ERROR', error: 'Unknown request.' }
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false
  serialize(() => handle(message)).then(respond, error => respond({ type: 'ERROR', error: error.message }))
  return true
})
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'hungerDecay') serialize(async () => saveState(await getState())).catch(console.error)
})
