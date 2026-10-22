import { useEffect, useRef, useState } from 'react'
import { FiCamera, FiCheck, FiDownload, FiMessageCircle, FiPlay, FiTrash2 } from 'react-icons/fi'
import coin from '../assets/ui/coin.png'
import PanelScreen from '../components/PanelScreen'
import TopicIcon from '../lessons/TopicIcon'
import { SCENARIOS, REVIEW_PROMPTS, getScenario, formatTime, MIN_REWARD_SECONDS, SESSION_REWARD } from './scenarios.js'
import { getSession, saveSession, deleteSession } from './sessionStore.js'
import { useRecording } from './useRecording.js'
import '../App.css'
import './Practice.css'

export default function PracticeRoom({ initialScenarioId, initialSessionId, onClose, coins }) {
  const [step, setStep] = useState('setup')
  const [scenarioId, setScenarioId] = useState(getScenario(initialScenarioId).id)
  const [goal, setGoal] = useState('')
  const [limit, setLimit] = useState(180)
  const [promptIndex, setPromptIndex] = useState(0)
  const [markers, setMarkers] = useState([])
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [createdAt, setCreatedAt] = useState(Date.now())
  const [loaded, setLoaded] = useState(null)
  const [loading, setLoading] = useState(!!initialSessionId)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reflection, setReflection] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [rewardClaimed, setRewardClaimed] = useState(false)
  const preview = useRef(null)
  const playback = useRef(null)
  const recording = useRecording(preview)
  const scenario = getScenario(scenarioId)
  const result = loaded ?? recording.recording
  const isReview = !!result
  const active = ['requesting', 'ready', 'recording', 'stopping'].includes(recording.status)
  const pending = recording.status === 'requesting' || recording.status === 'stopping'

  useEffect(() => {
    let cancelled = false
    async function load() {
      const id = initialSessionId
      if (!id) return
      try {
        const session = await getSession(id)
        if (!session?.blob) throw new Error('This recording is no longer available. It may have been deleted or replaced by a newer session.')
        if (cancelled) return
        setLoaded(session)
        setScenarioId(session.scenarioId)
        setGoal(session.goal)
        setReflection(session.reflection)
        setMarkers(session.markers)
        setSessionId(session.id)
        setCreatedAt(session.createdAt)
        setSaved(true)
        const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' })
        if (!cancelled) setRewardClaimed((state.payload?.rewardedSessionIds ?? []).includes(session.id))
      } catch (err) { if (!cancelled) setError(err.message) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!result?.blob) { setPlaybackUrl(''); return }
    const url = URL.createObjectURL(result.blob)
    setPlaybackUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result?.blob])
  useEffect(() => {
    function warn(event) {
      if (recording.status === 'recording' || (isReview && !saved)) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [recording.status, isReview, saved])

  function start() {
    setPromptIndex(0)
    setMarkers([{ seconds: 0, promptIndex: 0 }])
    setCreatedAt(Date.now())
    recording.start(limit)
  }
  function nextPrompt() {
    if (promptIndex >= scenario.prompts.length - 1) return
    setPromptIndex(index => index + 1)
    setMarkers(old => [...old, { seconds: recording.elapsed, promptIndex: promptIndex + 1 }])
  }
  async function persist() {
    if (!result || busy) return
    setBusy(true)
    setError('')
    try {
      await saveSession({ id: sessionId, createdAt, scenarioId, goal, reflection, markers, duration: result.duration, blob: result.blob })
      setSaved(true)
      if (result.duration >= MIN_REWARD_SECONDS) {
        const response = await chrome.runtime.sendMessage({ type: 'COMPLETE_PRACTICE', payload: { sessionId } })
        if (response.error) throw new Error(`Recording saved. Reward could not be claimed: ${response.error} Try saving again.`)
        setRewardClaimed(true)
        setNotice(response.awarded ? `Practice complete! +${SESSION_REWARD.coins} coins · +${SESSION_REWARD.xp} XP.` : 'Saved. This session’s reward has already been collected.')
      } else setNotice('Saved. Record at least 10 seconds in your next session to earn a reward.')
    } catch (err) { setError(err.name === 'QuotaExceededError' ? 'Device storage is full. Download this recording, then delete an older session and try saving again.' : err.message) }
    finally { setBusy(false) }
  }
  function retry() {
    recording.reset()
    setLoaded(null)
    setSaved(false)
    setRewardClaimed(false)
    setReflection('')
    setNotice('')
    setError('')
    setPromptIndex(0)
    setMarkers([])
    setStep('record')
    setConfirmLeave(false)
    setConfirmDiscard(false)
    setSessionId(crypto.randomUUID())
    setCreatedAt(Date.now())
  }
  async function remove() {
    setBusy(true)
    try {
      await deleteSession(sessionId)
      retry()
      setConfirmDelete(false)
      setNotice('Recording and notes deleted from this device. Earned rewards are kept.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  function seek(seconds) {
    if (playback.current) { playback.current.currentTime = seconds; playback.current.play().catch(() => {}) }
  }

  function back() {
    if (busy || recording.status === 'stopping') return
    if (recording.status === 'recording') { recording.stop(); return }
    if (isReview && !saved) { setConfirmLeave(true); return }
    if (!isReview && step === 'record') {
      recording.reset()
      setStep('setup')
      return
    }
    onClose()
  }

  return <PanelScreen
    title={isReview ? 'Review' : 'Practice'}
    coins={coins}
    onBack={back}
    backDisabled={busy || recording.status === 'stopping'}
    animateBack={false}
    className="practice-room"
    label="Conversation practice"
  >
      {confirmLeave && <div className="delete-confirm" role="alert">
        <p>Leave without saving your changes?</p>
        <button className="practice-secondary" onClick={() => setConfirmLeave(false)}>Stay</button>
        <button className="practice-primary" onClick={onClose}>Leave</button>
      </div>}
      {loading ? <p role="status">Loading recording…</p> : <>
        {!isReview && step === 'setup' && <section className="panel-card room-card scenario-picker">
          <h3 className="section-label">Conversation</h3>
          <div className="scenario-list">
            {SCENARIOS.map(item => <button className={`scenario-option ${scenarioId === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setScenarioId(item.id)} aria-pressed={scenarioId === item.id}>
              <span className="scenario-icon"><TopicIcon topicId={item.id} /></span><strong>{item.title}</strong>{scenarioId === item.id && <FiCheck />}
            </button>)}
          </div>
          <label className="field-label" htmlFor="practice-goal">Goal <span>(optional)</span></label>
          <input id="practice-goal" className="practice-input" value={goal} onChange={event => setGoal(event.target.value)} maxLength={200} placeholder="e.g. Ask a follow-up question" />
          <fieldset className="length-field">
            <legend>Length</legend>
            <div className="length-options">{[60, 180, 300].map(seconds => <button key={seconds} className={limit === seconds ? 'selected' : ''} aria-pressed={limit === seconds} onClick={() => setLimit(seconds)}>{seconds / 60} min</button>)}</div>
          </fieldset>
          <button className="practice-primary full-width" onClick={() => setStep('record')}>Continue</button>
        </section>}
        {!isReview && step === 'record' && <section className="panel-card room-card recording-card">
          <div className="card-heading"><h3>{scenario.title}</h3><span className={`recording-time ${recording.status === 'recording' ? 'is-recording' : ''}`}>{formatTime(recording.elapsed)} / {formatTime(limit)}</span></div>
          <div className={`camera-preview ${recording.status === 'recording' ? 'recording' : ''}`}>
            <video ref={preview} autoPlay muted playsInline aria-label="Live camera preview" />
            {!active && <div className="camera-placeholder"><FiCamera /><p>Camera preview</p></div>}
            {recording.status === 'requesting' && <div className="camera-placeholder"><p role="status">Waiting for camera & microphone access…</p></div>}
            {recording.status === 'recording' && <span className="recording-badge">● Recording</span>}
          </div>
          <div className="partner-prompt">
            <span className="prompt-label"><FiMessageCircle /> {scenario.partner}<span className="demo-tag">Scripted</span></span>
            <p>{scenario.prompts[promptIndex]}</p>
            <small>{promptIndex + 1} / {scenario.prompts.length}</small>
          </div>
          <div className="recording-controls">
            {recording.status === 'idle' && <button className="practice-primary" onClick={recording.prepare}><FiCamera /> Enable camera & mic</button>}
            {recording.status === 'ready' && <button className="practice-primary" onClick={start}>● Start recording</button>}
            {recording.status === 'recording' && <>
              <button className="practice-secondary" onClick={nextPrompt} disabled={promptIndex === scenario.prompts.length - 1}>Next prompt →</button>
              <button className="practice-primary stop-button" onClick={recording.stop}>■ Finish</button>
            </>}
            {pending && <button className="practice-primary" disabled>{recording.status === 'stopping' ? 'Preparing recording…' : 'Waiting for permission…'}</button>}
            {['ready', 'requesting'].includes(recording.status) && <button className="text-button" onClick={recording.reset}>{recording.status === 'ready' ? 'Camera off' : 'Cancel'}</button>}
          </div>
          <p className="privacy-caption">Video stays on this device. Closing the sidebar ends the session.</p>
        </section>}
        {isReview && <>
          <section className="panel-card room-card">
            <div className="card-heading"><h3>{scenario.title}</h3><span className="duration-pill">{formatTime(result.duration)}</span></div>
            <video className="playback-video" ref={playback} src={playbackUrl} controls playsInline aria-label="Practice recording playback" />
            {goal && <p className="review-goal">Goal: {goal}</p>}
            <div className="moment-list">{markers.map((marker, index) => <button key={index} onClick={() => seek(marker.seconds)}><span>{formatTime(marker.seconds)}</span><p>{scenario.prompts[marker.promptIndex]}</p><FiPlay /></button>)}</div>
            <div className="review-actions">
              <a className="practice-secondary" href={playbackUrl} download={`yipyip-${scenarioId}-${sessionId.slice(0, 8)}.webm`}><FiDownload /> Download</a>
              {saved && <button className="text-button delete-button" disabled={busy} onClick={() => setConfirmDelete(true)}><FiTrash2 /> Delete</button>}
            </div>
            {confirmDelete && <div className="delete-confirm" role="alert"><p>Delete this recording and its notes?</p><button className="practice-secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button><button className="practice-primary" disabled={busy} onClick={remove}>Delete</button></div>}
          </section>
          <section className="panel-card room-card">
            <h3 className="section-label">Self-review</h3>
            <span className="demo-tag">AI feedback not connected</span>
            <details className="review-checklist"><summary>Review checklist</summary><div className="review-prompts">{REVIEW_PROMPTS.map(item => <section key={item.id}><h4>{item.title}</h4><p>{item.question}</p></section>)}</div></details>
            <label className="field-label" htmlFor="reflection">What will you try next?</label>
            <textarea id="reflection" className="practice-input reflection-input" maxLength={2000} value={reflection} onChange={event => { setReflection(event.target.value); setSaved(false) }} placeholder="Add a note…" />
            <div className="practice-reward"><img src={coin} alt="" /><strong>{rewardClaimed ? 'Reward collected' : result.duration >= MIN_REWARD_SECONDS ? `+${SESSION_REWARD.coins} coins · +${SESSION_REWARD.xp} XP` : 'Record 10+ seconds to earn rewards'}</strong></div>
            <div className="review-actions">
              <button className="practice-primary" disabled={busy || (saved && (rewardClaimed || result.duration < MIN_REWARD_SECONDS))} onClick={persist}>{busy ? 'Saving…' : saved && (rewardClaimed || result.duration < MIN_REWARD_SECONDS) ? 'Saved ✓' : saved ? 'Collect reward' : 'Save'}</button>
              <button className="practice-secondary" disabled={busy} onClick={() => saved ? retry() : setConfirmDiscard(true)}>Try again</button>
            </div>
            {confirmDiscard && <div className="delete-confirm" role="alert"><p>Discard your unsaved changes?</p><button className="practice-secondary" onClick={() => setConfirmDiscard(false)}>Keep reviewing</button><button className="practice-primary" onClick={retry}>Discard</button></div>}
          </section>
        </>}
      </>}
      {(error || recording.error) && <div className="room-alert" role="alert">{error || recording.error}</div>}
      {notice && <div className="room-notice" role="status">{notice}</div>}
  </PanelScreen>
}
