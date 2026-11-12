import { useCallback, useEffect, useRef, useState } from 'react'
import { startVisualCapture } from './capture.js'
import { createVisualReplySession } from './summary.js'
import { paintTracking } from './overlay.js'

export function useVisualFeedback(enabled, onSample = () => {}) {
  const [state, setState] = useState({ status: 'off', error: '', handsVisible: null })
  const [attempt, setAttempt] = useState(0)
  const capture = useRef(null), preview = useRef(null), recording = useRef(false), sampleCallback = useRef(onSample)
  const overlay = useRef(null), lastPreview = useRef(null), reply = useRef(null), enabledRef = useRef(enabled)
  reply.current ??= createVisualReplySession()
  enabledRef.current = enabled
  sampleCallback.current = onSample
  useEffect(() => {
    if (!enabled) { reply.current.cancel(); setState({ status: 'off', error: '', handsVisible: null }); return }
    const session = startVisualCapture({ onState: setState,
      onSample: value => { reply.current.sample(value); sampleCallback.current(value) },
      onPreview: value => { lastPreview.current = value; paintTracking(overlay.current, value) },
    })
    capture.current = session
    session.attach(preview.current); session.setRecording(recording.current)
    if (recording.current) reply.current.status('recording')
    return () => { session.stop(); capture.current = null; paintTracking(overlay.current, null) }
  }, [enabled, attempt])
  const previewRef = useCallback(node => { preview.current = node; capture.current?.attach(node) }, [])
  const overlayRef = useCallback(node => { overlay.current = node; paintTracking(node, lastPreview.current) }, [])
  const onVoiceStatus = useCallback((status, reason) => {
    recording.current = status === 'recording'
    if (enabledRef.current) reply.current.status(status, reason)
    else reply.current.cancel()
    capture.current?.setRecording(recording.current)
  }, [])
  const takeSummary = useCallback(() => enabledRef.current ? reply.current.take() : null, [])
  return { ...state, previewRef, overlayRef, onVoiceStatus, takeSummary, retry: () => setAttempt(value => value + 1) }
}
