import { useEffect, useRef, useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import './App.css'
import './practice/Practice.css'
import Settings from './Settings'
import Shop from './Shop'
import PracticeRoom from './practice/PracticeRoom'
import Onboarding from './lessons/Onboarding'
import Welcome from './lessons/Welcome'
import LessonFeed from './lessons/LessonFeed'
import ChatLesson from './lessons/ChatLesson'
import HistoryScreen from './lessons/HistoryScreen'
import { recommendedLesson } from './lessons/catalog.js'
import { listCompletions } from './lessons/lessonStore.js'
import TopicIcon from './lessons/TopicIcon'
import './lessons/Lessons.css'
import joyous from './assets/pet/joyous.png'
import happy from './assets/pet/happy.png'
import neutral from './assets/pet/neutral.png'
import sad from './assets/pet/sad.png'
import angry from './assets/pet/angry.png'
import upset from './assets/pet/upset.png'
import coinImg from './assets/ui/coin.png'
import treatImg from './assets/ui/treat.png'
import emptyBowl from './assets/ui/empty_bowl.png'
import fewBowl from './assets/ui/few_bowl.png'
import fullBowl from './assets/ui/full_bowl.png'
import phoneImg from './assets/ui/phone_test.png'
import { listSessions } from './practice/sessionStore.js'

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

export default function App() {
  const [userState, setUserState] = useState(null)
  const [sessions, setSessions] = useState([])
  const [screen, setScreen] = useState('home')
  const [practiceTarget, setPracticeTarget] = useState({})
  const [completions, setCompletions] = useState([])
  const [lessonTarget, setLessonTarget] = useState({})
  const [lessonKey, setLessonKey] = useState(0)
  const [settingsReturn, setSettingsReturn] = useState('home')
  const [surveyReturn, setSurveyReturn] = useState('settings')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const petRef = useRef(null)

  async function refresh() {
    try {
      const [response, history, completed] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_STATE' }), listSessions(), listCompletions(),
      ])
      if (response.error) throw new Error(response.error)
      setUserState(response.payload)
      setSessions(history)
      setCompletions(completed)
      if (!response.payload.learningProfile) setScreen(current => ['welcome', 'onboarding'].includes(current) ? current : 'welcome')
      setError('')
    } catch (err) { setError(`Could not load YipYip. ${err.message}`) }
  }
  useEffect(() => {
    refresh()
    function onChange(changes) {
      if (changes.userState?.newValue) {
        setUserState(changes.userState.newValue)
        listSessions().then(setSessions).catch(err => setError(err.message))
        listCompletions().then(setCompletions).catch(err => setError(err.message))
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    window.addEventListener('focus', refresh)
    return () => {
      chrome.storage.onChanged.removeListener(onChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  async function feed() {
    if (busy) return
    setBusy(true)
    try {
      const result = await chrome.runtime.sendMessage({ type: 'USE_TREAT' })
      if (result.error) setNotice(result.error)
      else { setUserState(result.payload); setNotice(`${result.payload.pet.name} enjoyed that treat!`) }
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!dragging) return
    const move = event => setCursor({ x: event.clientX, y: event.clientY })
    const up = event => {
      setDragging(false)
      const box = petRef.current?.getBoundingClientRect()
      if (box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) feed()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging])
  function openPractice() { setScreen('practice') }
  function openRecording(sessionId) { setPracticeTarget({ sessionId }); setScreen('recording') }
  function closeRecording() { setScreen('history'); refresh() }
  function openLesson(lessonId, attemptId, fresh = false) {
    setLessonTarget({ lessonId, attemptId, fresh }); setLessonKey(key => key + 1); setScreen('lesson')
  }
  function openSettings(from = 'home') { setSettingsReturn(from); setScreen('settings') }
  function openSurvey(from) { setSurveyReturn(from); setScreen('survey') }


  if (!userState) return <div className="loading" role="status">{error || 'Waking up Pal…'}{error && <button onClick={refresh}>Try again</button>}</div>
  const { pet, coins, treats = 0 } = userState
  const nextLesson = recommendedLesson(userState.learningProfile, completions)
  return <div className="phone-container">
    <img src={phoneImg} className="phone-frame-img" alt="" aria-hidden="true" />
    <div className="phone-screen">
      <main className="app" style={{ visibility: screen === 'home' ? 'visible' : 'hidden' }} aria-hidden={screen !== 'home'}>
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
              <button className="nav-btn" title="History" onClick={() => setScreen('history')}>
                <FiCalendar />
                <span className="nav-label">History</span>
              </button>
              <button className="nav-btn" title="Shop" onClick={() => setScreen('shop')}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" clipRule="evenodd" />
                </svg>
                <span className="nav-label">Shop</span>
              </button>
              <button className="nav-btn" title="Practice" onClick={() => openPractice()}>
                <TopicIcon topicId="everyday" />
                <span className="nav-label">Practice</span>
              </button>
              <button className="nav-btn" title="Settings" onClick={() => openSettings()}>
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
          <div className="pet-card"><div className="stats-inner">
            <StatRow iconEl={<StarIcon />} iconClass="icon-xp" label="XP" subtitle={getXPMessage(pet.xp, pet.level * 100)} value={pet.xp} max={pet.level * 100} barClass="xp" />
            <StatRow iconEl={<UtensilsIcon />} iconClass="icon-hunger" label="Hunger" subtitle={getHungerMessage(pet.hunger)} value={Math.ceil(pet.hunger)} max={100} barClass="hunger" />
            <StatRow iconEl={<SmileyIcon />} iconClass="icon-mood" label="Mood" subtitle={getMoodMessage(pet.mood)} value={Math.ceil(pet.mood)} max={100} barClass="mood" />
          </div></div>
          <div className="recommended-slot">
            <button className="recommended-lesson" data-topic={nextLesson.topicId} onClick={() => openLesson(nextLesson.id)}>
              <span>Next recommended lesson</span><strong>{nextLesson.title}</strong><span className="recommended-topic-icon topic-icon-badge"><TopicIcon topicId={nextLesson.topicId} /></span>
            </button>
          </div>
          <div style={{ position: 'relative', height: 0 }}>
            {notice && <p className="feed-notif feed-notif-in" role="status">{notice}</p>}
            {error && <p className="feed-notif feed-notif-in" role="alert">{error}</p>}
          </div>
          <div className="pet-sprite-wrapper">
            <button
              className="treat-group"
              disabled={!treats || busy}
              onClick={feed}
              onPointerDown={event => {
                if (treats) {
                  event.preventDefault()
                  setDragging(true)
                  setCursor({ x: event.clientX, y: event.clientY })
                }
              }}
              style={{ cursor: treats > 0 ? 'grab' : 'default' }}
              aria-label={`Feed ${pet.name}. ${treats} treats available`}
            >
              <img className="treat-bowl" src={getTreatBowl(treats)} alt="" />
              <div className="treat-label" style={{ fontSize: treatFontSize(treats) }}>
                <img src={treatImg} alt="" className="treat-icon" />
                <span>{formatNum(treats)}</span>
              </div>
            </button>
            <img
              ref={petRef}
              className={`pet-sprite ${getRockClass(pet.mood)} ${pet.mood <= 17 ? 'pet-upset' : ''}`.trim()}
              src={getMoodImage(pet.mood)}
              alt={pet.name}
            />
          </div>
      </main>
      {screen === 'welcome' && <Welcome onStart={() => setScreen('onboarding')} />}
      {['onboarding', 'survey'].includes(screen) && <Onboarding profile={userState.learningProfile} coins={coins} onBack={() => setScreen(screen === 'survey' ? surveyReturn : 'welcome')} onDone={state => { setUserState(state); setScreen('practice') }} />}
      {screen === 'practice' && <LessonFeed profile={userState.learningProfile} completions={completions} coins={coins} onBack={() => setScreen('home')} onLesson={openLesson} onPreferences={() => openSurvey('practice')} />}
      {screen === 'lesson' && <ChatLesson key={lessonKey} {...lessonTarget} profile={userState.learningProfile} coins={coins} onBack={() => { setScreen(lessonTarget.attemptId ? 'history' : 'practice'); refresh() }} onHome={() => { setScreen('home'); refresh() }} onProgress={refresh} onRestart={id => openLesson(id, undefined, true)} />}
      {screen === 'recording' && <PracticeRoom coins={coins} initialSessionId={practiceTarget.sessionId} onClose={closeRecording} />}
      {screen === 'history' && <HistoryScreen coins={coins} completions={completions} legacySessions={sessions} onBack={() => setScreen('home')} onAttempt={id => openLesson(null, id)} onRecording={openRecording} />}
      {screen === 'settings' && <Settings userState={userState} onClose={() => setScreen(settingsReturn)} onPreferences={() => openSurvey('settings')} onApply={state => { setUserState(state); setScreen(settingsReturn) }} />}
      {screen === 'shop' && <Shop userState={userState} onClose={() => setScreen('home')} onUpdate={setUserState} />}
    </div>
    {dragging && <img className="dragged-treat" src={treatImg} alt="" style={{ left: cursor.x - 15, top: cursor.y - 15 }} />}
  </div>
}
