import { useEffect, useState, useRef, useCallback } from 'react'
import './App.css'
import Tasks from './Tasks'
import TimerScreen from './TimerScreen'
import CameraCheckScreen from './CameraCheckScreen'
import Settings from './Settings'
import Shop from './Shop'
import joyous    from './assets/pet/joyous.png'
import happy     from './assets/pet/happy.png'
import neutral   from './assets/pet/neutral.png'
import sad       from './assets/pet/sad.png'
import angry     from './assets/pet/angry.png'
import upset     from './assets/pet/upset.png'
import coinImg      from './assets/ui/coin.png'
import treatImg     from './assets/ui/treat.png'
import emptyBowl   from './assets/ui/empty_bowl.png'
import fewBowl     from './assets/ui/few_bowl.png'
import fullBowl    from './assets/ui/full_bowl.png'
import phoneImg     from './assets/ui/phone_test.png'

const MOOD_IMAGES = [
  { threshold: 83, src: joyous  },
  { threshold: 67, src: happy   },
  { threshold: 50, src: neutral },
  { threshold: 33, src: sad     },
  { threshold: 17, src: angry   },
  { threshold:  0, src: upset   },
]

function getMoodImage(mood) {
  return (MOOD_IMAGES.find(m => mood > m.threshold) ?? MOOD_IMAGES.at(-1)).src
}

function getTreatBowl(treats) {
  if (treats === 0) return emptyBowl
  if (treats <= 5) return fewBowl
  return fullBowl
}

function getRockClass(mood) {
  if (mood > 67) return 'rock-full'
  if (mood > 50) return 'rock-high'
  if (mood > 33) return 'rock-medium'
  if (mood > 17) return 'rock-low'
  return ''
}


function getXPMessage(xp, max) {
  const pct = (xp / max) * 100
  if (pct >= 75) return 'Almost there!'
  if (pct >= 50) return 'Keep doing great!'
  if (pct >= 25) return 'Good start!'
  return 'Time to get going!'
}

function getHungerMessage(hunger) {
  if (hunger >= 75) return 'Well fed!'
  if (hunger >= 50) return 'A little hungry'
  if (hunger >= 25) return 'Pretty hungry...'
  return 'Starving!'
}

function getMoodMessage(mood) {
  if (mood >= 75) return 'Very happy!'
  if (mood >= 50) return 'Feeling okay'
  if (mood >= 25) return 'A bit down...'
  return 'Really unhappy...'
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  )
}

function UtensilsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
    </svg>
  )
}

function SmileyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
    </svg>
  )
}

