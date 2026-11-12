import { useState } from 'react'
import { FiCheck, FiChevronRight, FiSliders, FiGrid, FiClock, FiMessageSquare, FiChevronDown } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import { dailyGoalProgress, localDayKey } from './calendar.js'
import { TOPICS, lessonFeed } from './catalog.js'
import TopicIcon from './TopicIcon'
import './Lessons.css'
export default function LessonFeed({ profile, completions, coins, onBack, onLesson, onPreferences }) {
  const [all, setAll] = useState(false)
  const completed = new Set(completions.map(item => item.lessonId))
  const today = localDayKey()
  const completedToday = completions.filter(item => item.dayKey === today).length
  const progress = dailyGoalProgress(completedToday, profile?.dailyGoal)
  const sections = lessonFeed(all ? { topics: TOPICS.map(topic => topic.id) } : profile, completions)
  return <PanelScreen title="Converse" coins={coins} onBack={onBack} className="converse-screen">
    <section className="converse-overview" aria-label="Daily conversation goal">
      <figure className="converse-goal">
        <div className="converse-goal-pie" role="img" aria-label={`${progress.completed} of ${progress.goal} conversational lessons completed today`} style={{ '--goal-progress': `${progress.fraction * 100}%` }}><span className="converse-goal-fraction" aria-hidden="true">{`${progress.completed}/${progress.goal}`}</span></div>
        <figcaption><strong>{progress.caption}</strong></figcaption>
      </figure>
      <ConversationOptions all={all} onPreferences={onPreferences} onToggleTopics={() => setAll(value => !value)} />
    </section>
    {sections.map((section, index) => <details className="panel-card lesson-section" key={section.id} data-topic={section.id} open={index === 0 ? true : undefined}>
      <summary><span className="topic-icon-badge"><TopicIcon topicId={section.id} /></span><span><strong>{section.title}</strong><small>{section.lessons.filter(lesson => completed.has(lesson.id)).length} / {section.lessons.length} completed</small></span><FiChevronDown className="section-chevron" aria-hidden="true" /></summary>
      <div className="lesson-list">{section.lessons.map(lesson => <button className="lesson-row" key={lesson.id} onClick={() => onLesson(lesson.id)}><span className="lesson-number">{completed.has(lesson.id) ? <FiCheck /> : lesson.level}</span><span><strong>{lesson.title}</strong><small className="lesson-meta"><span><FiClock aria-hidden="true" />{lesson.minutes} min</span><span><FiMessageSquare aria-hidden="true" />{lesson.requiredReplies} exchanges</span></small></span><FiChevronRight /></button>)}</div>
    </details>)}
  </PanelScreen>
}

export function ConversationOptions({ all = false, onPreferences, onToggleTopics }) {
  return <fieldset className="converse-options">
    <legend>Options</legend>
    <button className="lesson-text-button" onClick={onPreferences}><FiSliders aria-hidden="true" />Edit focus</button>
    <button className="lesson-text-button converse-all-topics" aria-pressed={all} onClick={onToggleTopics}>
      <FiGrid aria-hidden="true" /><span>All topics</span><span className="converse-option-check" aria-hidden="true"><FiCheck /></span>
    </button>
  </fieldset>
}
