import { useCallback, useEffect, useRef, useState } from 'react'
import { startPresenceCamera } from './presenceCamera.js'

export default function useWorkCamera(enabled) {
  const [state, setState] = useState({ status: 'off', present: false, error: '' })
  const [attempt, setAttempt] = useState(0)
  const capture = useRef(null), preview = useRef(null)
  const presenceRef = useRef(state)
  useEffect(() => {
    if (!enabled) { presenceRef.current = { status: 'off', present: false, error: '' }; setState(presenceRef.current); return }
    const camera = startPresenceCamera({ onState: value => { presenceRef.current = value; setState(value) } })
    capture.current = camera; camera.attach(preview.current)
    return () => { camera.stop(); capture.current = null; presenceRef.current = { status: 'off', present: false, error: '' } }
  }, [enabled, attempt])
  const previewRef = useCallback(node => { preview.current = node; capture.current?.attach(node) }, [])
  return { ...state, presenceRef, previewRef, retry: () => setAttempt(value => value + 1) }
}
