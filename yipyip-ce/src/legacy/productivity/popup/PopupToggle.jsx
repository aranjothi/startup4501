import { useState, useEffect, useRef } from 'react'
import { FaGithub } from 'react-icons/fa'
import { IoMdAlarm } from 'react-icons/io'
import dopalLogo from '../assets/ui/yipyip_logo.png'
import './PopupToggle.css'

function formatSeconds(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PopupToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uiTimer, setUiTimer] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [timerReady, setTimerReady] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    chrome.storage.local.get(['panelEnabled', 'activeUITimer'], ({ panelEnabled, activeUITimer }) => {
      setEnabled(!!panelEnabled)
      setUiTimer(activeUITimer ?? null)
      setLoading(false)
    })

    function onStorageChange(changes) {
      if ('panelEnabled' in changes) setEnabled(!!changes.panelEnabled.newValue)
      if ('activeUITimer' in changes) setUiTimer(changes.activeUITimer.newValue ?? null)
    }
    chrome.storage.onChanged.addListener(onStorageChange)
    return () => chrome.storage.onChanged.removeListener(onStorageChange)
  }, [])

  useEffect(() => {
    clearInterval(intervalRef.current)
    setTimerReady(false)
    if (!uiTimer) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - uiTimer.startedAt) / 1000)
      setSecondsLeft(Math.max(0, uiTimer.totalSeconds - elapsed))
      setTimerReady(true)
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [uiTimer])

  async function toggle() {
    const next = !enabled
    setEnabled(next)
    chrome.storage.local.set({ panelEnabled: next })
    if (next) {
      await chrome.sidePanel.setOptions({ path: 'index.html', enabled: true })
      const win = await chrome.windows.getCurrent()
      await chrome.sidePanel.open({ windowId: win.id })
    } else {
      await chrome.sidePanel.setOptions({ enabled: false })
    }
  }

  async function handleRestore() {
    await chrome.sidePanel.setOptions({ path: 'index.html', enabled: true })
    chrome.storage.local.set({ panelEnabled: true })
    const win = await chrome.windows.getCurrent()
    await chrome.sidePanel.open({ windowId: win.id })
  }

  if (uiTimer) {
    const expired = timerReady && secondsLeft === 0
    return (
      <div className="popup-root">
        <div className="popup-pill popup-header">
          <img src={dopalLogo} alt="DoPal logo" className="popup-logo-img" />
          <span className="popup-logo">DoPal</span>
        </div>

        <div className="popup-pill popup-timer-pill">
          <div className="popup-timer-row">
            <IoMdAlarm className={`popup-timer-icon${expired ? ' popup-timer-expired' : ''}`} />
            <span className="popup-timer-label">{uiTimer.task.title}</span>
            <span className="popup-timer-time">{formatSeconds(secondsLeft)}</span>
          </div>
          <button className="popup-restore-btn" onClick={handleRestore}>
            ▶ Restore Session
          </button>
        </div>

        <a
          href="https://github.com/aranjothi/dopal-ce"
          target="_blank"
          rel="noreferrer"
          className="popup-footer"
        >
          <FaGithub className="popup-github-icon" />
          <span>GitHub</span>
        </a>
      </div>
    )
  }

  return (
    <div className="popup-root">
      <div className="popup-pill popup-header">
        <img src={dopalLogo} alt="DoPal logo" className="popup-logo-img" />
        <span className="popup-logo">DoPal</span>
      </div>

      <div className="popup-pill popup-toggle-row">
        <span className="toggle-label">Toggle Window</span>
        <button
          className={`toggle-switch ${enabled ? 'on' : 'off'}`}
          onClick={toggle}
          disabled={loading}
          aria-label="Toggle side panel"
        >
          <span className="toggle-knob" />
        </button>
      </div>

      <a
        href="https://github.com/aranjothi/dopal-ce"
        target="_blank"
        rel="noreferrer"
        className="popup-footer"
      >
        <FaGithub className="popup-github-icon" />
        <span>GitHub</span>
      </a>
    </div>
  )
}
