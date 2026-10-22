chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel.setOptions({ path: 'index.html', enabled: false })
    chrome.storage.local.set({ panelEnabled: false })
  }
  ensureHungerAlarm()
})

chrome.runtime.onStartup.addListener(() => {
  ensureHungerAlarm()
})

async function ensureHungerAlarm() {
  const alarm = await chrome.alarms.get('hungerDecay')
  if (!alarm) chrome.alarms.create('hungerDecay', { periodInMinutes: 1 })
}

const HUNGER_DECAY_PER_MIN = 100 / 852
const MOOD_DECAY_PER_MIN   = 100 / 1440

const DEFAULT_PET = {
  name: 'Pal',
  level: 1,
  xp: 0,
  hunger: 100,
  mood: 100,
  lastActiveAt: Date.now(),
  lastDecayAt: Date.now(),
}

async function getState() {
  const result = await chrome.storage.local.get('userState')
  if (result.userState) return result.userState

  const initial = {
    id: crypto.randomUUID(),
    coins: 0,
    treats: 0,
    pet: { ...DEFAULT_PET },
  }
  await chrome.storage.local.set({ userState: initial })
  return initial
}

async function saveState(state) {
  await chrome.storage.local.set({ userState: state })
}

async function getActiveTask() {
  const result = await chrome.storage.local.get('activeTask')
  return result.activeTask ?? null
}

function applyHungerDecay(state) {
  const now = Date.now()
  const last = state.pet.lastDecayAt ?? now
  const mins = (now - last) / 60_000
  if (mins > 0) {
    state.pet.hunger = Math.max(0, state.pet.hunger - HUNGER_DECAY_PER_MIN * mins)
    state.pet.mood   = Math.max(0, state.pet.mood   - MOOD_DECAY_PER_MIN   * mins)
    state.pet.lastDecayAt = now
  }
  return state
}

const HOURGLASS_PATH = 'M368 48h4c6.627 0 12-5.373 12-12V12c0-6.627-5.373-12-12-12H12C5.373 0 0 5.373 0 12v24c0 6.627 5.373 12 12 12h4c0 80.564 32.188 165.807 97.18 208C47.899 298.381 16 383.9 16 464h-4c-6.627 0-12 5.373-12 12v24c0 6.627 5.373 12 12 12h360c6.627 0 12-5.373 12-12v-24c0-6.627-5.373-12-12-12h-4c0-80.564-32.188-165.807-97.18-208C336.102 213.619 368 128.1 368 48zM64 48h256c0 101.62-57.307 184-128 184S64 149.621 64 48zm256 416H64c0-101.62 57.308-184 128-184s128 82.38 128 184z'

async function drawLogo(ctx, size) {
  try {
    const resp = await fetch(chrome.runtime.getURL('src/assets/ui/yipyip_logo.png'))
    const bitmap = await createImageBitmap(await resp.blob())
    ctx.drawImage(bitmap, 0, 0, size, size)
    bitmap.close()
  } catch { /* continue without logo */ }
}

function drawCornerBadge(ctx, cx, cy, r, bgColor) {
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

async function setProgressIcon() {
  const size = 128
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  await drawLogo(ctx, size)

  const r = 38
  const cx = size - r - 2
  const cy = size - r - 2
  drawCornerBadge(ctx, cx, cy, r, '#6b7280')

  const scale = (r * 2.0) / 512
  const iconW = 384 * scale
  const iconH = 512 * scale
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#fff'
  ctx.translate(cx - iconW / 2, cy - iconH / 2)
  ctx.scale(scale, scale)
  ctx.fill(new Path2D(HOURGLASS_PATH))
  ctx.restore()

  await chrome.action.setIcon({ imageData: { 128: ctx.getImageData(0, 0, size, size) } })
  chrome.action.setBadgeText({ text: '' })
}

async function setAlertIcon() {
  const size = 128
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  await drawLogo(ctx, size)
  ctx.fillStyle = 'rgba(220, 38, 38, 0.58)'
  ctx.fillRect(0, 0, size, size)
  await chrome.action.setIcon({ imageData: { 128: ctx.getImageData(0, 0, size, size) } })
  chrome.action.setBadgeText({ text: '!' })
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626' })
}

async function clearAlertIcon() {
  const size = 128
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  await drawLogo(ctx, size)
  await chrome.action.setIcon({ imageData: { 128: ctx.getImageData(0, 0, size, size) } })
  chrome.action.setBadgeText({ text: '' })
}

async function playChimeOffscreen() {
  if (!chrome.offscreen) return
  try {
    if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play timer completion chime',
      })
    }
    chrome.runtime.sendMessage({ type: 'PLAY_CHIME' })
  } catch (e) {
    console.error('Offscreen chime failed:', e)
  }
}

