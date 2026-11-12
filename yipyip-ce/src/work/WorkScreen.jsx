import React, { useEffect, useRef, useState } from 'react'
import { FiCheckCircle, FiClock, FiEdit2, FiPlay, FiTrash2 } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import PetAppearance from '../pet/PetAppearance'
import { equippedCosmetics } from '../pet/cosmetics.js'
import { elapsedSeconds, validatePlan } from './model.js'
import { sendWork, suggestTask } from './api.js'
import './Work.css'

const noop = () => {}
function clock(seconds) {
  const total = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(total / 3600)
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(Math.floor(total % 3600 / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const coinText = coins => `${coins} ${coins === 1 ? 'coin' : 'coins'}`

export function WorkView({ userState, now = Date.now(), loading = false, busy = false, planning = false, description = '', draft = null, quickMinutes = 25, error = '', notice = '', confirmation = null, onBack = noop, onDescription = noop, onSuggest = noop, onCancelPlanning = noop, onManual = noop, onDraft = noop, onSave = noop, onCancelDraft = noop, onQuickMinutes = noop, onAction = noop, onEdit = noop, onAsk = noop, onCancelConfirm = noop }) {
  const { pet, coins, work = { tasks: [], active: null } } = userState
  const active = work.active
  const elapsed = elapsedSeconds(active, now)
  const expired = !!active && elapsed >= active.durationSeconds
  const earned = Math.floor(elapsed / 60)
  const openTasks = work.tasks.filter(task => !task.completedAt)
  const completedTasks = work.tasks.filter(task => task.completedAt)
  const activeTask = work.tasks.find(task => task.id === active?.taskId)
  return <PanelScreen title="Work" coins={coins} onBack={onBack} backDisabled={busy} className="work-screen">
    {error && <p className="work-error" role="alert">{error}</p>}
    {notice && <p className="work-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading your tasks…</p> : active && confirmation ? <section className="panel-card work-confirm" aria-label="Confirm session action">
        <h3>{confirmation === 'finish' ? 'All done?' : 'Stop for now?'}</h3>
        <p>{confirmation === 'finish' ? `Mark this task complete and collect ${coinText(earned)} and ${earned} XP.` : 'You can start again whenever you’re ready. Stopping ends this session without rewards.'}</p>
        <div className="work-actions">
          <button className="work-secondary" disabled={busy} onClick={onCancelConfirm}>Keep working</button>
          <button className="panel-action" disabled={busy} onClick={() => onAction(confirmation === 'finish' ? 'FINISH_WORK' : 'STOP_WORK')}>{confirmation === 'finish' ? 'Finish & collect' : 'Stop without rewards'}</button>
        </div>
      </section> : active ? <>
      <section className="panel-card work-focus" aria-label="Current session">
        <span className="work-eyebrow">{expired ? 'Time to check in' : active.runningSince === null ? 'Taking a breather' : 'One step at a time'}</span>
        <h3>{active.title}</h3>
        <PetAppearance className="work-pet" pet={pet} cosmetics={equippedCosmetics(userState)} />
        <p className="work-companion">{expired ? 'How did it go? Finish up or give yourself more time.' : `${pet.name} is keeping you company. You’ve got this.`}</p>
        <div className="work-clock" role="timer" aria-label="Time remaining">{clock(active.durationSeconds - elapsed)}</div>
        <p className="panel-description">{coinText(earned)} earned so far · 1 coin + 1 XP per full minute</p>
        {activeTask?.steps.length > 0 && <ol className="work-steps">{activeTask.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
        <div className="work-actions">
          {!expired && <button className="work-secondary" disabled={busy} onClick={() => onAction(active.runningSince === null ? 'RESUME_WORK' : 'PAUSE_WORK')}>{active.runningSince === null ? 'Resume' : 'Pause'}</button>}
          <button className="work-secondary" disabled={busy || active.durationSeconds > 475 * 60} onClick={() => onAction('EXTEND_WORK', { minutes: 5 })}>Add 5 minutes</button>
        </div>
        <button className="panel-action" disabled={busy} onClick={() => onAsk('finish')}>Complete task</button>
        <button className="work-text-button" disabled={busy} onClick={() => onAsk('stop')}>Stop session</button>
        <p className="panel-description">You can go back or close the sidebar. Your session stays saved.</p>
      </section>

    </> : draft ? <form className="panel-card work-form" onSubmit={onSave}>
      <h3>{draft.id ? 'Edit your task' : 'Review your task'}</h3>
      <p className="panel-description">The estimate is a starting point. Make this work for you.</p>
      <label>Task title<input required maxLength={120} value={draft.title} onChange={event => onDraft({ title: event.target.value })} /></label>
      <label>Description<textarea maxLength={2000} value={draft.description} onChange={event => onDraft({ description: event.target.value })} /></label>
      <label>Minutes<input required type="number" min="1" max="480" step="1" value={draft.minutes} onChange={event => onDraft({ minutes: event.target.value })} /></label>
      <label>Steps (one per line)<textarea rows={5} value={draft.stepsText ?? draft.steps.join('\n')} onChange={event => onDraft({ stepsText: event.target.value })} /></label>
      <p className="panel-description">Earn 1 coin + 1 XP per full minute worked.</p>
      <div className="work-actions"><button type="button" className="work-secondary" disabled={busy} onClick={onCancelDraft}>Cancel</button><button className="panel-action" disabled={busy}>Save task</button></div>
    </form> : <>
      <form className="panel-card work-form" onSubmit={onSuggest}>
        <h3>Let’s make a start</h3>
        <p className="panel-description">Tell {pet.name} what you need to do. Review a suggested task, steps, and time before saving.</p>
        <label>Describe your task<textarea required maxLength={2000} rows={3} placeholder="I need to tidy my room…" value={description} onChange={event => onDescription(event.target.value)} disabled={planning} /></label>
        <div className="work-actions">
          <button className="panel-action" disabled={planning || busy || !description.trim()}>{planning ? 'Thinking…' : 'Suggest a task'}</button>
          {planning ? <button type="button" className="work-secondary" onClick={onCancelPlanning}>Cancel suggestion</button> : <button type="button" className="work-text-button" disabled={busy} onClick={onManual}>Create manually</button>}
        </div>
        <p className="panel-description">Your description is sent to our AI service for a suggestion.</p>
      </form>
      <section className="work-task-list" aria-label="Your tasks">
        <h3 className="work-list-heading">Your tasks <span>{openTasks.length}</span></h3>
        {!openTasks.length && <p className="panel-description">No tasks yet. A small first step is enough.</p>}
        {openTasks.map(task => <article className="panel-card work-task" key={task.id}>
          <h4>{task.title}</h4>
          {task.description && <p className="panel-description">{task.description}</p>}
          <p className="work-task-meta"><FiClock aria-hidden="true" />{task.minutes} min · up to {coinText(task.minutes)}</p>
          <div className="work-actions">
            <button className="panel-action" disabled={busy || planning} onClick={() => onAction('START_WORK', { id: task.id })}><FiPlay aria-hidden="true" />Start task</button>
            <button className="work-icon-button" aria-label={`Edit ${task.title}`} disabled={busy || planning} onClick={() => onEdit(task)}><FiEdit2 /></button>
            <button className="work-icon-button" aria-label={`Delete ${task.title}`} disabled={busy || planning} onClick={() => onAction('DELETE_WORK_TASK', { id: task.id })}><FiTrash2 /></button>
          </div>
        </article>)}
      </section>
      <form className="panel-card work-form work-quiet" onSubmit={event => { event.preventDefault(); onAction('START_WORK', { title: 'Quiet work', minutes: Number(quickMinutes) }) }}>
        <h3>Just want some company?</h3>
        <p className="panel-description">Start a timer without making a task.</p>
        <label>Minutes<input required type="number" min="1" max="480" step="1" value={quickMinutes} onChange={event => onQuickMinutes(event.target.value)} /></label>
        <button className="work-secondary" disabled={busy || planning}>Start quiet work</button>
      </form>
      {!!completedTasks.length && <details className="panel-card work-completed"><summary><FiCheckCircle aria-hidden="true" />Completed · {completedTasks.length}</summary>{completedTasks.map(task => <p key={task.id}>{task.title}</p>)}</details>}
    </>}
  </PanelScreen>
}

export default function WorkScreen({ userState, onUpdate, onBack }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [description, setDescription] = useState('')
  const [draft, setDraft] = useState(null)
  const [quickMinutes, setQuickMinutes] = useState(25)
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
  }, [userState.work?.active])
  async function action(type, payload = {}) {
    if (mutationRef.current) return false
    mutationRef.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const state = await sendWork(type, payload)
      if (!mounted.current) return false
      onUpdate(state); setNow(Date.now()); setConfirmation(null)
      if (type === 'FINISH_WORK') {
        const last = state.work.history.at(-1)
        setNotice(`Nice work! You earned ${coinText(last.coins)} and ${last.coins} XP.`)
      }
      if (type === 'STOP_WORK') setNotice('Session stopped. You can start again whenever you’re ready.')
      return true
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
      if (mounted.current && !controller.signal.aborted) setDraft(suggestion)
    } catch (err) { if (mounted.current && !controller.signal.aborted) setError(err.message) }
    finally { if (requestRef.current === controller) { requestRef.current = null; if (mounted.current) setPlanning(false) } }
  }
  function cancelPlan() { requestRef.current?.abort(); requestRef.current = null; setPlanning(false) }
  async function save(event) {
    event.preventDefault()
    try {
      const data = validatePlan({ ...draft, minutes: Number(draft.minutes), steps: (draft.stepsText ?? draft.steps.join('\n')).split('\n').map(step => step.trim()).filter(Boolean) })
      if (await action('SAVE_WORK_TASK', { ...data, ...(draft.id ? { id: draft.id } : {}) })) { setDraft(null); setDescription(''); setNotice('Task saved. Ready when you are!') }
    } catch (err) { setError(err.message) }
  }
  return <WorkView userState={userState} now={now} loading={loading} busy={busy} planning={planning} description={description} draft={draft} quickMinutes={quickMinutes} error={error} notice={notice} confirmation={confirmation}
    onBack={onBack} onDescription={setDescription} onSuggest={plan} onCancelPlanning={cancelPlan}
    onManual={() => { setError(''); setDraft({ title: description.trim().slice(0, 120), description: '', minutes: 25, steps: [] }) }}
    onDraft={patch => setDraft(current => ({ ...current, ...patch }))} onSave={save} onCancelDraft={() => { setDraft(null); setError('') }} onQuickMinutes={setQuickMinutes}
    onAction={action} onEdit={task => { setDraft(task); setError(''); setNotice('') }} onAsk={setConfirmation} onCancelConfirm={() => setConfirmation(null)} />
}
