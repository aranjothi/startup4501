const cancelled = () => new DOMException('Permission request cancelled.', 'AbortError')

export function mediaAccessError(error, devices = 'Microphone') {
  if (error.name === 'AbortError') return `${devices} access cancelled. You can try again anytime.`
  if (error.name === 'NotAllowedError') return `${devices} access wasn’t allowed. If you previously blocked YipYip, reset that permission in Chrome’s site controls and try again. Also check your system privacy settings.`
  if (error.name === 'NotFoundError') return `No ${devices.toLowerCase()} found. Connect it and try again.`
  if (error.name === 'NotReadableError') return `${devices} is busy or unavailable. Close other apps using it and try again.`
  return error.message || `Couldn’t access ${devices.toLowerCase()}. Try again.`
}

// Side panels cannot reliably display Chrome's native media permission prompt.
// A short-lived extension window obtains consent; recording stays in the sidebar.
export async function requestMedia(constraints, { signal, environment = globalThis } = {}) {
  const { navigator, chrome, location } = environment
  if (signal?.aborted) throw cancelled()
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Media access is unavailable in this browser.')
  const kinds = [constraints.audio && 'microphone', constraints.video && 'camera'].filter(Boolean)
  const states = await Promise.all(kinds.map(async name => {
    try { return (await navigator.permissions.query({ name })).state } catch { return 'prompt' }
  }))
  if (signal?.aborted) throw cancelled()
  if (location?.protocol === 'chrome-extension:' && chrome?.windows?.create && states.some(state => state !== 'granted')) {
    await permissionWindow(kinds, signal, environment)
  }
  if (signal?.aborted) throw cancelled()
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  if (signal?.aborted) { stream.getTracks().forEach(track => track.stop()); throw cancelled() }
  return stream
}

function permissionWindow(kinds, signal, environment) {
  const { chrome, BroadcastChannel, crypto } = environment
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    const channel = new BroadcastChannel(`yipyip-media-${id}`)
    let windowId, settled = false
    const closedWhileOpening = new Set()
    function finish(error) {
      if (settled) return
      settled = true
      channel.close()
      signal?.removeEventListener('abort', abort)
      chrome.windows.onRemoved.removeListener(removed)
      environment.removeEventListener?.('pagehide', abort)
      if (windowId !== undefined) chrome.windows.remove(windowId).catch(() => {})
      if (error) reject(error)
      else resolve()
    }
    const abort = () => finish(cancelled())
    const removed = value => {
      if (windowId === undefined) closedWhileOpening.add(value)
      else if (value === windowId) abort()
    }
    signal?.addEventListener('abort', abort, { once: true })
    environment.addEventListener?.('pagehide', abort, { once: true })
    chrome.windows.onRemoved.addListener(removed)
    channel.onmessage = ({ data }) => {
      if (data?.id !== id) return
      if (data.status === 'granted') finish()
      else if (data.status === 'error') finish(new DOMException(data.message || 'Permission was not granted.', data.name || 'NotAllowedError'))
    }
    const params = new URLSearchParams({ id, audio: String(kinds.includes('microphone')), video: String(kinds.includes('camera')) })
    const width = 340, height = 250, inset = 12
    const screen = environment.screen
    // Use the sidebar's display, including its offset on multi-monitor setups.
    const position = screen?.availWidth ? {
      left: Math.round((screen.availLeft ?? 0) + Math.max(0, screen.availWidth - width - inset)),
      top: Math.round((screen.availTop ?? 0) + inset),
    } : {}
    chrome.windows.create({ url: `${chrome.runtime.getURL('media-permission.html')}?${params}`, type: 'popup', width, height, ...position, focused: true })
      .then(window => {
        windowId = window.id
        if (settled) chrome.windows.remove(windowId).catch(() => {})
        else if (closedWhileOpening.has(windowId)) abort()
      }).catch(finish)
  })
}
