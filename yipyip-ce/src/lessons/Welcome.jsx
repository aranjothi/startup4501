import { FiArrowRight, FiMessageCircle, FiMic, FiTrendingUp } from 'react-icons/fi'
import happy from '../assets/pet/happy.png'
import './Journey.css'

export default function Welcome({ onStart }) {
  return <section className="welcome-screen" aria-label="Welcome to YipYip">
    <span className="welcome-brand"><FiMessageCircle aria-hidden="true" />YipYip</span>
    <div className="welcome-illustration" aria-hidden="true">
      <span className="welcome-orbit orbit-one"><FiMessageCircle /></span>
      <span className="welcome-orbit orbit-two"><FiMic /></span>
      <span className="welcome-mini-bubble"><i /><i /><i /></span>
      <div className="welcome-pet-disc"><img src={happy} alt="" /></div>
    </div>
    <div className="welcome-copy"><span className="journey-eyebrow">Small steps. Real conversations.</span><h1>Find your<br />conversation spark.</h1><p>A little practice for the moments<br />you want to feel more like you.</p></div>
    <div className="welcome-features"><span><FiMessageCircle />Text</span><span><FiMic />Talk</span><span><FiTrendingUp />Grow</span></div>
    <button className="journey-primary" onClick={onStart}>Let’s get started <FiArrowRight aria-hidden="true" /></button>
    <p className="welcome-footnote">Your pace. Your topics. Your little companion.</p>
  </section>
}
