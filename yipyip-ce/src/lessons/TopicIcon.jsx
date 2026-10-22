import { FiMessageCircle, FiUserPlus, FiClipboard, FiBriefcase, FiShield, FiMic } from 'react-icons/fi'

const ICONS = {
  everyday: FiMessageCircle,
  introductions: FiUserPlus,
  interview: FiClipboard,
  workplace: FiBriefcase,
  difficult: FiShield,
  speaking: FiMic,
}

export default function TopicIcon({ topicId, className = '' }) {
  const Icon = ICONS[topicId] ?? FiMessageCircle
  return <Icon className={className} aria-hidden="true" focusable="false" />
}
