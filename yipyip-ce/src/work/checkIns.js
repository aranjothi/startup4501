// Local companion messages use only elapsed work time and saved checklist data.
// There are no notifications, sounds, model requests, or claims of observing work.
export function checkInMilestones(active) {
  const planned = active.checkInDurationSeconds ?? active.durationSeconds
  return [
    { id: 'start', at: 0, title: 'A small start counts', message: 'Pick one manageable step. You don’t have to tackle everything at once.' },
    { id: 'momentum', at: Math.max(60, Math.ceil(planned / 4)), title: 'One step at a time', message: 'You’ve made some time for this. Keep the next bit small enough to start.' },
    { id: 'halfway', at: Math.max(120, Math.ceil(planned / 2)), title: 'A moment to check in', message: 'How is this feeling? You can keep going, add time, or pause for a breather.' },
    { id: 'steady', at: Math.max(180, Math.ceil(planned * 3 / 4)), title: 'Keep it manageable', message: 'You don’t need a perfect finish. Choose one useful thing to do next.' },
  ]
}
export function currentCheckIn(work, elapsed) {
  const active = work?.active
  if (!active || work.checkInsEnabled === false || active.runningSince === null
    || !Number.isFinite(elapsed) || elapsed < 0 || elapsed >= active.durationSeconds) return null
  const milestone = checkInMilestones(active).filter(item => item.at <= elapsed).at(-1)
  if (!milestone || active.dismissedCheckIns?.includes(milestone.id)) return null
  const task = work.tasks?.find(item => item.id === active.taskId)
  const nextStep = task?.steps.find((_, index) => !task.completedSteps?.includes(index))
  return { id: milestone.id, title: milestone.title, message: milestone.message, ...(nextStep ? { nextStep } : {}) }
}
