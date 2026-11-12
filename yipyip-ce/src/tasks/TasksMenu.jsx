import { FiCheckSquare, FiChevronRight, FiMessageCircle } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import './TasksMenu.css'

const noop = () => {}
export default function TasksMenu({ coins = 0, activeWork, onBack = noop, onConversations = noop, onWork = noop }) {
  return <PanelScreen title="Tasks" coins={coins} onBack={onBack} className="tasks-menu">
    <button className="tasks-menu-option tasks-menu-conversations" aria-label="Work on conversations" onClick={onConversations}>
      <span className="tasks-menu-icon" aria-hidden="true"><FiMessageCircle /></span>
      <span className="tasks-menu-copy"><strong>Converse</strong><small>Build conversation skills</small></span>
      <FiChevronRight className="tasks-menu-chevron" aria-hidden="true" />
    </button>
    <button className="tasks-menu-option tasks-menu-work" aria-label="Get tasks done" onClick={onWork}>
      <span className="tasks-menu-icon" aria-hidden="true"><FiCheckSquare /></span>
      <span className="tasks-menu-copy"><strong>Get tasks done</strong><small>Focus, finish, earn rewards</small></span>
      {activeWork && <span className="tasks-menu-resume" aria-label="Resume your work session">Resume</span>}
      <FiChevronRight className="tasks-menu-chevron" aria-hidden="true" />
    </button>
  </PanelScreen>
}
