import { requestMedia, mediaAccessError } from '../media/access.js'
import { loadVisualDetector } from './detector.js'

// Owns the optional preview. Raw observations are transient and local only.
export function startVisualCapture({ onState, onSample = () => {}, onPreview = () => {}, environment = globalThis, getMedia = requestMedia, loadDetector = loadVisualDetector }) {
  const { document, performance } = environment
  const controller = new AbortController()
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true
  let stream, detector, timer, preview, disposed = false, recording = false, inFlight = false, epoch = 0
  let lastFrame = -1, lastFrameAt = 0
  function emit(status, extra = {}) { if (!disposed) onState({ status, faceVisible: false, handsVisible: null, videoWidth: video.videoWidth || 640, videoHeight: video.videoHeight || 480, error: '', ...extra }) }
  function release() {
    onPreview(null)
    controller.abort()
    environment.clearInterval(timer)
    document.removeEventListener('visibilitychange', visibility)
    stream?.getTracks().forEach(track => track.stop()); stream = null
    video.pause(); video.srcObject = null
    if (preview) preview.srcObject = null
    detector?.close(); detector = null
  }
  function fail(error) { if (disposed) return; emit('error', { error: mediaAccessError(error, 'Camera') }); disposed = true; epoch++; release() }
  function visibility() {
    epoch++; lastFrame = video.currentTime; lastFrameAt = performance.now()
    emit(document.visibilityState === 'hidden' ? 'paused' : 'framing')
    onPreview(null)
  }
  async function sample() {
    if (disposed) return
    const track = stream?.getVideoTracks()[0]
    if (!track || track.readyState !== 'live') { fail(new Error('Camera disconnected. Reconnect it and retry.')); return }
    if (document.visibilityState === 'hidden') { emit('paused'); onPreview(null); return }
    const now = performance.now()
    if (track.muted || video.readyState < 2 || video.currentTime === lastFrame) {
      if (track.muted || now - lastFrameAt > 1000) { epoch++; emit('framing'); onPreview(null) }
      return
    }
    if (inFlight) return
    lastFrame = video.currentTime; lastFrameAt = now
    const currentEpoch = epoch
    inFlight = true
    try {
      const observation = await detector.detect(video, now)
      if (disposed || epoch !== currentEpoch) return
      if (performance.now() - now > 1000 || track.muted || document.visibilityState === 'hidden') { emit('framing'); onPreview(null); return }
      const faceVisible = observation.faceLandmarks?.length > 0
      emit(faceVisible ? 'tracking' : 'framing', { faceVisible, handsVisible: observation.handLandmarks?.length ?? 0 })
      onPreview(observation)
      if (recording) onSample({ timestamp: now, ...observation })
    } catch (error) { if (!disposed) fail(error) }
    finally { inFlight = false }
  }
  function attach(node) { preview = node; if (node && stream) { node.srcObject = stream; node.play().catch(() => {}) } }
  emit('loading')
  const ready = (async () => {
    try {
      const acquired = await getMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }, { signal: controller.signal })
      if (disposed) { acquired.getTracks().forEach(track => track.stop()); return }
      stream = acquired
      stream.getVideoTracks()[0]?.addEventListener('ended', () => fail(new Error('Camera disconnected. Reconnect it and retry.')))
      video.srcObject = stream; await video.play()
      if (disposed) return
      attach(preview)
      const loaded = await loadDetector({ signal: controller.signal })
      if (disposed) { loaded.close(); return }
      detector = loaded; lastFrameAt = performance.now()
      document.addEventListener('visibilitychange', visibility)
      emit(recording ? 'framing' : 'ready')
      timer = environment.setInterval(sample, 200)
    } catch (error) { if (!disposed) fail(error) }
  })()
  return { ready, attach,
    setRecording(value) { if (disposed) return; recording = value === true; epoch++; lastFrame = -1; lastFrameAt = performance.now();  },
    stop() { if (disposed) return; disposed = true; epoch++; release() },
  }
}
