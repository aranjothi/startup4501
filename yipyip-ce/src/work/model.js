// One coin and one XP per whole minute worked, as in Dopal's basic timer.
export const WORK_ACTIONS = ['SAVE_WORK_TASK', 'DELETE_WORK_TASK', 'START_WORK', 'PAUSE_WORK', 'RESUME_WORK', 'EXTEND_WORK', 'FINISH_WORK', 'STOP_WORK']
export const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'description', 'minutes', 'steps'],
  properties: { title: { type: 'string' }, description: { type: 'string' }, minutes: { type: 'integer' }, steps: { type: 'array', items: { type: 'string' } } },
}
function minutesValue(value) {
  if (!Number.isInteger(value) || value < 1 || value > 480) throw new Error('Choose a whole number of minutes between 1 and 480.')
  return value
}
export function validatePlan(value) {
  if (typeof value?.title !== 'string' || !value.title.trim() || value.title.length > 120
    || typeof value.description !== 'string' || value.description.length > 2000
    || !Array.isArray(value.steps) || value.steps.length > 12
    || value.steps.some(step => typeof step !== 'string' || !step.trim() || step.length > 240)) throw new Error('Add a title and up to 12 short steps.')
  return { title: value.title.trim(), description: value.description.trim(), minutes: minutesValue(value.minutes), steps: value.steps.map(step => step.trim()) }
}
export function importLegacyTasks(tasks = []) {
  return tasks.flatMap(task => {
    try {
      const seconds = String(task.timeAllotted ?? '').split(':').map(Number)
      const duration = task.type === 'task' ? (seconds[0] * 3600 + seconds[1] * 60 + seconds[2]) / 60
        : task.breaks ? task.studyInterval * task.numIntervals : task.duration
      return [{ ...validatePlan({ title: task.title, description: task.description ?? '', minutes: Math.max(1, Math.min(480, Math.ceil(duration))), steps: [] }), id: task.id || crypto.randomUUID(), createdAt: task.createdAt ?? Date.now() }]
    } catch { return [] }
  })
}
export function elapsedSeconds(active, now = Date.now()) {
  if (!active) return 0
  return Math.min(active.durationSeconds, Math.max(0, active.elapsedSeconds + (active.runningSince === null ? 0 : Math.max(0, now - active.runningSince) / 1000)))
}
export function workAction(original, { type, payload = {} }, now = Date.now()) {
  const state = structuredClone(original)
  state.work ??= { tasks: [], active: null }
  const work = state.work
  const task = work.tasks.find(item => item.id === payload.id)
  const active = work.active
  switch (type) {
    case 'SAVE_WORK_TASK': {
      const plan = validatePlan(payload)
      if (payload.id && (!task || task.completedAt || active?.taskId === task.id)) throw new Error('This task cannot be edited right now.')
      if (task) Object.assign(task, plan)
      else work.tasks.push({ ...plan, id: crypto.randomUUID(), createdAt: now })
      break
    }
    case 'DELETE_WORK_TASK':
      if (!task || active?.taskId === task.id) throw new Error('Stop this task before removing it.')
      work.tasks = work.tasks.filter(item => item.id !== task.id)
      break
    case 'START_WORK': {
      if (active) throw new Error('Finish or stop your current session first.')
      if (payload.id && (!task || task.completedAt)) throw new Error('Choose an unfinished task.')
      const minutes = minutesValue(task ? task.minutes : payload.minutes)
      const title = task?.title ?? String(payload.title || 'Quiet work').trim().slice(0, 120)
      work.active = { id: crypto.randomUUID(), taskId: task?.id ?? null, title, durationSeconds: minutes * 60, elapsedSeconds: 0, runningSince: now, startedAt: now }
      break
    }
    case 'PAUSE_WORK':
      if (!active || active.runningSince === null) throw new Error('No running session to pause.')
      active.elapsedSeconds = elapsedSeconds(active, now); active.runningSince = null
      break
    case 'RESUME_WORK':
      if (!active || active.runningSince !== null) throw new Error('No paused session to resume.')
      active.runningSince = now
      break
    case 'EXTEND_WORK':
      if (!active) throw new Error('Start a session first.')
      minutesValue(payload.minutes)
      if (active.durationSeconds + payload.minutes * 60 > 480 * 60) throw new Error('Keep each session within 480 minutes.')
      active.elapsedSeconds = elapsedSeconds(active, now)
      if (active.runningSince !== null) active.runningSince = now
      active.durationSeconds += payload.minutes * 60
      break
    case 'FINISH_WORK': {
      if (!active) throw new Error('No session to complete.')
      const seconds = elapsedSeconds(active, now)
      const coins = Math.floor(seconds / 60)
      const finished = { id: active.id, title: active.title, taskId: active.taskId, seconds, coins, completedAt: now }
      work.history = [...(work.history ?? []), finished].slice(-100)
      const activeTask = work.tasks.find(item => item.id === active.taskId)
      if (activeTask) activeTask.completedAt = now
      state.coins += coins
      state.pet.xp += coins
      state.pet.mood = Math.min(100, state.pet.mood + Math.min(5, coins))
      state.pet.lastActiveAt = now
      while (state.pet.xp >= state.pet.level * 100) { state.pet.xp -= state.pet.level * 100; state.pet.level++ }
      work.active = null
      break
    }
    case 'STOP_WORK':
      if (!active) throw new Error('No session to stop.')
      work.active = null
      break
    default: throw new Error('Unknown work request.')
  }
  return state
}
