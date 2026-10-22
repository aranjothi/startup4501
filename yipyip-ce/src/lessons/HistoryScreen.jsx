import { useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiZap, FiCalendar, FiAward, FiVideo, FiTrash2 } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import { getLesson, getTopic } from './catalog.js'
import { localDayKey, monthDays, practiceStats } from './calendar.js'
import { getScenario, formatTime } from '../practice/scenarios.js'
import TopicIcon from './TopicIcon'
import './Lessons.css'
import { deleteAttempt } from './lessonStore.js'
import DeleteConversationDialog from './DeleteConversationDialog'

export default function HistoryScreen({ coins, completions, legacySessions, onBack, onAttempt, onRecording, onDeleted }) {
  const today = new Date()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(() => localDayKey(today))
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deletedIds, setDeletedIds] = useState([])
  const visibleCompletions = completions.filter(item => !deletedIds.includes(item.id))
  const stats = practiceStats(visibleCompletions, today)
  const counts = new Map()
  for (const item of visibleCompletions) counts.set(item.dayKey, (counts.get(item.dayKey) ?? 0) + 1)
  const selectedLessons = visibleCompletions.filter(item => item.dayKey === selected)
  const canNext = month.getFullYear() < today.getFullYear() || (month.getFullYear() === today.getFullYear() && month.getMonth() < today.getMonth())
  const selectedDate = new Date(`${selected}T12:00:00`)
  function changeMonth(offset) { setMonth(value => new Date(value.getFullYear(), value.getMonth() + offset, 1)) }
  function cancelDelete() { if (!deleting) { setPendingDelete(null); setDeleteError('') } }
  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteAttempt(pendingDelete.id)
      setDeletedIds(ids => [...ids, pendingDelete.id])
      setPendingDelete(null)
      await onDeleted?.()
    } catch (error) { setDeleteError(error.message || 'Could not delete this conversation. Please try again.') }
    finally { setDeleting(false) }
  }
  const deleteTitle = getLesson(pendingDelete?.lessonId)?.title ?? 'Conversation lesson'
  return <PanelScreen title="History" coins={coins} onBack={onBack} backDisabled={deleting} overlay={pendingDelete && <DeleteConversationDialog title={deleteTitle} busy={deleting} error={deleteError} onCancel={cancelDelete} onConfirm={confirmDelete} />}>
    <div className="history-stats">
      <div className="panel-card streak-stat"><span className="history-stat-icon"><FiZap aria-hidden="true" /></span><strong>{stats.current}</strong><span>day streak</span></div>
      <div className="panel-card small-stat practiced-stat"><FiCalendar className="history-corner-icon" aria-hidden="true" /><strong>{stats.daysPracticed}</strong><span>Days practiced</span></div>
      <div className="panel-card small-stat longest-stat"><FiAward className="history-corner-icon" aria-hidden="true" /><strong>{stats.longest}</strong><span>Longest streak</span></div>
    </div>
    <section className="panel-card calendar-card" aria-label="Practice calendar">
      <header className="calendar-header"><button aria-label="Previous month" onClick={() => changeMonth(-1)}><FiChevronLeft /></button><h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><button aria-label="Next month" disabled={!canNext} onClick={() => changeMonth(1)}><FiChevronRight /></button></header>
      <div className="calendar-grid"><div className="calendar-weekdays">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index} aria-hidden="true">{day}</span>)}</div>
        {monthDays(month.getFullYear(), month.getMonth()).map((day, index) => day ? <button key={day.key} className={`calendar-day ${counts.has(day.key) ? 'practiced' : ''} ${day.key === localDayKey(today) ? 'today' : ''}`} aria-pressed={selected === day.key} aria-label={`${new Date(`${day.key}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}: ${counts.get(day.key) ?? 0} ${counts.get(day.key) === 1 ? 'lesson' : 'lessons'} completed`} onClick={() => setSelected(day.key)}><span>{day.day}</span>{counts.has(day.key) && <i aria-hidden="true" />}</button> : <span key={`blank-${index}`} />)}
      </div>
    </section>
    <section className="panel-card daily-lessons"><h3 className="icon-heading" tabIndex={-1}><FiCalendar aria-hidden="true" />{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
      {!selectedLessons.length ? <p className="panel-description">No lessons completed.</p> : selectedLessons.map(attempt => {
        const lesson = getLesson(attempt.lessonId)
        const title = lesson?.title ?? 'Conversation lesson'
        const time = new Date(attempt.completedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
        return <article className="lesson-row completed-lesson-row" data-topic={lesson?.topicId} key={attempt.id} aria-label={`${title} at ${time}`}>
          <div className="history-row-actions">
            <button className="topic-icon-badge history-open-icon" aria-label={`Open ${title} at ${time}`} onClick={() => onAttempt(attempt.id)}><TopicIcon topicId={lesson?.topicId} /></button>
            <button className="history-trash" aria-label={`Delete ${title} at ${time}`} onClick={() => { setDeleteError(''); setPendingDelete(attempt) }}><FiTrash2 aria-hidden="true" /></button>
          </div>
          <button className="history-conversation-link" onClick={() => onAttempt(attempt.id)}><span><strong>{title}</strong><small>{getTopic(lesson?.topicId)?.title} · {time}</small></span><FiChevronRight aria-hidden="true" /></button>
        </article>
      })}
    </section>
    {legacySessions?.length > 0 && <details className="panel-card legacy-history"><summary className="icon-heading"><FiVideo aria-hidden="true" />Earlier recordings</summary>{legacySessions.map(session => <button className="lesson-row" key={session.id} onClick={() => onRecording(session.id)}><span><strong>{getScenario(session.scenarioId).title}</strong><small>{new Date(session.createdAt).toLocaleDateString()} · {formatTime(session.duration)}</small></span><FiChevronRight /></button>)}</details>}
  </PanelScreen>
}
