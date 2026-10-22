import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { FaExclamation } from 'react-icons/fa'
import coinImg from './assets/ui/coin.png'
import './Tasks.css'

// ---- Icons ----

function PinIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}


function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
  )
}

function DragIcon() {
  return (
    <svg viewBox="0 0 10 18" fill="currentColor">
      <circle cx="3" cy="2"  r="1.3" /><circle cx="7" cy="2"  r="1.3" />
      <circle cx="3" cy="6"  r="1.3" /><circle cx="7" cy="6"  r="1.3" />
      <circle cx="3" cy="10" r="1.3" /><circle cx="7" cy="10" r="1.3" />
      <circle cx="3" cy="14" r="1.3" /><circle cx="7" cy="14" r="1.3" />
    </svg>
  )
}

// ---- Helpers ----

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function numericOnly(val, max) {
  return val.replace(/\D/g, '').slice(0, max)
}

function buildDueDate(month, day, year) {
  if (!month || !day || !year || year.length < 4) return ''
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function isDatePast(dateStr) {
  if (!dateStr) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function taskTotalMinutes(task) {
  if (task.type === 'task') {
    const [h, m, s] = (task.timeAllotted ?? '00:00:00').split(':').map(Number)
    return h * 60 + m + s / 60
  }
  if (task.breaks) return (task.studyInterval ?? 0) * (task.numIntervals ?? 0)
  return task.duration ?? 0
}

function formatDuration(totalMinutes) {
  const mins = Math.floor(totalMinutes)
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hourStr = `${h} ${h === 1 ? 'hour' : 'hours'}`
  return m === 0 ? hourStr : `${hourStr} ${m} ${m === 1 ? 'minute' : 'minutes'}`
}

const TASK_COLORS = [
  { name: 'Red',    hex: '#fca5a5', dark: '#7f1d1d' },
  { name: 'Orange', hex: '#fdba74', dark: '#7c2d12' },
  { name: 'Yellow', hex: '#fde68a', dark: '#713f12' },
  { name: 'Green',  hex: '#86efac', dark: '#14532d' },
  { name: 'Blue',   hex: '#93c5fd', dark: '#1e3a8a' },
  { name: 'Purple', hex: '#d8b4fe', dark: '#4c1d95' },
  { name: 'Gray',   hex: '#d1d5db', dark: '#1f2937' },
]

// ---- Start confirm modal ----

function StartConfirmModal({ task, onClose, onBegin }) {
  const [closing, setClosing] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const backdropDown = useRef(false)
  const totalMinutes = taskTotalMinutes(task)
  const coins = Math.floor(totalMinutes) * (focusMode ? 2 : 1)

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 180)
  }

  return (
    <div
      className={`modal-backdrop ${closing ? 'backdrop-out' : 'backdrop-in'}`}
      onMouseDown={e => { backdropDown.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropDown.current) handleClose() }}
    >
      <div className={`start-modal ${closing ? 'modal-out' : 'modal-in'}`} onClick={e => e.stopPropagation()}>
        <p className="start-modal-title">Ready to Start?</p>

        <div className="start-modal-time">
          <ClockIcon />
          <span>{formatDuration(totalMinutes)}</span>
        </div>

        <div className="start-modal-earn">
          <span>You will earn</span>
          <img src={coinImg} alt="coin" className="start-coin-img" />
          <span className="start-coin-count">{focusMode ? `${coins} (2×)` : coins}</span>
        </div>

        <div className="focus-mode-row" onClick={() => setFocusMode(f => !f)}>
          <span className="focus-mode-label">Focus Mode</span>
          <div className={`focus-toggle ${focusMode ? 'focus-toggle-on' : ''}`} />
        </div>

        {focusMode && (
          <p className="focus-mode-note">Camera required · panel stays open</p>
        )}

        <button className="start-begin-btn" onClick={() => onBegin(focusMode)}>Begin</button>
      </div>
    </div>
  )
}

// ---- New / Edit modal ----

