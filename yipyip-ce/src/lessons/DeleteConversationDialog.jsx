import { useEffect, useRef } from 'react'
import { FiTrash2 } from 'react-icons/fi'

export default function DeleteConversationDialog({ title, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const panel = dialog.current?.closest('.panel-screen')
    dialog.current?.querySelector('button')?.focus()
    return () => {
      if (previous?.isConnected) previous.focus?.()
      else panel?.querySelector('.daily-lessons h3')?.focus()
    }
  }, [])
  function keyboard(event) {
    if (event.key === 'Escape') { event.preventDefault(); if (!busy) onCancel(); return }
    if (event.key !== 'Tab') return
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')]
    if (!buttons.length) { event.preventDefault(); return }
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus() }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus() }
  }
  return <div className="history-delete-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onCancel() }}>
    <section ref={dialog} className="history-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-conversation-title" aria-describedby="delete-conversation-description" aria-busy={busy} onKeyDown={keyboard}>
      <span className="history-delete-icon" aria-hidden="true"><FiTrash2 /></span>
      <h2 id="delete-conversation-title">Delete conversation?</h2>
      <p id="delete-conversation-description">“{title}” and its feedback will be permanently removed from your history. Your calendar and streaks will update.</p>
      <p className="history-delete-rewards">Your earned coins and XP stay.</p>
      {error && <p className="lesson-error" role="alert">{error}</p>}
      <div className="history-delete-actions">
        <button className="history-delete-cancel" disabled={busy} onClick={onCancel}>Keep conversation</button>
        <button className="history-delete-confirm" disabled={busy} onClick={onConfirm}><FiTrash2 aria-hidden="true" />{busy ? 'Deleting…' : 'Delete'}</button>
      </div>
    </section>
  </div>
}
