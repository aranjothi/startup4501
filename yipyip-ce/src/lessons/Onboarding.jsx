import { useState } from 'react'
import { FiCheck, FiTarget, FiTrendingUp, FiArrowRight, FiGrid } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import { TOPICS } from './catalog.js'
import TopicIcon from './TopicIcon'
import './Lessons.css'
import './Journey.css'

export default function Onboarding({ profile, coins, onDone, onBack }) {
  const [step, setStep] = useState(0)
  const [topics, setTopics] = useState(profile?.topics ?? [])
  const [confidence, setConfidence] = useState(profile?.confidence ?? 'starting')
  const [dailyGoal, setDailyGoal] = useState(profile?.dailyGoal ?? 1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  function toggle(id) { setTopics(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]) }
  async function finish() {
    setBusy(true); setError('')
    try {
      const result = await chrome.runtime.sendMessage({ type: 'SET_LEARNING_PROFILE', payload: { topics, confidence, dailyGoal } })
      if (result.error) throw new Error(result.error)
      onDone(result.payload)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <PanelScreen title="Your Focus" coins={coins} onBack={() => step ? setStep(0) : onBack?.()} backDisabled={busy || (!step && !onBack)} animateBack={false} className="journey-survey">
    <section className="panel-card survey-card">
      <span className="panel-description">{step + 1} of 2</span>
      <div className="survey-progress" aria-label={`Step ${step + 1} of 2`}><span className="active" /><span className={step ? 'active' : ''} /></div>
      <div className="survey-step" key={step}>
      {!step ? <>
        <h3 className="icon-heading"><FiTarget aria-hidden="true" />What would you like to work on?</h3>
        <p className="panel-description">Choose the topics for your lesson feed.</p>
        <div className="topic-choices">{TOPICS.map(topic => <button key={topic.id} data-topic={topic.id} className={`topic-choice ${topics.includes(topic.id) ? 'selected' : ''}`} aria-pressed={topics.includes(topic.id)} onClick={() => toggle(topic.id)}><span className="topic-icon-badge"><TopicIcon topicId={topic.id} /></span><span><strong>{topic.title}</strong><small>{topic.description}</small></span><FiCheck className="choice-check" aria-hidden="true" /></button>)}</div>
        <button className="panel-action lesson-wide" disabled={!topics.length} onClick={() => setStep(1)}>Continue <FiArrowRight aria-hidden="true" /></button>
      </> : <>
        <h3 className="icon-heading"><FiTrendingUp aria-hidden="true" />Make it your routine</h3>
        <fieldset className="lesson-fieldset"><legend>How do conversations feel right now?</legend>{[['starting', 'I want more confidence'], ['building', 'I’m building my skills'], ['confident', 'I want more of a challenge']].map(([value, label]) => <label className="survey-radio" key={value}><input type="radio" name="confidence" value={value} checked={confidence === value} onChange={() => setConfidence(value)} />{label}</label>)}</fieldset>
        <fieldset className="lesson-fieldset"><legend>Daily lesson goal</legend><div className="lesson-segments">{[1, 2, 3].map(value => <button key={value} aria-pressed={dailyGoal === value} className={dailyGoal === value ? 'selected' : ''} onClick={() => setDailyGoal(value)}>{value} {value === 1 ? 'lesson' : 'lessons'}</button>)}</div></fieldset>
        <button className="panel-action lesson-wide" disabled={busy} onClick={finish}><FiGrid aria-hidden="true" />{busy ? 'Saving…' : 'Build my feed'}</button>
      </>}
      </div>
    </section>
    {error && <p role="alert" className="lesson-error">{error}</p>}
  </PanelScreen>
}
