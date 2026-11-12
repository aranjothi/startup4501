import { FiChevronDown, FiClock } from 'react-icons/fi'
import './Work.css'
import TaskChecklist from './TaskChecklist'
import { listWorkHistory, summarizeWorkHistory, formatWorkDuration } from './history.js'

export default function WorkHistory({ work = { tasks: [], active: null } }) {
  const entries = listWorkHistory(work)
  const totals = summarizeWorkHistory(entries)
  return <div className="work-history-content">
    {work.active && <p className="panel-description" role="status">{work.active.workMode ? 'Your Work Mode timer pauses without camera presence. Return to Work to continue.' : work.active.runningSince === null ? 'Your work session is paused.' : 'Your work session is still running.'}</p>}
    {!entries.length ? <section className="panel-card work-history-empty">
      <FiClock aria-hidden="true" />
      <h3>No completed sessions yet</h3>
      <p className="panel-description">Finish a work session to see your time, checklist progress, and rewards here.</p>
    </section> : <>
      <section className="panel-card" aria-label="Saved work summary">
        <h3>Time well spent</h3>
        <dl className="work-history-stats">
          <div><dt>Saved sessions</dt><dd>{totals.sessions}</dd></div>
          <div><dt>Time worked</dt><dd>{formatWorkDuration(totals.seconds)}</dd></div>
          <div><dt>Coins earned</dt><dd>{`${totals.coins} ${totals.coins === 1 ? 'coin' : 'coins'}`}</dd></div>
          <div><dt>XP earned</dt><dd>{totals.xp} XP</dd></div>
        </dl>
      </section>
      <p className="panel-description">Your latest 100 completed sessions, newest first. Totals cover the sessions saved here.</p>
      <section className="work-history-list" aria-label="Completed work sessions">
        {entries.map(entry => <details className="panel-card work-history-session" key={entry.id}>
          <summary>
            <span className="work-history-session-heading"><strong>{entry.title}</strong><time dateTime={new Date(entry.completedAt).toISOString()}>{new Date(entry.completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time><small>{entry.taskId ? 'Task session' : 'Quiet work'} · {formatWorkDuration(entry.seconds)}</small></span>
            <FiChevronDown aria-hidden="true" />
          </summary>
          <dl className="work-session-stats">
            <div><dt>Time worked</dt><dd>{formatWorkDuration(entry.seconds)}</dd></div>
            {entry.plannedSeconds != null && <div><dt>Time planned</dt><dd>{formatWorkDuration(entry.plannedSeconds)}</dd></div>}
            {entry.workMode && <div><dt>Work Mode</dt><dd>2× coins and XP</dd></div>}
            <div><dt>Earned</dt><dd>{entry.coins} {entry.coins === 1 ? 'coin' : 'coins'} · {entry.xp} XP</dd></div>
          </dl>
          {entry.checklist?.steps.length > 0 ? <TaskChecklist task={{ ...entry.checklist, title: entry.title, completedAt: entry.completedAt }} disabled />
            : <p className="panel-description">{!entry.taskId ? 'A quiet work session without a task checklist.' : entry.checklist ? 'This task had no checklist steps.' : 'No checklist snapshot was saved for this earlier session.'}</p>}
        </details>)}
      </section>
    </>}
  </div>
}
