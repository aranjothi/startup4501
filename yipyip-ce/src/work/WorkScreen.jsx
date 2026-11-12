import React, { useEffect, useRef, useState } from 'react'
import { FiCheckCircle, FiClock, FiEdit2, FiPlay, FiTrash2, FiStar } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import PetAppearance from '../pet/PetAppearance'
import coinImage from '../assets/ui/coin.png'
import { equippedCosmetics } from '../pet/cosmetics.js'
import TaskChecklist from './TaskChecklist'
import WorkLanding from './WorkLanding'
import WorkModal from './WorkModal'
import WorkModeOption from './WorkModeOption'
import WorkCamera from './WorkCamera'
import useWorkCamera from './useWorkCamera'
import { pickWorkQuestion, WORK_QUESTIONS } from './landing.js'
import { elapsedSeconds, validatePlan, PRESENCE_LEASE_MS } from './model.js'
import { sendWork, suggestTask } from './api.js'
import { workCompletion } from '../rewards/completion.js'
import './Work.css'

const noop = () => {}
function clock(seconds) {
  const total = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(total / 3600)
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(Math.floor(total % 3600 / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const coinText = coins => `${coins} ${coins === 1 ? 'coin' : 'coins'}`


export function WorkView({ userState, now = Date.now(), loading = false, busy = false, planning = false, description = '', draft = null, quickMinutes = 25, error = '', notice = '', confirmation = null, mode = 'home', question = WORK_QUESTIONS[0], workMode = false, onWorkMode = noop, camera, onStartVerified = noop, onOpenSuggest = noop, onOpenQuiet = noop, onBack = noop, onDescription = noop, onSuggest = noop, onCancelPlanning = noop, onManual = noop, onDraft = noop, onSave = noop, onCloseSetup = noop, onQuickMinutes = noop, onAction = noop, onEdit = noop, onAsk = noop, onCancelConfirm = noop }) {
  const { pet, coins, work = { tasks: [], active: null } } = userState
  const active = work.active
  const elapsed = elapsedSeconds(active, now)
  const expired = !!active && elapsed >= active.durationSeconds
  const progress = active ? Math.min(100, Math.max(0, Math.round(elapsed / active.durationSeconds * 100))) : 0
  const earned = Math.floor(elapsed / 60) * (active?.workMode ? 2 : 1)
  const cameraPaused = active?.workMode && (active.presenceAt == null || now - active.presenceAt > PRESENCE_LEASE_MS || active.runningSince === null) && !active.pausedByUser
  const openTasks = work.tasks.filter(task => !task.completedAt)
  const completedTasks = work.tasks.filter(task => task.completedAt)
  const activeTask = work.tasks.find(task => task.id === active?.taskId)
  const remainingSteps = activeTask?.steps.filter((_, index) => !activeTask.completedSteps?.includes(index)).length ?? 0
  const setupOpen = !loading && (!!draft || mode !== 'home')
  const setupTitle = mode === 'camera' ? 'Camera check' : draft ? (draft.id ? 'Edit your task' : mode === 'create' ? 'Create Task' : 'Review your task') : mode === 'suggest' ? 'Suggest Task' : 'No Task, Just Work'
  const setupOverlay = setupOpen ? <WorkModal title={setupTitle} busy={busy} onClose={onCloseSetup} onRequestClose={onCancelPlanning}>
    {(close, closing) => <>
      {error && <p className="work-error" role="alert">{error}</p>}
      <fieldset className="work-modal-fields" disabled={busy || closing}>
        {mode === 'camera' ? <div className="work-form">
          <WorkCamera camera={camera} />
          <button className="panel-action" disabled={busy || !camera?.present} onClick={async () => { if (await onStartVerified()) close() }}>Start session</button>
        </div> : draft ? <form className="panel-card work-form" onSubmit={async event => { if (await onSave(event, !draft.id)) close() }}>
          <label>Task title<input required maxLength={120} placeholder="What are you working on?" value={draft.title} onChange={event => onDraft({ title: event.target.value })} /></label>
          <label className="work-duration">Minutes<input required type="number" min="1" max="480" step="1" value={draft.minutes} onChange={event => onDraft({ minutes: event.target.value })} /></label>
          <WorkModeOption checked={draft.workMode === true} onChange={enabled => onDraft({ workMode: enabled })} disabled={busy} />
          <details className="work-extra">
            <summary>Details &amp; steps</summary>
            <label>Description<textarea maxLength={2000} rows={2} value={draft.description} onChange={event => onDraft({ description: event.target.value })} /></label>
            <label>Steps (one per line)<textarea rows={3} value={draft.stepsText ?? draft.steps.join('\n')} onChange={event => onDraft({ stepsText: event.target.value })} /></label>
          </details>
          <button className="panel-action" disabled={busy}>{draft.id ? 'Save changes' : 'Start session'}</button>
          {!draft.id && <button type="button" className="work-text-button" disabled={busy} onClick={async event => { if (await onSave(event, false)) close() }}>Save for later</button>}
        </form> : mode === 'suggest' ?
          <form className="panel-card work-form" onSubmit={onSuggest}>
            <label>Describe your task<textarea required maxLength={2000} rows={3} placeholder="I need to tidy my room…" value={description} onChange={event => onDescription(event.target.value)} disabled={planning} /></label>
            <WorkModeOption checked={workMode} onChange={onWorkMode} disabled={busy || planning} />
            <button className="panel-action" disabled={planning || busy || !description.trim()}>{planning ? 'Thinking…' : 'Suggest a task'}</button>
            {planning ? <button type="button" className="work-text-button" onClick={onCancelPlanning}>Cancel suggestion</button> : <button type="button" className="work-text-button" disabled={busy} onClick={onManual}>Create manually</button>}
            <details className="work-extra"><summary>About suggestions</summary><p>Your description is sent to our AI service for a suggestion.</p></details>
          </form> : mode === 'quiet' ?
          <form className="panel-card work-form work-quiet" onSubmit={async event => { event.preventDefault(); if (await onAction('START_WORK', { title: 'Quiet work', minutes: Number(quickMinutes), workMode })) close() }}>
            <label className="work-duration">Minutes<input required type="number" min="1" max="480" step="1" value={quickMinutes} onChange={event => onQuickMinutes(event.target.value)} /></label>
            <WorkModeOption checked={workMode} onChange={onWorkMode} disabled={busy} />
            <button className="panel-action" disabled={busy || planning}>Start quiet work</button>
          </form> : null}
      </fieldset>
    </>}
  </WorkModal> : null
  const confirmOverlay = active && confirmation ? <WorkModal title={confirmation === 'finish' ? 'All done?' : 'Stop for now?'} busy={busy} onClose={onCancelConfirm}>
    {(close, closing) => <div className="work-confirm" aria-label="Confirm session action">
      {error && <p className="work-error" role="alert">{error}</p>}
      <p>{confirmation === 'finish' ? `${coinText(earned)} + ${earned} XP` : 'This session won’t earn rewards.'}</p>
      {confirmation === 'finish' && remainingSteps > 0 && <p className="panel-description">{`${remainingSteps} ${remainingSteps === 1 ? 'step' : 'steps'} unchecked.`}</p>}
      <div className="work-actions">
        <button className="work-secondary" disabled={busy || closing} onClick={() => close()}>Keep working</button>
        <button className="panel-action" disabled={busy || closing} onClick={() => close(() => onAction(confirmation === 'finish' ? 'FINISH_WORK' : 'STOP_WORK'))}>{confirmation === 'finish' ? 'Finish & collect' : 'Stop without rewards'}</button>
      </div>
    </div>}
  </WorkModal> : null
  const overlay = confirmOverlay || setupOverlay
  return <PanelScreen title="Work" coins={coins} onBack={onBack} backDisabled={busy} className="work-screen" overlay={overlay}>
    {error && !overlay && <p className="work-error" role="alert">{error}</p>}
    {notice && <p className="work-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading your tasks…</p> : active ? <>
      <section className="panel-card work-focus" aria-label="Current session" data-phase={expired ? 'complete' : cameraPaused || active.runningSince === null ? 'paused' : 'running'}>
        <h3 tabIndex={-1}>{active.title}</h3>
        <span className="work-eyebrow" role="status">{expired ? 'Time’s up' : cameraPaused ? 'Paused — return to frame' : active.runningSince === null ? 'Paused' : 'Focusing'}</span>
        <div className={`work-session-scene ${active.workMode ? 'has-camera' : ''}`}>
          <div className="work-progress">
            <svg className="work-progress-ring" viewBox="0 0 200 200" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <circle className="work-progress-track" cx="100" cy="100" r="90" />
              <circle className="work-progress-fill" cx="100" cy="100" r="90" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress} />
            </svg>
            <div className="work-progress-center">
              <span className="work-pet-orbit"><PetAppearance className="work-pet" pet={pet} cosmetics={equippedCosmetics(userState)} /></span>
              <div className="work-clock" role="timer" aria-label="Time remaining">{clock(active.durationSeconds - elapsed)}</div>
            </div>
            <FiStar className="work-spark work-spark-gold" aria-hidden="true" />
            <FiStar className="work-spark work-spark-coral" aria-hidden="true" />
          </div>
          {active.workMode && mode !== 'camera' && <WorkCamera camera={camera} compact />}
        </div>
        <p className="work-earned"><span className="work-reward-chip work-reward-coins"><img src={coinImage} alt="" />{coinText(earned)}</span><span className="work-reward-chip work-reward-xp"><FiStar aria-hidden="true" />{earned} XP</span>{active.workMode && <span className="work-mode-badge">2×</span>}</p>
        <div className="work-actions work-primary-actions">
          {expired ? <button className="work-secondary" disabled={busy || active.durationSeconds > 475 * 60} onClick={() => onAction('EXTEND_WORK', { minutes: 5 })}>Add 5 minutes</button>
            : <button className="work-secondary" disabled={busy} onClick={() => onAction(active.pausedByUser || (!active.workMode && active.runningSince === null) ? 'RESUME_WORK' : 'PAUSE_WORK')}>{active.pausedByUser || (!active.workMode && active.runningSince === null) ? 'Resume' : 'Pause'}</button>}
          <button className="panel-action" disabled={busy} onClick={() => onAsk('finish')}>Finish</button>
        </div>
        {activeTask?.steps.length > 0 && <details className="work-extra work-session-steps"><summary>Steps · {activeTask.steps.length - remainingSteps}/{activeTask.steps.length}</summary><TaskChecklist task={activeTask} disabled={busy} onAction={onAction} /></details>}
        <details className="work-extra work-session-options"><summary>Options</summary>
          <div className="work-actions">
            {!expired && <button className="work-secondary" disabled={busy || active.durationSeconds > 475 * 60} onClick={() => onAction('EXTEND_WORK', { minutes: 5 })}>Add 5 minutes</button>}
            <button className="work-secondary" disabled={busy} onClick={() => onAsk('stop')}>Stop session</button>
          </div>

        </details>
      </section>

    </> : <>
      <WorkLanding question={question} busy={busy} onManual={onManual} onOpenSuggest={onOpenSuggest} onOpenQuiet={onOpenQuiet} />
      {openTasks.length > 0 && (
      <section className="work-task-list" aria-label="Your tasks">
        <h3 className="work-list-heading">Your tasks <span>{openTasks.length}</span></h3>
        {openTasks.map(task => <article className="panel-card work-task" key={task.id}>
          <div className="work-task-heading">
            <h4>{task.title}</h4>
            <button className="panel-action" aria-label={`Start task: ${task.title}`} disabled={busy || planning} onClick={() => onAction('START_WORK', { id: task.id })}><FiPlay aria-hidden="true" />Start</button>
          </div>
          <p className="work-task-meta"><FiClock aria-hidden="true" />{task.minutes} min{task.workMode && <span className="work-mode-badge" aria-label="Work Mode: double coins and XP">2×</span>}</p>
          <details className="work-extra work-task-details"><summary>Details</summary>
            {task.description && <p className="panel-description">{task.description}</p>}
            <TaskChecklist task={task} disabled={busy || planning} onAction={onAction} />
            <div className="work-actions">
              <button className="work-secondary" aria-label={`Edit ${task.title}`} disabled={busy || planning} onClick={() => onEdit(task)}><FiEdit2 aria-hidden="true" />Edit</button>
              <button className="work-secondary" aria-label={`Delete ${task.title}`} disabled={busy || planning} onClick={() => onAction('DELETE_WORK_TASK', { id: task.id })}><FiTrash2 aria-hidden="true" />Delete</button>
            </div>
          </details>
        </article>)}
      </section>
      )}
      {!!completedTasks.length && <details className="panel-card work-completed"><summary><FiCheckCircle aria-hidden="true" />Completed · {completedTasks.length}</summary>{completedTasks.map(task => <article className="work-completed-task" key={task.id}><h4>{task.title}</h4><TaskChecklist task={task} disabled /></article>)}</details>}
    </>}
  </PanelScreen>
}

export default function WorkScreen({ userState, onUpdate, onBack, onCompleted = noop }) {
  const [mode, setMode] = useState('home')
  const [question] = useState(() => pickWorkQuestion())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [description, setDescription] = useState('')
  const [draft, setDraft] = useState(null)
  const [quickMinutes, setQuickMinutes] = useState(25)
  const [workMode, setWorkMode] = useState(false)
  const [pendingStart, setPendingStart] = useState(null)
  const camera = useWorkCamera(!!pendingStart || userState.work?.active?.workMode === true)
  const activeRef = useRef(userState.work?.active)
  activeRef.current = userState.work?.active
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [now, setNow] = useState(Date.now())
  const requestRef = useRef(null)
  const mutationRef = useRef(false)
  const mounted = useRef(false)
  const updateRef = useRef(onUpdate)
  updateRef.current = onUpdate
  useEffect(() => {
    mounted.current = true
    let ignore = false
    sendWork('GET_WORK').then(state => { if (!ignore) updateRef.current(state) }).catch(err => { if (!ignore) setError(err.message) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true; mounted.current = false; requestRef.current?.abort() }
  }, [])
  useEffect(() => {
    if (!userState.work?.active) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [userState.work?.active?.id])
  const cameraSessionId = userState.work?.active?.workMode ? userState.work.active.id : null
  useEffect(() => {
    if (!cameraSessionId) return
    let ignore = false, inFlight = false
    async function report() {
      if (inFlight) return
      inFlight = true
      try {
        const state = await sendWork('REPORT_WORK_PRESENCE', { present: camera.presenceRef.current.present }, cameraSessionId)
        if (!ignore && mounted.current && activeRef.current?.id === cameraSessionId) updateRef.current(state)
      } catch (err) { if (!ignore && mounted.current) setError(err.message) }
      finally { inFlight = false }
    }
    report()
    const timer = setInterval(report, 1000)
    return () => { ignore = true; clearInterval(timer) }
  }, [cameraSessionId, camera.present])
  useEffect(() => {
    if (!cameraSessionId) return
    return () => { sendWork('REPORT_WORK_PRESENCE', { present: false }, cameraSessionId).catch(() => {}) }
  }, [cameraSessionId])
  async function action(type, payload = {}) {
    if (type === 'START_WORK') {
      const task = userState.work?.tasks.find(item => item.id === payload.id)
      if (task ? task.workMode : payload.workMode) {
        setPendingStart(payload); setMode('camera'); setError(''); setNotice('')
        return false
      }
    }
    return performAction(type, payload)
  }
  async function startVerified() {
    if (!pendingStart || !camera.presenceRef.current.present) return false
    return performAction('START_WORK', pendingStart)
  }
  async function performAction(type, payload = {}) {
    if (mutationRef.current) return false
    mutationRef.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const state = await sendWork(type, payload, userState.work?.active?.id)
      if (!mounted.current) return false
      onUpdate(state); setNow(Date.now()); setConfirmation(null)
      if (['FINISH_WORK', 'STOP_WORK'].includes(type)) setMode('home')
      if (type === 'FINISH_WORK') {
        onCompleted(workCompletion(state, userState.work.active.id))
      }
      if (type === 'STOP_WORK') setNotice('Session stopped. You can start again whenever you’re ready.')
      return state
    } catch (err) { if (mounted.current) setError(err.message); return false }
    finally { mutationRef.current = false; if (mounted.current) setBusy(false) }
  }
  async function plan(event) {
    event.preventDefault()
    if (requestRef.current || mutationRef.current || !description.trim()) return
    const controller = new AbortController()
    requestRef.current = controller; setPlanning(true); setError(''); setNotice('')
    try {
      const suggestion = await suggestTask(description, controller.signal)
      if (mounted.current && !controller.signal.aborted) setDraft({ ...suggestion, workMode })
    } catch (err) { if (mounted.current && !controller.signal.aborted) setError(err.message) }
    finally { if (requestRef.current === controller) { requestRef.current = null; if (mounted.current) setPlanning(false) } }
  }
  function cancelPlan() { requestRef.current?.abort(); requestRef.current = null; setPlanning(false) }
  async function save(event, startNow = false) {
    event.preventDefault()
    try {
      const data = { workMode: draft.workMode === true, ...validatePlan({ ...draft, minutes: Number(draft.minutes), steps: (draft.stepsText ?? draft.steps.join('\n')).split('\n').map(step => step.trim()).filter(Boolean) }) }
      const saved = await action('SAVE_WORK_TASK', { ...data, ...(draft.id ? { id: draft.id } : {}) })
      if (!saved) return false
      setDescription('')
      if (startNow) {
        const task = draft.id ? saved.work.tasks.find(item => item.id === draft.id) : saved.work.tasks.at(-1)
        const started = await action('START_WORK', { id: task.id, workMode: task.workMode })
        if (!started) setDraft(task)
        return !!started
      }
      setNotice('Task saved.')
      return true
    } catch (err) { setError(err.message) }
    return false
  }
  function closeSetup() {
    cancelPlan(); setPendingStart(null); setDraft(null); setMode('home'); setError('')
  }
  function openManual() {
    cancelPlan(); setError(''); setNotice(''); setMode('create')
    setDraft({ title: mode === 'suggest' ? description.trim().slice(0, 120) : '', description: '', minutes: 25, steps: [], workMode: mode === 'suggest' && workMode })
  }
  return <WorkView workMode={workMode} onWorkMode={setWorkMode} camera={camera} onStartVerified={startVerified} mode={mode} question={question} onOpenSuggest={() => { setWorkMode(false); setMode('suggest'); setError(''); setNotice('') }} onOpenQuiet={() => { setWorkMode(false); setMode('quiet'); setError(''); setNotice('') }} userState={userState} now={now} loading={loading} busy={busy} planning={planning} description={description} draft={draft} quickMinutes={quickMinutes} error={error} notice={notice} confirmation={confirmation}
    onBack={onBack} onDescription={setDescription} onSuggest={plan} onCancelPlanning={cancelPlan}
    onManual={openManual}
    onDraft={patch => setDraft(current => ({ ...current, ...patch }))} onSave={save} onCloseSetup={closeSetup} onQuickMinutes={setQuickMinutes}
    onAction={action} onEdit={task => { setDraft(task); setMode('edit'); setError(''); setNotice('') }} onAsk={setConfirmation} onCancelConfirm={() => setConfirmation(null)} />
}