function StatRow({ iconEl, iconClass, label, subtitle, value, max, barClass }) {
  return (
    <div className="stat-row">
      <div className={`stat-icon-circle ${iconClass}`}>{iconEl}</div>
      <div className="stat-body">
        <div className="stat-top">
          <div className="stat-text">
            <span className="stat-name">{label}</span>
            <span className="stat-subtitle">{subtitle}</span>
          </div>
          <span className="stat-value">{value} / {max}</span>
        </div>
        <div className="bar-track">
          <div className={`bar-fill ${barClass}`} style={{ width: `${(value / max) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function StatBar({ label, value, max, className }) {
  return (
    <div className="stat-bar">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="bar-track">
        <div className={`bar-fill ${className}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}

const DURATIONS = [
  { label: '25m', ms: 25 * 60 * 1000 },
  { label: '45m', ms: 45 * 60 * 1000 },
  { label: '60m', ms: 60 * 60 * 1000 },
]

function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg)
}

function formatNum(n) {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`
  return String(n)
}

function treatFontSize(coins) {
  const len = formatNum(coins).length
  if (len >= 5) return '10px'
  if (len >= 4) return '11.5px'
  return '13px'
}

function levelFontSize(level) {
  const len = `Lvl ${formatNum(level)}`.length
  if (len >= 9) return '7px'
  if (len >= 8) return '7.5px'
  return '9px'
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function App() {
  const [userState, setUserState] = useState(null)
  const [activeTask, setActiveTask] = useState(null)
  const [taskLabel, setTaskLabel] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0])
  const [remaining, setRemaining] = useState(null)
  const [showSession, setShowSession] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [draggingTreat, setDraggingTreat] = useState(false)
  const [treatCursorPos, setTreatCursorPos] = useState({ x: 0, y: 0 })
  const [timerTask, setTimerTask] = useState(null)
  const [timerStartedAt, setTimerStartedAt] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [cameraCheckPassed, setCameraCheckPassed] = useState(false)
  const [completionData, setCompletionData] = useState(null)
  const [feedNotif, setFeedNotif] = useState(null)
  const [feedNotifFading, setFeedNotifFading] = useState(false)
  const [feedNotifKey, setFeedNotifKey] = useState(0)
  const feedNotifTimers = useRef([])
  const timerRef = useRef(null)
  const petSpriteRef = useRef(null)

  useEffect(() => {
    async function init() {
      try {
        const [stateRes, taskRes] = await Promise.all([
          sendMessage({ type: 'GET_STATE' }),
          sendMessage({ type: 'GET_ACTIVE_TASK' }),
        ])
        setUserState(stateRes.payload)
        setActiveTask(taskRes.payload)
      } catch {
        setTimeout(init, 500)
      }
    }
    init()

    chrome.storage.local.get('activeUITimer', ({ activeUITimer }) => {
      if (!activeUITimer) return
      setTimerTask(activeUITimer.task)
      setTimerStartedAt(activeUITimer.startedAt)
    })

    function onStorageChange(changes) {
      if ('userState' in changes) setUserState(changes.userState.newValue)
    }
    chrome.storage.onChanged.addListener(onStorageChange)
    return () => chrome.storage.onChanged.removeListener(onStorageChange)
  }, [])

  useEffect(() => {
    if (!activeTask) {
      clearInterval(timerRef.current)
      setRemaining(null)
      return
    }
    const tick = () => {
      const end = activeTask.startedAt + activeTask.durationMs
      setRemaining(end - Date.now())
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [activeTask])

  async function handleStart() {
    const label = taskLabel.trim() || 'Study session'
    const { ms: durationMs } = selectedDuration
    await sendMessage({ type: 'START_TASK', payload: { label, durationMs } })
    setActiveTask({ label, startedAt: Date.now(), durationMs })
  }

  async function handleCancel() {
    await sendMessage({ type: 'STOP_TASK' })
    setActiveTask(null)
  }

  function taskTotalSeconds(task) {
    if (task.type === 'task') {
      const [h, m, s] = (task.timeAllotted ?? '00:00:00').split(':').map(Number)
      return h * 3600 + m * 60 + s
    }
    if (task.breaks) return (task.studyInterval ?? 0) * (task.numIntervals ?? 0) * 60
    return (task.duration ?? 0) * 60
  }

  function handleBeginTask(task, fm = false) {
    setShowTasks(false)
    setFocusMode(fm)
    setCameraCheckPassed(false)
    setTimerTask(task)

    if (!fm) {
      // Non-focus mode: start timer immediately
      const startedAt = Date.now()
      setTimerStartedAt(startedAt)
      chrome.runtime.sendMessage({
        type: 'START_UI_TIMER',
        payload: { task, startedAt, totalSeconds: taskTotalSeconds(task) },
      })
    }
    // Focus mode: timer starts only after camera check passes
  }

  function handleCameraCheckStart() {
    const startedAt = Date.now()
    setTimerStartedAt(startedAt)
    setCameraCheckPassed(true)
    chrome.runtime.sendMessage({
      type: 'START_UI_TIMER',
      payload: { task: timerTask, startedAt, totalSeconds: taskTotalSeconds(timerTask) },
    })
  }

  async function handleMinimize() {
    await chrome.sidePanel.setOptions({ enabled: false })
  }

  async function handleTaskFinish({ elapsedSeconds, moodPenalty = 0 }) {
    const fm = focusMode
    const rawMinutes = elapsedSeconds / 60
    const coins = Math.floor(rawMinutes) * (fm ? 2 : 1)
    const xp = Math.floor(rawMinutes * 10) * (fm ? 2 : 1)
    const moodReward = Math.floor(rawMinutes * 0.75)

    setTimerTask(null)
    setTimerStartedAt(null)
    setFocusMode(false)
    setCameraCheckPassed(false)
    chrome.runtime.sendMessage({ type: 'CANCEL_UI_TIMER' })
    const res = await chrome.runtime.sendMessage({
      type: 'ADD_COINS',
      payload: { coins, xp, mood: moodReward, moodPenalty },
    })
    setUserState(res.payload)
    setCompletionData({ coins, xp, moodReward, moodPenalty, focusMode: fm })
  }

  async function handleFeedPet() {
    if (Math.ceil(userState.pet.hunger) >= 100) {
      feedNotifTimers.current.forEach(clearTimeout)
      setFeedNotifFading(false)
      setFeedNotif(`${userState.pet.name}'s hunger already satisfied!`)
      setFeedNotifKey(k => k + 1)
      feedNotifTimers.current = [
        setTimeout(() => setFeedNotifFading(true), 2700),
        setTimeout(() => setFeedNotif(null), 3000),
      ]
      return
    }
    const res = await chrome.runtime.sendMessage({ type: 'USE_TREAT' })
    if (res.type === 'USE_TREAT_SUCCESS') setUserState(res.payload)
  }

  function handleTreatDragStart(e) {
    if ((userState.treats ?? 0) <= 0) return
    e.preventDefault()
    setDraggingTreat(true)
    setTreatCursorPos({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    if (!draggingTreat) return
    function onMove(e) {
      setTreatCursorPos({ x: e.clientX, y: e.clientY })
    }
    function onUp(e) {
      setDraggingTreat(false)
      const petEl = petSpriteRef.current
      if (petEl) {
        const rect = petEl.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top  && e.clientY <= rect.bottom) {
          handleFeedPet()
        }
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [draggingTreat])

  useEffect(() => {
    document.body.style.cursor = draggingTreat ? 'grabbing' : ''
    return () => { document.body.style.cursor = '' }
  }, [draggingTreat])

  if (!userState) return <div className="loading">Loading...</div>

  const { pet, coins, treats = 0 } = userState
  const xpMax = pet.level * 100

  return (
    <div className="phone-container">
      <img src={phoneImg} className="phone-frame-img" alt="" aria-hidden="true" />
      <div className="phone-screen">
        <div className="app">
          <header className="header">
            <div className="pet-pill">
              <div className={`pet-pill-avatar ${pet.mood <= 17 ? 'upset' : ''}`}>
                <img src={getMoodImage(pet.mood)} alt={pet.name} />
              </div>
              <div className="pet-pill-info">
                <span className="pet-pill-name">{pet.name}</span>
                <span className="pet-pill-level" style={{ fontSize: levelFontSize(pet.level) }}>Lvl {formatNum(pet.level)}</span>
              </div>
            </div>
            <div className="nav-right">
              <button className="nav-btn" title="Style">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M20.599 1.5c-.376 0-.743.111-1.055.32l-5.08 3.385a18.747 18.747 0 0 0-3.471 2.987 10.04 10.04 0 0 1 4.815 4.815 18.748 18.748 0 0 0 2.987-3.472l3.386-5.079A1.902 1.902 0 0 0 20.599 1.5Zm-8.3 14.025a18.76 18.76 0 0 0 1.896-1.207 8.026 8.026 0 0 0-4.513-4.513A18.75 18.75 0 0 0 8.475 11.7l-.278.5a5.26 5.26 0 0 1 3.601 3.602l.502-.278ZM6.75 13.5A3.75 3.75 0 0 0 3 17.25a1.5 1.5 0 0 1-1.601 1.497.75.75 0 0 0-.7 1.123 5.25 5.25 0 0 0 9.8-2.62 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd" />
                </svg>
                <span className="nav-label">Style</span>
              </button>
              <button className="nav-btn" title="Shop" onClick={() => setShowShop(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" clipRule="evenodd" />
                </svg>
                <span className="nav-label">Shop</span>
              </button>
              <button className="nav-btn" title="To-Dos" onClick={() => setShowTasks(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M10.5 3A1.501 1.501 0 0 0 9 4.5h6A1.5 1.5 0 0 0 13.5 3h-3Zm-2.693.178A3 3 0 0 1 10.5 1.5h3a3 3 0 0 1 2.694 1.678c.497.042.992.092 1.486.15 1.497.173 2.57 1.46 2.57 2.929V19.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3V6.257c0-1.47 1.073-2.756 2.57-2.93.493-.057.989-.107 1.487-.15Z" clipRule="evenodd" />
                </svg>
                <span className="nav-label">To-Dos</span>
              </button>
              <button className="nav-btn" title="Settings" onClick={() => setShowSettings(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 6.75a5.25 5.25 0 0 1 6.775-5.025.75.75 0 0 1 .313 1.248l-3.32 3.319c.063.475.276.934.641 1.299.365.365.824.578 1.3.64l3.318-3.319a.75.75 0 0 1 1.248.313 5.25 5.25 0 0 1-5.472 6.756c-1.018-.086-1.87.1-2.309.634L7.344 21.3A3.298 3.298 0 1 1 2.7 16.657l8.684-7.151c.533-.44.72-1.291.634-2.309A5.342 5.342 0 0 1 12 6.75ZM4.117 19.125a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008Z" clipRule="evenodd" />
                  <path d="m10.076 8.64-2.201-2.2V4.874a.75.75 0 0 0-.364-.643l-3.75-2.25a.75.75 0 0 0-.916.113l-.75.75a.75.75 0 0 0-.113.916l2.25 3.75a.75.75 0 0 0 .643.364h1.564l2.062 2.062 1.575-1.297Z" />
                  <path fillRule="evenodd" d="m12.556 17.329 4.183 4.182a3.375 3.375 0 0 0 4.773-4.773l-3.306-3.305a6.803 6.803 0 0 1-1.53.043c-.394-.034-.682-.006-.867.042a.589.589 0 0 0-.167.063l-3.086 3.748Zm3.414-1.36a.75.75 0 0 1 1.06 0l1.875 1.876a.75.75 0 1 1-1.06 1.06L15.97 17.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
                <span className="nav-label">Settings</span>
              </button>
              <span className="coins"><img className="coin-icon" src={coinImg} alt="coins" />{formatNum(coins)}</span>
            </div>
          </header>

          <div className="pet-card">
            <div className="stats-inner">
              <StatRow
                iconEl={<StarIcon />}
                iconClass="icon-xp"
                label="XP"
                subtitle={getXPMessage(pet.xp, xpMax)}
                value={pet.xp}
                max={xpMax}
                barClass="xp"
              />
              <StatRow
                iconEl={<UtensilsIcon />}
                iconClass="icon-hunger"
                label="Hunger"
                subtitle={getHungerMessage(pet.hunger)}
                value={Math.ceil(pet.hunger)}
                max={100}
                barClass="hunger"
              />
              <StatRow
                iconEl={<SmileyIcon />}
                iconClass="icon-mood"
                label="Mood"
                subtitle={getMoodMessage(pet.mood)}
                value={Math.ceil(pet.mood)}
                max={100}
                barClass="mood"
              />
            </div>
          </div>

          <div style={{ position: 'relative', height: 0 }}>
            {feedNotif && (
              <div key={feedNotifKey} className={`feed-notif ${feedNotifFading ? 'feed-notif-out' : 'feed-notif-in'}`}>
                {feedNotif}
              </div>
            )}
          </div>

          <div className="pet-sprite-wrapper">
            <div
              className="treat-group"
              onMouseDown={handleTreatDragStart}
              style={{ cursor: treats > 0 ? 'grab' : 'default' }}
            >
              <img className="treat-bowl" src={getTreatBowl(treats)} alt="treat bowl" />
              <div className="treat-label" style={{ fontSize: treatFontSize(treats) }}>
                <img src={treatImg} alt="treat" className="treat-icon" />
                <span>{formatNum(treats)}</span>
              </div>
            </div>
            <img
              ref={petSpriteRef}
              className={`pet-sprite ${getRockClass(pet.mood)} ${pet.mood <= 17 ? 'pet-upset' : ''}`.trim()}
              src={getMoodImage(pet.mood)}
              alt="pet"
            />
          </div>

        </div>

        {showTasks && (
          <Tasks onClose={() => setShowTasks(false)} onBeginTask={handleBeginTask} />
        )}

        {showSettings && (
          <Settings
            userState={userState}
            onClose={() => setShowSettings(false)}
            onApply={(newState) => { setUserState(newState); setShowSettings(false) }}
          />
        )}

        {showShop && (
          <Shop
            userState={userState}
            onClose={() => setShowShop(false)}
            onUpdate={(newState) => { setUserState(newState) }}
          />
        )}

        {timerTask && focusMode && !cameraCheckPassed && (
          <CameraCheckScreen
            onStart={handleCameraCheckStart}
            onBack={() => {
              setTimerTask(null)
              setTimerStartedAt(null)
              setFocusMode(false)
            }}
          />
        )}

        {timerTask && (!focusMode || cameraCheckPassed) && (
          <TimerScreen
            task={timerTask}
            onFinish={handleTaskFinish}
            onMinimize={handleMinimize}
            startedAt={timerStartedAt}
            focusMode={focusMode}
          />
        )}

        {completionData && (
          <div className="completion-backdrop">
            <div className="completion-modal">
              <p className="completion-title">
                {completionData.focusMode ? 'Focus Mode Complete!' : 'Task Complete!'}
              </p>
              <div className="completion-rewards">
                <div className="completion-row">
                  <img src={coinImg} alt="coin" className="completion-coin-img" />
                  <span className="completion-earned">+{completionData.coins}</span>
                </div>
                <div className="completion-xp-row">
                  +{completionData.xp} XP
                </div>
                {completionData.moodPenalty > 0 && (
                  <div className="completion-penalty-row">
                    <span>Mood -{completionData.moodPenalty.toFixed(1)}</span>
                    <span className="completion-penalty-note">
                      ({Math.round(completionData.moodPenalty * 2)}s looking away)
                    </span>
                  </div>
                )}
              </div>
              <button className="completion-done-btn" onClick={() => setCompletionData(null)}>
                Done
              </button>
            </div>
          </div>
        )}

        {showSession && (
          <div className="session-overlay" onClick={() => setShowSession(false)}>
            <div className="task-card" onClick={e => e.stopPropagation()}>
              <h2>Session</h2>

              {activeTask ? (
                <div className="active-task">
                  <div className="active-task-label">{activeTask.label}</div>
                  <StatBar
                    label="Progress"
                    value={Math.max(0, activeTask.durationMs - (remaining ?? activeTask.durationMs))}
                    max={activeTask.durationMs}
                    className="xp"
                  />
                  <div className="countdown">{formatTime(remaining ?? 0)}</div>
                  <button className="cancel-btn" onClick={handleCancel}>Cancel task</button>
                </div>
              ) : (
                <>
                  <input
                    className="task-input"
                    placeholder="What are you working on?"
                    value={taskLabel}
                    onChange={e => setTaskLabel(e.target.value)}
                  />
                  <div className="duration-options">
                    {DURATIONS.map(d => (
                      <button
                        key={d.label}
                        className={`duration-btn ${selectedDuration.label === d.label ? 'active' : ''}`}
                        onClick={() => setSelectedDuration(d)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <button className="start-btn" onClick={handleStart}>
                    Start Session
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {draggingTreat && (
        <img
          src={treatImg}
          style={{
            position: 'fixed',
            left: treatCursorPos.x - 15,
            top: treatCursorPos.y - 15,
            width: 30,
            height: 30,
            objectFit: 'contain',
            transform: 'rotate(45deg)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          alt=""
        />
      )}
    </div>
  )
}