function NewModal({ onClose, onSave, editTask }) {
  const [closing, setClosing] = useState(false)
  const [type, setType]               = useState(editTask?.type          ?? 'task')
  const [title, setTitle]             = useState(editTask?.title         ?? '')
  const [description, setDescription] = useState(editTask?.description   ?? '')
  const [color, setColor]             = useState(editTask?.color         ?? '')
  const [breaks, setBreaks]           = useState(editTask?.breaks        ?? false)
  const [duration, setDuration]       = useState(editTask?.duration      ?? 25)
  const [breakDur, setBreakDur]       = useState(editTask?.breakDuration ?? 5)
  const [studyInt, setStudyInt]       = useState(editTask?.studyInterval ?? 25)
  const [numInt, setNumInt]           = useState(editTask?.numIntervals  ?? 4)

  // Time allotted: HH : MM : SS
  const parsedTime = (editTask?.timeAllotted ?? '00:15:00').split(':')
  const [tH, setTH] = useState(parsedTime[0] ?? '00')
  const [tM, setTM] = useState(parsedTime[1] ?? '00')
  const [tS, setTS] = useState(parsedTime[2] ?? '00')

  // Due date: MM / DD / YYYY
  const parsedDate = editTask?.dueDate ? editTask.dueDate.split('-') : ['', '', '']
  const [dueDateOn, setDueDateOn] = useState(!!editTask?.dueDate)
  const [dYear,  setDYear]  = useState(parsedDate[0] ?? '')
  const [dMonth, setDMonth] = useState(parsedDate[1] ? String(parseInt(parsedDate[1])) : '')
  const [dDay,   setDDay]   = useState(parsedDate[2] ? String(parseInt(parsedDate[2])) : '')

  const builtDate   = dueDateOn ? buildDueDate(dMonth, dDay, dYear) : ''
  const datePastErr = builtDate && isDatePast(builtDate) && builtDate !== (editTask?.dueDate ?? '')

  function handleSave() {
    if (!title.trim()) return
    const timeAllotted = `${tH.padStart(2,'0')}:${tM.padStart(2,'0')}:${tS.padStart(2,'0')}`
    const dueDate = builtDate
    const base = { type, title: title.trim(), description: description.trim(), dueDate, color }
    const data = type === 'task'
      ? { ...base, timeAllotted }
      : {
          ...base, breaks,
          duration:      breaks ? null : duration,
          breakDuration: breaks ? breakDur : null,
          studyInterval: breaks ? studyInt : null,
          numIntervals:  breaks ? numInt   : null,
        }
    onSave(data)
  }

  const backdropDown = useRef(false)

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 180)
  }

  return (
    <div
      className={`modal-backdrop ${closing ? 'backdrop-out' : 'backdrop-in'}`}
      onMouseDown={e => { backdropDown.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropDown.current) handleClose() }}
    >
      <div className={`new-modal ${closing ? 'modal-out' : 'modal-in'}`} onClick={e => e.stopPropagation()}>
        <div className="type-pill">
          <button className={`type-btn ${type === 'task'    ? 'active' : ''}`} onClick={() => setType('task')}>Task</button>
          <button className={`type-btn ${type === 'session' ? 'active' : ''}`} onClick={() => setType('session')}>Session</button>
        </div>

        <div className="modal-fields">
          <input className="modal-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="modal-input" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />

          <div className="modal-field-group">
            <span className="modal-label">Color</span>
            <div className="color-swatches">
              <button
                className={`color-swatch no-color ${color === '' ? 'selected' : ''}`}
                onClick={() => setColor('')}
                title="No color"
              >
                <svg viewBox="0 0 18 18" style={{ width: '100%', height: '100%', display: 'block' }}>
                  <line x1="3" y1="3" x2="15" y2="15" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
              {TASK_COLORS.map(c => (
                <button
                  key={c.name}
                  className={`color-swatch ${color === c.hex ? 'selected' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => setColor(color === c.hex ? '' : c.hex)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {type === 'task' ? (
            <div key="task" className="form-section-enter">
              <div className="modal-field-group">
                <span className="modal-label">Time to Allot</span>
                <div className="time-input-group">
                  <input className="modal-input seg-input" maxLength={2} placeholder="00" value={tH} onChange={e => setTH(numericOnly(e.target.value, 2))} />
                  <span className="seg-sep">:</span>
                  <input className="modal-input seg-input" maxLength={2} placeholder="00" value={tM} onChange={e => setTM(numericOnly(e.target.value, 2))} />
                  <span className="seg-sep">:</span>
                  <input className="modal-input seg-input" maxLength={2} placeholder="00" value={tS} onChange={e => setTS(numericOnly(e.target.value, 2))} />
                </div>
              </div>
              <div className="modal-field-group">
                <div className="breaks-row">
                  <span className="modal-label">Due Date</span>
                  <div className="toggle-pill">
                    <button className={`toggle-btn ${dueDateOn  ? 'active' : ''}`} onClick={() => setDueDateOn(true)}>On</button>
                    <button className={`toggle-btn ${!dueDateOn ? 'active' : ''}`} onClick={() => setDueDateOn(false)}>Off</button>
                  </div>
                </div>
                {dueDateOn && (
                  <div className="form-section-enter">
                    <div className="date-input-group">
                      <input className="modal-input seg-input" maxLength={2} placeholder="MM" value={dMonth} onChange={e => setDMonth(numericOnly(e.target.value, 2))} />
                      <span className="seg-sep">/</span>
                      <input className="modal-input seg-input" maxLength={2} placeholder="DD" value={dDay} onChange={e => setDDay(numericOnly(e.target.value, 2))} />
                      <span className="seg-sep">/</span>
                      <input className="modal-input seg-input year" maxLength={4} placeholder="YYYY" value={dYear} onChange={e => setDYear(numericOnly(e.target.value, 4))} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key="session" className="form-section-enter">
              <div className="modal-field-group">
                <div className="breaks-row">
                  <span className="modal-label">Due Date</span>
                  <div className="toggle-pill">
                    <button className={`toggle-btn ${dueDateOn  ? 'active' : ''}`} onClick={() => setDueDateOn(true)}>On</button>
                    <button className={`toggle-btn ${!dueDateOn ? 'active' : ''}`} onClick={() => setDueDateOn(false)}>Off</button>
                  </div>
                </div>
                {dueDateOn && (
                  <div className="form-section-enter">
                    <div className="date-input-group">
                      <input className="modal-input seg-input" maxLength={2} placeholder="MM" value={dMonth} onChange={e => setDMonth(numericOnly(e.target.value, 2))} />
                      <span className="seg-sep">/</span>
                      <input className="modal-input seg-input" maxLength={2} placeholder="DD" value={dDay} onChange={e => setDDay(numericOnly(e.target.value, 2))} />
                      <span className="seg-sep">/</span>
                      <input className="modal-input seg-input year" maxLength={4} placeholder="YYYY" value={dYear} onChange={e => setDYear(numericOnly(e.target.value, 4))} />
                    </div>
                  </div>
                )}
              </div>
              <div className="breaks-row">
                <span className="modal-label">Breaks</span>
                <div className="toggle-pill">
                  <button className={`toggle-btn ${breaks  ? 'active' : ''}`} onClick={() => setBreaks(true)}>On</button>
                  <button className={`toggle-btn ${!breaks ? 'active' : ''}`} onClick={() => setBreaks(false)}>Off</button>
                </div>
              </div>
              {breaks ? (
                <div key="breaks-on" className="form-section-enter">
                  <div className="modal-row">
                    <span className="modal-label">Study Interval (min)</span>
                    <input className="modal-input num-input" type="number" min="1" value={studyInt} onChange={e => setStudyInt(Number(e.target.value))} />
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Break Duration (min)</span>
                    <input className="modal-input num-input" type="number" min="1" value={breakDur} onChange={e => setBreakDur(Number(e.target.value))} />
                  </div>
                  <div className="modal-row">
                    <span className="modal-label"># of Intervals</span>
                    <input className="modal-input num-input" type="number" min="1" value={numInt} onChange={e => setNumInt(Number(e.target.value))} />
                  </div>
                </div>
              ) : (
                <div key="breaks-off" className="form-section-enter">
                  <div className="modal-row">
                    <span className="modal-label">Duration (min)</span>
                    <input className="modal-input num-input" type="number" min="1" value={duration} onChange={e => setDuration(Number(e.target.value))} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="modal-save-btn" onClick={handleSave} disabled={
          !title.trim() ||
          (type === 'task' && (parseInt(tH) || 0) + (parseInt(tM) || 0) + (parseInt(tS) || 0) === 0) ||
          (type === 'session' && !breaks && duration < 1) ||
          (type === 'session' && breaks && (studyInt < 1 || breakDur < 1 || numInt < 1)) ||
          !!datePastErr
        }>
          {editTask ? 'Save Changes' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ---- Delete confirmation ----

function DeleteConfirm({ task, onConfirm, onCancel }) {
  const [closing, setClosing] = useState(false)
  const backdropDown = useRef(false)

  function handleClose() {
    setClosing(true)
    setTimeout(() => onCancel(), 180)
  }

  return (
    <div
      className={`modal-backdrop ${closing ? 'backdrop-out' : 'backdrop-in'}`}
      onMouseDown={e => { backdropDown.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropDown.current) handleClose() }}
    >
      <div className={`delete-modal ${closing ? 'modal-out' : 'modal-in'}`} onClick={e => e.stopPropagation()}>
        <p className="delete-title">Delete this {task.type}?</p>
        <p className="delete-subtitle">
          "<span className="delete-task-title">{task.title}</span>" will be permanently removed.
        </p>
        <div className="delete-actions">
          <button className="delete-cancel-btn" onClick={handleClose}>Cancel</button>
          <button className="delete-confirm-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ---- Todo card ----

function TodoCard({ task, isDragging, onDragHandleDown, onPin, onEdit, onDelete, onStart }) {
  const timeLabel = task.timeAllotted && task.timeAllotted !== '00:00:00' ? task.timeAllotted : null
  const dateLabel = task.dueDate
    ? formatDate(task.dueDate)
    : task.type === 'task' ? timeLabel : task.duration != null ? `${task.duration} min session` : null

  const colorEntry   = task.color ? TASK_COLORS.find(c => c.hex === task.color) : null
  const darkColor    = colorEntry?.dark ?? '#1e3a70'
  const playBg       = task.color ? darkColor + '35' : 'rgba(30, 58, 112, 0.16)'
  const cardStyle    = task.color ? { background: task.color, borderColor: task.color } : {}
  const dividerStyle = task.color ? { background: darkColor + '30' } : {}
  const handleStyle  = task.color ? { background: darkColor + '18', color: darkColor } : {}
  const textStyle    = task.color ? { color: darkColor } : {}

  return (
    <div className={`todo-card ${isDragging ? 'is-dragging' : ''}`} style={cardStyle} data-id={task.id}>
      <div className="todo-actions" style={textStyle}>
        <button className={`action-btn ${task.pinned ? 'pinned' : ''}`} style={textStyle} onClick={() => onPin(task.id)} title={task.pinned ? 'Unpin' : 'Pin'}>
          <PinIcon filled={task.pinned} />
        </button>
        <button className="action-btn" style={textStyle} onClick={() => onEdit(task)} title="Edit">
          <EditIcon />
        </button>
        <button className="action-btn delete-btn" style={textStyle} onClick={() => onDelete(task)} title="Delete">
          <TrashIcon />
        </button>
      </div>
      <div className="todo-divider" style={dividerStyle} />
      <div className="todo-card-text">
        <div className="todo-title-row">
          <span className="todo-title" style={textStyle}>{task.title}</span>
          <span className="todo-type-label" style={task.color ? { background: darkColor + '25', color: darkColor } : {}}>{task.type === 'task' ? 'Task' : 'Session'}</span>
        </div>
        {task.description && <span className="todo-desc" style={textStyle}>{task.description}</span>}
        {dateLabel && (
          <span className="todo-date" style={textStyle}>
            {task.dueDate && isDatePast(task.dueDate) ? <FaExclamation /> : <ClockIcon />}
            {dateLabel}
          </span>
        )}
      </div>
      <button className="play-section" style={{ background: playBg, color: task.color ? darkColor : '#355c9f' }} onClick={() => onStart(task)}>
        <PlayIcon />
        <span className="play-label">Start</span>
      </button>
      <div className="drag-handle" style={handleStyle} onMouseDown={onDragHandleDown}>
        <DragIcon />
      </div>
    </div>
  )
}

// ---- Main Tasks screen ----

export default function Tasks({ onClose, onBeginTask }) {
  const [closing, setClosing]           = useState(false)
  const [tasks, setTasks]               = useState([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [startTarget, setStartTarget]   = useState(null)
  const [draggingId, setDraggingId]     = useState(null)
  const [dragInsertIdx, setDragInsertIdx] = useState(null)
  const listRef      = useRef(null)
  const dragRef      = useRef(null)
  const prevPos      = useRef({})

  useEffect(() => {
    chrome.storage.local.get(['tasks'], result => setTasks(result.tasks || []))
  }, [])

  function snapshotPositions() {
    if (!listRef.current) return
    listRef.current.querySelectorAll('.todo-card').forEach(el => {
      prevPos.current[el.dataset.id] = el.getBoundingClientRect().top
    })
  }

  useLayoutEffect(() => {
    if (!listRef.current) return
    const snap = prevPos.current
    if (!Object.keys(snap).length) return
    prevPos.current = {}
    listRef.current.querySelectorAll('.todo-card:not(.is-dragging)').forEach(el => {
      const id = el.dataset.id
      if (snap[id] === undefined) return
      const dy = snap[id] - el.getBoundingClientRect().top
      if (Math.abs(dy) < 1) return
      el.style.transition = 'none'
      el.style.transform  = `translateY(${dy}px)`
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform 0.18s ease'
        el.style.transform  = 'translateY(0)'
      }))
    })
  })

  function saveTasks(updated) {
    setTasks(updated)
    chrome.storage.local.set({ tasks: updated })
  }

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 220)
  }

  function openNew()      { setEditingTask(null); setShowNewModal(true) }
  function openEdit(task) { setEditingTask(task); setShowNewModal(true) }
  function closeModal()   { setShowNewModal(false); setEditingTask(null) }

  function handleSave(data) {
    if (editingTask) {
      saveTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...data } : t))
    } else {
      const newTask = { ...data, id: crypto.randomUUID(), pinned: false, createdAt: Date.now() }
      saveTasks([...tasks.filter(t => t.pinned), ...tasks.filter(t => !t.pinned), newTask])
    }
    closeModal()
  }

  function handlePin(id) {
    snapshotPositions()
    const updated = tasks.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t)
    saveTasks([...updated.filter(t => t.pinned), ...updated.filter(t => !t.pinned)])
  }

  function handleDeleteConfirm() {
    saveTasks(tasks.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const orderedTasks = [...tasks.filter(t => t.pinned), ...tasks.filter(t => !t.pinned)]
  const pinnedCount  = tasks.filter(t => t.pinned).length

  // Live-preview order during drag
  const displayTasks = (() => {
    if (draggingId === null || dragInsertIdx === null) return orderedTasks
    const dragged = orderedTasks.find(t => t.id === draggingId)
    if (!dragged) return orderedTasks
    const without = orderedTasks.filter(t => t.id !== draggingId)
    const result  = [...without]
    result.splice(Math.min(dragInsertIdx, without.length), 0, dragged)
    return result
  })()

  // How many pinned items sit in the list ignoring the dragged card
  const pinnedWithout = draggingId
    ? orderedTasks.filter(t => t.id !== draggingId && t.pinned).length
    : pinnedCount
  // Divider renders after this many items
  const dividerPos = pinnedWithout

  function startDrag(e, taskId) {
    e.preventDefault()
    const srcIdx = orderedTasks.findIndex(t => t.id === taskId)
    dragRef.current = { taskId, insertIdx: srcIdx }
    setDraggingId(taskId)
    setDragInsertIdx(srcIdx)
    document.body.style.cursor = 'grabbing'

    function onMove(ev) {
      if (!listRef.current || !dragRef.current) return
      // Exclude the dragged card so its own position doesn't skew the calculation
      const others = Array.from(listRef.current.querySelectorAll('.todo-card:not(.is-dragging)'))
      let newInsert = 0
      for (let i = 0; i < others.length; i++) {
        const rect = others[i].getBoundingClientRect()
        if (ev.clientY > rect.top + rect.height / 2) newInsert = i + 1
      }
      if (newInsert !== dragRef.current.insertIdx) {
        snapshotPositions()
        dragRef.current.insertIdx = newInsert
        setDragInsertIdx(newInsert)
      }
    }

    function onUp() {
      document.body.style.cursor = ''
      if (!dragRef.current) return
      const { taskId, insertIdx } = dragRef.current
      dragRef.current = null
      snapshotPositions()
      setDraggingId(null)
      setDragInsertIdx(null)
      commitDrag(taskId, insertIdx)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function commitDrag(taskId, insertIdx) {
    const dragged = orderedTasks.find(t => t.id === taskId)
    if (!dragged) return
    const without     = orderedTasks.filter(t => t.id !== taskId)
    const pinnedWO    = without.filter(t => t.pinned).length
    const becomePinned = insertIdx < pinnedWO
    const newList = [...without]
    newList.splice(Math.min(insertIdx, newList.length), 0, { ...dragged, pinned: becomePinned })
    saveTasks([...newList.filter(t => t.pinned), ...newList.filter(t => !t.pinned)])
  }

  return (
    <>
      <div className={`tasks-screen ${closing ? 'tasks-closing' : 'tasks-opening'}`}>
        <div className="tasks-header">
          <button className="tasks-back-btn" onClick={handleClose}>
            <span className="back-text">← Back</span>
          </button>
          <div className="tasks-title-pill">
            <span className="tasks-title">To-Dos</span>
          </div>
          <button className="tasks-new-pill" onClick={openNew}>+ New</button>
        </div>

        <div className="tasks-list" ref={listRef}>
          {displayTasks.length === 0 && (
            <p className="tasks-empty">No tasks yet... hit "+ New" and get started!</p>
          )}
          {displayTasks.map((task, idx) => (
            <div key={task.id}>
              {idx === 0 && dividerPos > 0 && (
                <div className="list-divider">
                  <div className="divider-line" />
                  <span className="divider-label">Priorities</span>
                  <div className="divider-line" />
                </div>
              )}
              {idx === dividerPos && dividerPos > 0 && dividerPos < displayTasks.length && (
                <div className="list-divider">
                  <div className="divider-line" />
                  <span className="divider-label">Other</span>
                  <div className="divider-line" />
                </div>
              )}
              <TodoCard
                task={task}
                isDragging={task.id === draggingId}
                onDragHandleDown={e => startDrag(e, task.id)}
                onPin={handlePin}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onStart={setStartTarget}
              />
            </div>
          ))}
        </div>
      </div>

      {showNewModal && (
        <NewModal onClose={closeModal} onSave={handleSave} editTask={editingTask} />
      )}

      {deleteTarget && (
        <DeleteConfirm
          task={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {startTarget && (
        <StartConfirmModal
          task={startTarget}
          onClose={() => setStartTarget(null)}
          onBegin={(focusMode) => {
            const task = startTarget
            setStartTarget(null)
            onBeginTask(task, focusMode)
          }}
        />
      )}
    </>
  )
}
