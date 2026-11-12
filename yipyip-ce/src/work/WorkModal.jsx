import { useEffect, useId, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'

export default function WorkModal({ title, busy, onClose, onRequestClose, children }) {
  const [closing, setClosing] = useState(false)
  const dialog = useRef(null)
  const timer = useRef(null)
  const closingRef = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement
    return () => {
      clearTimeout(timer.current)
      if (previous?.isConnected) previous.focus()
      else document.querySelector('.work-focus h3')?.focus()
    }
  }, [])
  useEffect(() => {
    const first = dialog.current?.querySelector('input:not(:disabled), textarea:not(:disabled)')
    ;(first || dialog.current)?.focus()
  }, [title])

  function close(afterClose) {
    if (busy || closingRef.current) return
    closingRef.current = true
    onRequestClose?.()
    setClosing(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timer.current = setTimeout(() => {
      onClose()
      if (typeof afterClose === 'function') afterClose()
    }, reduced ? 0 : 180)
  }
  function keyDown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    if (event.key !== 'Tab') return
    const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')]
      .filter(element => element.getClientRects().length > 0)
    const first = controls[0], last = controls.at(-1)
    if (!first) { event.preventDefault(); dialog.current.focus(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
  }

  return <div className={`work-modal-backdrop ${closing ? 'is-closing' : ''}`} onClick={event => { if (event.target === event.currentTarget) close() }}>
    <section className="work-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy || undefined} tabIndex={-1} ref={dialog} onKeyDown={keyDown}>
      <header className="work-modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="work-icon-button" aria-label={`Close ${title}`} disabled={busy || closing} onClick={close}><FiX aria-hidden="true" /></button>
      </header>
      <div className="work-modal-content" key={title}>{children(close, closing)}</div>
    </section>
  </div>
}
