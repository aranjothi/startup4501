const noop = () => {}

export default function TaskChecklist({ task, disabled = false, onAction = noop }) {
  if (!task?.steps.length) return null
  const count = task.steps.filter((_, index) => task.completedSteps?.includes(index)).length
  return <div className="work-checklist" role="group" aria-label={`${task.title} steps`}>
    <p className="work-checklist-count" role="status">{`${count} of ${task.steps.length} steps done`}</p>
    <progress value={count} max={task.steps.length} aria-label="Checklist progress" />
    <ul>{task.steps.map((text, index) => {
      const checked = task.completedSteps?.includes(index) ?? false
      return <li key={index}><label className={checked ? 'work-step-done' : ''}>
        <input type="checkbox" checked={checked} disabled={disabled || !!task.completedAt}
          onChange={event => onAction('SET_WORK_STEP', { id: task.id, stepIndex: index, stepText: text, completed: event.target.checked })} />
        <span>{text}</span>
      </label></li>
    })}</ul>
  </div>
}

