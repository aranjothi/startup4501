const cancelled = () => new DOMException('Visual tracking cancelled.', 'AbortError')

export function loadVisualDetector({ signal, environment = globalThis, createWorker = () => new Worker(new URL('./vision.worker.js', import.meta.url)) } = {}) {
  if (signal?.aborted) return Promise.reject(cancelled())
  const worker = createWorker()
  let closed = false, ready = false, nextId = 0, pending = null
  let resolveReady, rejectReady
  const loading = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
  const timeout = environment.setTimeout(() => close(new Error('Visual tracking took too long to load. Please retry.')), 30000)
  const abort = () => close(cancelled())
  function close(error = cancelled()) {
    if (closed) return
    closed = true
    environment.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    worker.terminate()
    if (!ready) rejectReady(error)
    if (pending) { environment.clearTimeout(pending.timer); pending.reject(error); pending = null }
  }
  const detector = {
    async detect(video, timestamp) {
      if (closed) throw cancelled()
      if (pending) throw new Error('A visual frame is already being processed.')
      const bitmap = await environment.createImageBitmap(video)
      if (closed) { bitmap.close(); throw cancelled() }
      return new Promise((resolve, reject) => {
        const id = ++nextId
        pending = { id, resolve, reject, timer: environment.setTimeout(() => close(new Error('Visual tracking stopped responding. Please retry.')), 5000) }
        try { worker.postMessage({ type: 'frame', id, bitmap, timestamp }, [bitmap]) }
        catch (error) { bitmap.close(); close(error) }
      })
    },
    close,
  }
  worker.onmessage = ({ data }) => {
    if (closed) return
    if (data.type === 'error') { close(new Error(data.message || 'Visual tracking is unavailable. Please retry.')); return }
    if (data.type === 'ready' && !ready) {
      ready = true; environment.clearTimeout(timeout); resolveReady(detector)
    }
    if (data.type === 'result' && pending?.id === data.id) {
      const current = pending; pending = null
      environment.clearTimeout(current.timer); current.resolve(data.observation)
    }
  }
  worker.onerror = event => { event.preventDefault?.(); close(new Error('Visual tracking could not start. Please retry.')) }
  worker.onmessageerror = () => close(new Error('Visual tracking lost a frame. Please retry.'))
  signal?.addEventListener('abort', abort, { once: true })
  const asset = path => environment.chrome.runtime.getURL(`mediapipe/${path}`)
  try { worker.postMessage({ type: 'init', assets: { wasm: asset('wasm'), face: asset('face_landmarker.task'), hands: asset('hand_landmarker.task') } }) }
  catch (error) { close(error) }
  return loading
}
