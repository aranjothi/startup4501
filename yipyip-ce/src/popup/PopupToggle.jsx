import { useState } from 'react'
import yipyipLogo from '../assets/ui/yipyip_logo.png'
import './PopupToggle.css'

export default function PopupToggle() {
  const [error, setError] = useState('')
  function openPanel() {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
      .then(() => window.close()).catch(err => setError(err.message))
  }
  return <main className="popup-root conversation-popup">
    <div className="popup-pill popup-header"><img src={yipyipLogo} alt="" className="popup-logo-img" /><span className="popup-logo">YipYip</span></div>
    <button className="popup-practice-button" onClick={openPanel}>Open YipYip</button>
    {error && <p className="popup-error" role="alert">{error}</p>}
  </main>
}
