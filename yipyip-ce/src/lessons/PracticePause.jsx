import { useEffect, useRef } from 'react'
import { FiMessageCircle, FiRotateCcw, FiHome } from 'react-icons/fi'

export default function PracticePause({ feedback, onRetry, onHome, busy, error }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.querySelector('button')?.focus()
    return () => previous?.focus?.()
  }, [])
  function trap(event) {
    if (event.key !== 'Tab') return
    const buttons = [...dialog.current.querySelectorAll('button')]
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus() }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus() }
  }
  return <div className="practice-pause-backdrop">
    <section className="practice-pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-describedby="pause-description" ref={dialog} onKeyDown={trap}>
      <span className="pause-icon" aria-hidden="true"><FiMessageCircle /><span>…</span></span>
      <h2 id="pause-title">Left on Read</h2>
      <p id="pause-description">{feedback?.improvement}</p>
      <div className="pause-tip"><strong>A fresh approach</strong><p>{feedback?.suggestion}</p></div>
      <p className="pause-reassurance">Just a practice moment. You can always try a new approach.</p>
      {error && <p role="alert">{error}</p>}
      <button className="journey-primary" disabled={busy} onClick={onRetry}><FiRotateCcw aria-hidden="true" />{busy ? 'Starting…' : 'Try again'}</button>
      <button className="pause-home" disabled={busy} onClick={onHome}><FiHome aria-hidden="true" />Return to home</button>
    </section>
  </div>
}
