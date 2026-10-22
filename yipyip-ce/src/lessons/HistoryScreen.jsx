import { useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiZap, FiCalendar, FiAward, FiVideo } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import { getLesson, getTopic } from './catalog.js'
import { localDayKey, monthDays, practiceStats } from './calendar.js'
import { getScenario, formatTime } from '../practice/scenarios.js'
import TopicIcon from './TopicIcon'
import './Lessons.css'

export default function HistoryScreen({ coins, completions, legacySessions, onBack, onAttempt, onRecording }) {
  const today = new Date()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(() => localDayKey(today))
  const stats = practiceStats(completions, today)
  const counts = new Map()
  for (const item of completions) counts.set(item.dayKey, (counts.get(item.dayKey) ?? 0) + 1)
  const selectedLessons = completions.filter(item => item.dayKey === selected)
  const canNext = month.getFullYear() < today.getFullYear() || (month.getFullYear() === today.getFullYear() && month.getMonth() < today.getMonth())
  const selectedDate = new Date(`${selected}T12:00:00`)
  function changeMonth(offset) { setMonth(value => new Date(value.getFullYear(), value.getMonth() + offset, 1)) }
  return <PanelScreen title="History" coins={coins} onBack={onBack}>
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
    <section className="panel-card daily-lessons"><h3 className="icon-heading"><FiCalendar aria-hidden="true" />{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3>
      {!selectedLessons.length ? <p className="panel-description">No lessons completed.</p> : selectedLessons.map(attempt => {
        const lesson = getLesson(attempt.lessonId)
        return <button className="lesson-row completed-lesson-row" data-topic={lesson?.topicId} key={attempt.id} onClick={() => onAttempt(attempt.id)}><span className="topic-icon-badge"><TopicIcon topicId={lesson?.topicId} /></span><span><strong>{lesson?.title ?? 'Conversation lesson'}</strong><small>{getTopic(lesson?.topicId)?.title} · {new Date(attempt.completedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></span><FiChevronRight /></button>
      })}
    </section>
    {legacySessions?.length > 0 && <details className="panel-card legacy-history"><summary className="icon-heading"><FiVideo aria-hidden="true" />Earlier recordings</summary>{legacySessions.map(session => <button className="lesson-row" key={session.id} onClick={() => onRecording(session.id)}><span><strong>{getScenario(session.scenarioId).title}</strong><small>{new Date(session.createdAt).toLocaleDateString()} · {formatTime(session.duration)}</small></span><FiChevronRight /></button>)}</details>}
  </PanelScreen>
}
