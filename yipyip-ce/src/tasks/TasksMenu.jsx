import { FiCheckSquare, FiChevronRight, FiMessageCircle } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import './TasksMenu.css'

const noop = () => {}
export default function TasksMenu({ coins = 0, activeWork, onBack = noop, onConversations = noop, onWork = noop }) {
  return <PanelScreen title="Tasks" coins={coins} onBack={onBack} className="tasks-menu">
    <div className="tasks-menu-intro">
      <h3>What would you like to work on?</h3>
      <p className="panel-description">Build your conversation skills or take a step toward getting something done.</p>
    </div>
    <button className="tasks-menu-option tasks-menu-conversations" aria-label="Work on conversations" onClick={onConversations}>
      <span className="tasks-menu-icon" aria-hidden="true"><FiMessageCircle /></span>
      <span className="tasks-menu-copy"><strong>Work on conversations</strong><small>Practice social skills with guided conversation lessons.</small></span>
      <FiChevronRight className="tasks-menu-chevron" aria-hidden="true" />
    </button>
    <button className="tasks-menu-option tasks-menu-work" aria-label="Get tasks done" onClick={onWork}>
      <span className="tasks-menu-icon" aria-hidden="true"><FiCheckSquare /></span>
      <span className="tasks-menu-copy"><strong>Get tasks done</strong><small>Plan a task, work alongside your companion, and earn rewards.</small>{activeWork && <span className="tasks-menu-resume">Resume your work session</span>}</span>
      <FiChevronRight className="tasks-menu-chevron" aria-hidden="true" />
    </button>
  </PanelScreen>
}
