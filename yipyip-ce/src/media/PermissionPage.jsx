import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FiMic, FiCamera } from 'react-icons/fi'
import { mediaAccessError } from './access.js'
import './permission.css'

const params = new URLSearchParams(location.search)
const id = params.get('id')
const audio = params.get('audio') === 'true'
const video = params.get('video') === 'true'
const label = audio && video ? 'Camera and microphone' : audio ? 'Microphone' : 'Camera'

function PermissionPage() {
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id || (!audio && !video)) { setError('Open device access from a YipYip lesson.'); return }
    const channel = new BroadcastChannel(`yipyip-media-${id}`)
    let active = true
    navigator.mediaDevices.getUserMedia({ audio, video }).then(stream => {
      // This window only obtains consent. Never record or send media from here.
      stream.getTracks().forEach(track => track.stop())
      if (active) channel.postMessage({ id, status: 'granted' })
    }).catch(err => {
      if (active) {
        setError(mediaAccessError(err, label))
        channel.postMessage({ id, status: 'error', name: err.name, message: err.message })
      }
    })
    return () => { active = false; channel.close() }
  }, [])
  return <main>
    <div className="device-icon">{audio ? <FiMic aria-hidden="true" /> : <FiCamera aria-hidden="true" />}</div>
    <h1>{label} access</h1>
    <p role="status">{error || 'Choose Allow or Block in Chrome’s permission prompt.'}</p>
    <button onClick={() => window.close()}>{error ? 'Close' : 'Cancel'}</button>
  </main>
}

createRoot(document.getElementById('root')).render(<PermissionPage />)