async function closeOffscreenIfOpen() {
  if (!chrome.offscreen) return
  try {
    if (await chrome.offscreen.hasDocument()) chrome.offscreen.closeDocument()
  } catch { /* nothing open */ }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel') return
  closeOffscreenIfOpen()
  port.onDisconnect.addListener(() => {
    chrome.storage.local.set({ panelEnabled: false })
    chrome.sidePanel.setOptions({ enabled: false })
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    switch (message.type) {
      case 'GET_STATE': {
        const state = await getState()
        applyHungerDecay(state)
        await saveState(state)
        sendResponse({ type: 'STATE', payload: state })
        break
      }
      case 'GET_ACTIVE_TASK': {
        sendResponse({ type: 'ACTIVE_TASK', payload: await getActiveTask() })
        break
      }
      case 'START_TASK': {
        const task = {
          label: message.payload.label,
          startedAt: Date.now(),
          durationMs: message.payload.durationMs,
        }
        await chrome.storage.local.set({ activeTask: task })
        chrome.alarms.create('taskComplete', {
          delayInMinutes: message.payload.durationMs / 60_000,
        })
        sendResponse({ type: 'TASK_STARTED' })
        break
      }
      case 'STOP_TASK': {
        await chrome.storage.local.remove('activeTask')
        chrome.alarms.clear('taskComplete')
        sendResponse({ type: 'TASK_STOPPED' })
        break
      }
      case 'START_UI_TIMER': {
        await chrome.storage.local.set({ activeUITimer: message.payload })
        chrome.alarms.create('uiTimerExpiry', {
          delayInMinutes: message.payload.totalSeconds / 60,
        })
        setProgressIcon()
        sendResponse({ type: 'UI_TIMER_STARTED' })
        break
      }
      case 'CANCEL_UI_TIMER': {
        await chrome.storage.local.remove('activeUITimer')
        chrome.alarms.clear('uiTimerExpiry')
        await clearAlertIcon()
        closeOffscreenIfOpen()
        sendResponse({ type: 'UI_TIMER_CANCELLED' })
        break
      }
case 'BUY_TREAT': {
        const state = await getState()
        if (state.coins < 10) {
          sendResponse({ type: 'BUY_TREAT_FAILED' })
          break
        }
        state.coins -= 10
        state.treats = (state.treats ?? 0) + 1
        await saveState(state)
        sendResponse({ type: 'BUY_TREAT_SUCCESS', payload: state })
        break
      }
      case 'USE_TREAT': {
        const state = await getState()
        if ((state.treats ?? 0) <= 0) {
          sendResponse({ type: 'USE_TREAT_FAILED' })
          break
        }
        state.treats -= 1
        state.pet.hunger = Math.min(100, state.pet.hunger + 10)
        await saveState(state)
        sendResponse({ type: 'USE_TREAT_SUCCESS', payload: state })
        break
      }
      case 'ADD_COINS': {
        const state = await getState()
        state.coins += message.payload.coins
        state.pet.xp += message.payload.xp ?? 0
        const moodReward = message.payload.mood ?? 0
        const moodPenalty = message.payload.moodPenalty ?? 0
        state.pet.mood = Math.max(0, Math.min(100, state.pet.mood + moodReward - moodPenalty))
        state.pet.lastActiveAt = Date.now()
        const xpNeeded = state.pet.level * 100
        if (state.pet.xp >= xpNeeded) {
          state.pet.xp -= xpNeeded
          state.pet.level += 1
        }
        await saveState(state)
        sendResponse({ type: 'COINS_ADDED', payload: state })
        break
      }
    }
  })()
  return true
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'hungerDecay') {
    const state = await getState()
    applyHungerDecay(state)
    await saveState(state)
    return
  }

  if (alarm.name === 'uiTimerExpiry') {
    const result = await chrome.storage.local.get('activeUITimer')
    if (!result.activeUITimer) return
    const title = result.activeUITimer.task?.title ?? 'Session'
    setAlertIcon()
    playChimeOffscreen()
    chrome.notifications.create('timerDone', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/assets/ui/yipyip_logo.png'),
      title: "Time's up!",
      message: `"${title}" is complete. Open DoPal to claim your reward.`,
      priority: 2,
    })
    return
  }

  if (alarm.name === 'taskComplete') {
    const [state, task] = await Promise.all([getState(), getActiveTask()])
    if (!task) return

    const minutes = task.durationMs / 60_000
    state.coins += Math.floor(minutes)
    state.pet.xp += Math.floor(minutes * 10)
    state.pet.mood = Math.min(100, state.pet.mood + Math.floor(minutes * 0.75))
    state.pet.lastActiveAt = Date.now()

    const xpNeeded = state.pet.level * 100
    if (state.pet.xp >= xpNeeded) {
      state.pet.xp -= xpNeeded
      state.pet.level += 1
    }

    chrome.alarms.clear('uiTimerExpiry')
    await Promise.all([
      saveState(state),
      chrome.storage.local.remove('activeTask'),
      chrome.storage.local.remove('activeUITimer'),
    ])
  }
})

if (chrome.notifications) {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId !== 'timerDone') return
    chrome.notifications.clear('timerDone')
    await clearAlertIcon()
    await chrome.sidePanel.setOptions({ path: 'index.html', enabled: true })
    chrome.storage.local.set({ panelEnabled: true })
    const [win] = await chrome.windows.getAll({ windowTypes: ['normal'] })
    if (win) chrome.sidePanel.open({ windowId: win.id })
  })
}
