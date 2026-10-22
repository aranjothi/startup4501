import { useState } from 'react'
import { FiCheck, FiChevronRight, FiTarget, FiSliders, FiGrid, FiClock, FiMessageSquare, FiChevronDown } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import { localDayKey } from './calendar.js'
import { TOPICS, lessonFeed } from './catalog.js'
import TopicIcon from './TopicIcon'
import './Lessons.css'
export default function LessonFeed({ profile, completions, coins, onBack, onLesson, onPreferences }) {
  const [all, setAll] = useState(false)
  const completed = new Set(completions.map(item => item.lessonId))
  const sections = lessonFeed(all ? { topics: TOPICS.map(topic => topic.id) } : profile, completions)
  return <PanelScreen title="Practice" coins={coins} onBack={onBack}>
    <div className="feed-toolbar"><span className="panel-description daily-goal"><FiTarget aria-hidden="true" />{completions.filter(item => item.dayKey === localDayKey()).length} / {profile?.dailyGoal ?? 1} today</span><button className="lesson-text-button" onClick={onPreferences}><FiSliders aria-hidden="true" />Edit focus</button><button className="lesson-text-button" onClick={() => setAll(value => !value)}><FiGrid aria-hidden="true" />{all ? 'My topics' : 'All topics'}</button></div>
    {sections.map((section, index) => <details className="panel-card lesson-section" key={section.id} data-topic={section.id} open={index === 0 ? true : undefined}>
      <summary><span className="topic-icon-badge"><TopicIcon topicId={section.id} /></span><span><strong>{section.title}</strong><small>{section.lessons.filter(lesson => completed.has(lesson.id)).length} / {section.lessons.length} completed</small></span><FiChevronDown className="section-chevron" aria-hidden="true" /></summary>
      <div className="lesson-list">{section.lessons.map(lesson => <button className="lesson-row" key={lesson.id} onClick={() => onLesson(lesson.id)}><span className="lesson-number">{completed.has(lesson.id) ? <FiCheck /> : lesson.level}</span><span><strong>{lesson.title}</strong><small className="lesson-meta"><span><FiClock aria-hidden="true" />{lesson.minutes} min</span><span><FiMessageSquare aria-hidden="true" />{lesson.requiredReplies} exchanges</span></small></span><FiChevronRight /></button>)}</div>
    </details>)}
  </PanelScreen>
}
