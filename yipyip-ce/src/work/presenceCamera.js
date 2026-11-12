import { requestMedia, mediaAccessError } from '../media/access.js'
import { loadFaceDetector } from './faceDetector.js'

// Detection stays on-device. Neither camera frames nor landmarks are stored.
export function startPresenceCamera({ onState, environment = globalThis, getMedia = requestMedia, loadDetector = loadFaceDetector }) {
  const { document, performance } = environment
  const controller = new AbortController()
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true
  let stream, detector, timer, preview, disposed = false, present = false
  let absentSince = null, lastFrame = -1, lastFrameAt = 0
  const emit = (status, extra = {}) => { if (!disposed) onState({ status, present, error: '', ...extra }) }
  function release() {
    environment.clearInterval(timer)
    document.removeEventListener('visibilitychange', visibility)
    stream?.getTracks().forEach(track => track.stop()); stream = null
    video.pause(); video.srcObject = null
    if (preview) preview.srcObject = null
    detector?.close(); detector = null
  }
  function fail(error) {
    present = false
    emit('error', { error: mediaAccessError(error, 'Camera') })
    release()
  }
  function visibility() {
    if (document.visibilityState === 'hidden') { present = false; absentSince = null; emit('away') }
  }
  function sample() {
    try {
      const now = performance.now()
      const track = stream?.getVideoTracks()[0]
      if (!track || track.readyState !== 'live') throw new Error('Camera disconnected. Reconnect it and retry.')
      if (document.visibilityState === 'hidden' || track.muted) { present = false; emit('away'); return }
      if (video.readyState < 2 || video.currentTime === lastFrame) {
        if (now - lastFrameAt > 1000) { present = false; emit('away') }
        return
      }
      lastFrame = video.currentTime; lastFrameAt = now
      const found = detector.detectForVideo(video, now).faceLandmarks?.length > 0
      if (found) { present = true; absentSince = null }
      else {
        absentSince ??= now
        if (now - absentSince >= 800) present = false
      }
      emit(present ? 'present' : 'away')
    } catch (error) { fail(error) }
  }
  function attach(node) {
    preview = node
    if (node && stream) { node.srcObject = stream; node.play().catch(() => {}) }
  }
  emit('loading')
  const ready = (async () => {
    try {
      const acquired = await getMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }, { signal: controller.signal })
      if (disposed) { acquired.getTracks().forEach(track => track.stop()); return }
      stream = acquired
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (!disposed) fail(new Error('Camera disconnected. Reconnect it and retry.')) })
      video.srcObject = stream; await video.play()
      if (disposed) return
      attach(preview)
      const loaded = await loadDetector()
      if (disposed) { loaded.close(); return }
      detector = loaded
      lastFrameAt = performance.now()
      document.addEventListener('visibilitychange', visibility)
      emit('away')
      timer = environment.setInterval(sample, 200)
    } catch (error) { if (!disposed) fail(error) }
  })()
  return { ready, attach, stop() { if (disposed) return; disposed = true; controller.abort(); release() } }
}
