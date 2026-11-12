import { useEffect, useRef, useState } from 'react'
import { requestMedia, mediaAccessError } from '../media/access.js'
import { connectLiveVoice } from '../media/liveVoice.js'

export function useVoiceReply(onTranscript, { onStatus } = {}) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const permission = useRef(null), session = useRef(null), generation = useRef(0), callback = useRef(onTranscript)
  const statusCallback = useRef(onStatus)
  statusCallback.current = onStatus
  callback.current = onTranscript
  function changeStatus(value, reason) { setStatus(value); statusCallback.current?.(value, reason) }
  function dispose() { generation.current++; permission.current?.abort(); session.current?.cancel(); session.current = null }
  function cancel() { dispose(); changeStatus('idle', 'cancel'); setError('') }
  useEffect(() => dispose, [])
  async function start() {
    dispose()
    const current = generation.current
    permission.current = new AbortController()
    setError(''); changeStatus('requesting')
    try {
      const media = await requestMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 } }, video: false }, { signal: permission.current.signal })
      if (current !== generation.current) { media.getTracks().forEach(track => track.stop()); return }
      try {
        session.current = connectLiveVoice(media, {
          onStatus: value => { if (current === generation.current) changeStatus(value) },
          onTranscript: value => { if (current === generation.current) callback.current(value, false) },
          onComplete: value => { if (current === generation.current) { changeStatus('idle', 'complete'); callback.current(value, true) } },
          onError: message => { if (current === generation.current) { setError(message); changeStatus('idle', 'error') } },
        })
      } catch (error) { media.getTracks().forEach(track => track.stop()); throw error }
    } catch (error) {
      if (current === generation.current) { setError(mediaAccessError(error, 'Microphone')); changeStatus('idle', 'error') }
    }
  }
  return { status, error, start, stop: () => session.current?.stop(), cancel }
}
