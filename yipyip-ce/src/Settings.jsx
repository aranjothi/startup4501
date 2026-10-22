import { useState } from 'react'
import PanelScreen from './components/PanelScreen'
import { FiSliders, FiDatabase } from 'react-icons/fi'
import './Settings.css'

export default function Settings({ onClose, userState, onApply, onPreferences }) {
  const [name, setName] = useState(userState.pet.name)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await chrome.runtime.sendMessage({ type: 'RENAME_PET', payload: { name } })
      if (result.error) throw new Error(result.error)
      onApply(result.payload)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <PanelScreen title="Settings" coins={userState.coins} onBack={onClose} backDisabled={busy} className="settings-screen">
    <form className="settings-body" onSubmit={save}>
      <div className="panel-card settings-row">
        <label htmlFor="pet-name" className="settings-label">Name</label>
        <input id="pet-name" className="settings-input" value={name} maxLength={24} onChange={event => setName(event.target.value)} />
      </div>
      <button className="panel-action settings-apply-btn" disabled={busy}>{busy ? 'Saving…' : 'Save name'}</button>
      {error && <p className="panel-description" role="alert">{error}</p>}
    </form>
    <button className="panel-card preferences-button" onClick={onPreferences}><strong className="icon-heading"><FiSliders aria-hidden="true" />Lesson preferences</strong><span>Edit topics and daily goal →</span></button>
    <div className="panel-card settings-storage">
      <h3 className="icon-heading"><FiDatabase aria-hidden="true" />Your data</h3>
      <p className="panel-description">Your lesson history, drafts, preferences, and pet progress are saved on this device. Messages and voice audio are sent for processing when you practice. Camera video stays on your device.</p>
      <p className="panel-description">Your saved history powers your calendar and streaks. Removing the extension clears its locally saved data.</p>
    </div>
  </PanelScreen>
}
