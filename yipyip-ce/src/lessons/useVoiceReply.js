import { useEffect, useRef, useState } from 'react'
import { requestMedia, mediaAccessError } from '../media/access.js'
import { connectLiveVoice } from '../media/liveVoice.js'

export function useVoiceReply(onTranscript) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const permission = useRef(null), session = useRef(null), generation = useRef(0), callback = useRef(onTranscript)
  callback.current = onTranscript
  function dispose() { generation.current++; permission.current?.abort(); session.current?.cancel(); session.current = null }
  function cancel() { dispose(); setStatus('idle'); setError('') }
  useEffect(() => dispose, [])
  async function start() {
    dispose()
    const current = generation.current
    permission.current = new AbortController()
    setError(''); setStatus('requesting')
    try {
      const media = await requestMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 } }, video: false }, { signal: permission.current.signal })
      if (current !== generation.current) { media.getTracks().forEach(track => track.stop()); return }
      try {
        session.current = connectLiveVoice(media, {
          onStatus: value => { if (current === generation.current) setStatus(value) },
          onTranscript: value => { if (current === generation.current) callback.current(value, false) },
          onComplete: value => { if (current === generation.current) { setStatus('idle'); callback.current(value, true) } },
          onError: message => { if (current === generation.current) { setError(message); setStatus('idle') } },
        })
      } catch (error) { media.getTracks().forEach(track => track.stop()); throw error }
    } catch (error) {
      if (current === generation.current) { setError(mediaAccessError(error, 'Microphone')); setStatus('idle') }
    }
  }
  return { status, error, start, stop: () => session.current?.stop(), cancel }
}
