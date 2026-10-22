import { useState } from 'react'
import TopicIcon from './TopicIcon'

const PALETTES = [
  { background: '#233d73', text: '#f3f6ff', label: '#c9d9ff', border: '#456299' },
  { background: '#225a60', text: '#effdff', label: '#c2e7eb', border: '#428088' },
  { background: '#494378', text: '#f7f4ff', label: '#dcd4ff', border: '#6d659b' },
  { background: '#684465', text: '#fff3fd', label: '#ebcde7', border: '#8d6889' },
]

export default function RecommendedLesson({ lesson, onOpen }) {
  // Keep the random choice steady through state refreshes and pet animations.
  const [palette] = useState(() => PALETTES[Math.floor(Math.random() * PALETTES.length)])
  return <button className="recommended-lesson" data-topic={lesson.topicId} onClick={() => onOpen(lesson.id)} style={{ '--recommend-bg': palette.background, '--recommend-text': palette.text, '--recommend-label': palette.label, '--recommend-border': palette.border }}>
    <span>Next recommended lesson</span><strong>{lesson.title}</strong><span className="recommended-topic-icon topic-icon-badge"><TopicIcon topicId={lesson.topicId} /></span>
  </button>
}
