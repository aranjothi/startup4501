import { useEffect, useRef, useState } from 'react'
import { MAX_RECORDING_SECONDS } from './scenarios.js'
import { requestMedia, mediaAccessError } from '../media/access.js'

export function useRecording(videoRef) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [recording, setRecording] = useState(null)
  const stream = useRef(null)
  const recorder = useRef(null)
  const started = useRef(0)
  const interval = useRef(null)
  const timeout = useRef(null)
  const generation = useRef(0)
  const aborted = useRef(false)
  const permission = useRef(null)

  function release() {
    clearInterval(interval.current)
    clearTimeout(timeout.current)
    stream.current?.getTracks().forEach(track => { track.onended = null; track.stop() })
    stream.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }
  useEffect(() => () => {
    permission.current?.abort()
    generation.current += 1
    aborted.current = true
    if (recorder.current?.state === 'recording') recorder.current.stop()
    release()
  }, [])

  async function prepare() {
    const attempt = ++generation.current
    permission.current?.abort(); permission.current = new AbortController()
    aborted.current = false
    setStatus('requesting')
    setError('')
    setRecording(null)
    setElapsed(0)
    release()
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Recording is not available here. Open YipYip in an up-to-date Chrome browser.')
      const media = await requestMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true },
      }, { signal: permission.current.signal })
      if (attempt !== generation.current) { media.getTracks().forEach(track => track.stop()); return }
      stream.current = media
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
      if (attempt !== generation.current) return
      media.getTracks().forEach(track => { track.onended = () => {
        if (recorder.current?.state === 'recording') stop()
        else { release(); setStatus('idle'); setError('Camera or microphone disconnected. Reconnect it and try again.') }
      } })
      setStatus('ready')
    } catch (err) {
      if (attempt !== generation.current) return
      release()
      setStatus('idle')
      const messages = {
        NotAllowedError: mediaAccessError(err, 'Camera and microphone'),
        AbortError: mediaAccessError(err, 'Camera and microphone'),
        NotFoundError: 'No camera or microphone was found. Connect both devices and try again.',
        NotReadableError: 'Your camera or microphone is busy. Close other apps using it and try again.',
      }
      setError(messages[err.name] ?? err.message)
    }
  }

  function stop() {
    if (recorder.current?.state !== 'recording') return
    clearInterval(interval.current)
    clearTimeout(timeout.current)
    setStatus('stopping')
    recorder.current.stop()
  }
  function start(limitSeconds) {
    try {
      if (!stream.current || stream.current.getTracks().some(track => track.readyState !== 'live')) throw new Error('Enable your camera and microphone again before recording.')
      aborted.current = false
      const chunks = []
      let bytes = 0
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type))
      const options = { videoBitsPerSecond: 1200000, audioBitsPerSecond: 64000, ...(mimeType ? { mimeType } : {}) }
      const capture = new MediaRecorder(stream.current, options)
      recorder.current = capture
      capture.ondataavailable = event => {
        if (event.data.size > 0) { chunks.push(event.data); bytes += event.data.size }
        if (bytes > 100 * 1024 * 1024) stop()
      }
      capture.onerror = () => {
        aborted.current = true
        release()
        setError('Recording failed. Please enable your camera and try again.')
        setStatus('idle')
      }
      capture.onstop = () => {
        const duration = (performance.now() - started.current) / 1000
        release()
        if (aborted.current) return
        const blob = new Blob(chunks, { type: capture.mimeType || 'video/webm' })
        if (!blob.size) { setError('The recording was empty. Please try again.'); setStatus('idle'); return }
        setElapsed(duration)
        setRecording({ blob, duration })
        setStatus('recorded')
      }
      started.current = performance.now()
      capture.start(1000)
      setStatus('recording')
      setElapsed(0)
      interval.current = setInterval(() => setElapsed((performance.now() - started.current) / 1000), 250)
      timeout.current = setTimeout(stop, Math.min(limitSeconds, MAX_RECORDING_SECONDS) * 1000)
    } catch (err) {
      release()
      setError(err.message)
      setStatus('idle')
    }
  }
  function reset() {
    permission.current?.abort()
    generation.current += 1
    aborted.current = true
    if (recorder.current?.state === 'recording') recorder.current.stop()
    release()
    setRecording(null)
    setStatus('idle')
    setElapsed(0)
    setError('')
  }
  return { status, error, elapsed, recording, prepare, start, stop, reset }
}
