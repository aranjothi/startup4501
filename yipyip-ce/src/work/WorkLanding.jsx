import { FiPlus } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi2'
import { WORK_QUESTIONS } from './landing.js'
const noop = () => {}

export default function WorkLanding({ question = WORK_QUESTIONS[0], busy = false, onManual = noop, onOpenSuggest = noop, onOpenQuiet = noop }) {
  return <section className="work-landing" aria-label="Work options">
    <h3 className="work-question">{question}</h3>
    <div className="work-landing-choices">
      <button type="button" className="work-choice-pill work-choice-create" disabled={busy} onClick={onManual}><FiPlus aria-hidden="true" /><span>Create Task</span></button>
      <button type="button" className="work-choice-pill work-choice-suggest" disabled={busy} onClick={onOpenSuggest}><HiSparkles aria-hidden="true" /><span>Suggest Task</span></button>
      <button type="button" className="work-quiet-link" disabled={busy} onClick={onOpenQuiet}>No Task, Just Work</button>
    </div>
  </section>
}
