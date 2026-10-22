import { serverUrl } from '../lessons/serverUrl.js'
import { speechPause } from './speechPause.js'

export function connectLiveVoice(media, { onStatus, onTranscript, onComplete, onError }, environment = globalThis) {
  const base = serverUrl(import.meta.env?.VITE_AI_SERVER_URL)
  const socket = new environment.WebSocket(`${base.replace(/^http/, 'ws')}/api/voice`)
  const pause = speechPause()
  const schedule = (callback, ms) => (environment.setTimeout ?? globalThis.setTimeout)(callback, ms)
  const unschedule = timer => (environment.clearTimeout ?? globalThis.clearTimeout)(timer)
  const minimumInput = 0.0001
  let context, source, processor, ending = false, closed = false, heardSpeech = false
  let bytes = 0, peakInput = 0, liveText = '', serverReady = false, commitRequested = false, commitSent = false
  let queuedAudio = [], idleTimer, limitTimer, finalTimer
  const readyTimer = schedule(() => fail('Couldn’t start live voice. Try again or type your reply.'), 20000)

  function releaseAudio() {
    unschedule(idleTimer); unschedule(limitTimer)
    media.getTracks().forEach(track => { track.onended = null; track.stop() })
    if (processor) { processor.port.onmessage = null; processor.disconnect() }
    source?.disconnect()
    if (context && context.state !== 'closed') context.close().catch(() => {})
  }
  function cancel() {
    if (closed) return
    closed = true
    unschedule(readyTimer); unschedule(finalTimer)
    releaseAudio(); queuedAudio = []; socket.close()
  }
  function fail(message) {
    if (closed) return
    cancel(); onError(message)
  }
  function sendAudio(buffer) {
    socket.send(JSON.stringify({ type: 'append', audio: environment.btoa(String.fromCharCode(...buffer)) }))
  }
  function flushQueuedAudio() {
    if (!serverReady || socket.readyState !== 1 || closed) return
    for (const buffer of queuedAudio) sendAudio(buffer)
    queuedAudio = []
  }
  function sendCommit() {
    if (!commitRequested || commitSent || !serverReady || closed) return
    if (socket.readyState !== 1) { fail('Live voice disconnected. Your draft is here to review and send.'); return }
    if (bytes < 4800) { fail('Not enough microphone audio was captured. Try recording a little longer.'); return }
    flushQueuedAudio()
    commitSent = true
    finalTimer = schedule(() => fail('Couldn’t finish that transcript. Your draft is here to review and send.'), 15000)
    socket.send(JSON.stringify({ type: 'commit' }))
  }
  function commit() {
    if (closed || commitRequested) return
    commitRequested = true
    releaseAudio(); sendCommit()
  }
  function stop() {
    if (closed || ending) return
    if (!processor || peakInput < minimumInput) { fail('The microphone input is very quiet or muted. Check the selected microphone and try again.'); return }
    ending = true; onStatus('transcribing')
    processor.port.postMessage('flush')
  }
  async function startCapture() {
    // Capture while the network handshake runs. Otherwise the first words and
    // fillers disappear when someone speaks immediately after tapping voice.
    context = new environment.AudioContext({ sampleRate: 24000 })
    await context.audioWorklet.addModule(new URL('./pcm-worklet.js', import.meta.url))
    if (closed) return
    if (context.sampleRate !== 24000) throw new Error('Unsupported sample rate')
    await context.resume()
    if (closed) return
    source = context.createMediaStreamSource(media)
    processor = new environment.AudioWorkletNode(context, 'voice-pcm', { channelCount: 1, channelCountMode: 'explicit' })
    processor.port.onmessage = ({ data: frame }) => {
      if (closed) return
      if (frame.flushed) { commit(); return }
      if (!(frame.pcm instanceof ArrayBuffer)) return
      if (Number.isFinite(frame.rms)) peakInput = Math.max(peakInput, frame.rms)
      const buffer = new Uint8Array(frame.pcm)
      bytes += buffer.length
      if (bytes > 3 * 1024 * 1024) { fail('Voice reply reached the recording limit. Review your draft or try a shorter reply.'); return }
      if (serverReady && socket.readyState === 1) sendAudio(buffer)
      else queuedAudio.push(buffer)
      if (ending) return
      const state = pause(frame.rms, environment.performance.now())
      heardSpeech = heardSpeech || state.heardSpeech
      if (heardSpeech) unschedule(idleTimer)
      if (state.stopped) stop()
    }
    source.connect(processor); processor.connect(context.destination)
    media.getTracks().forEach(track => { track.onended = () => fail('The microphone disconnected. Try again or type your reply.') })
    onStatus('recording')
    // Quiet input may still be intelligible. Finalize it instead of declaring
    // that no speech occurred simply because it missed the volume gate.
    idleTimer = schedule(stop, 12000)
    limitTimer = schedule(stop, 60000)
  }

  socket.onmessage = async ({ data }) => {
    if (closed) return
    try {
      const event = JSON.parse(data)
      if (event.type === 'error') { fail(event.code === 'NO_WORDS_RECOGNIZED' ? 'No words were recognized in that recording. Try again or type your reply.' : 'Live transcription is unavailable. Try again or type your reply.'); return }
      if (event.type === 'ready') {
        if (serverReady) return
        serverReady = true; unschedule(readyTimer)
        flushQueuedAudio(); sendCommit()
        await captureStarted
        return
      }
      if (event.type === 'transcript' || event.type === 'complete') {
        // Validate live fragments before display; only a final transcript sends.
        if (typeof event.text !== 'string' || event.text.length > 4000 || /\u0000/.test(event.text)) throw new Error('Invalid transcript')
        if (event.type === 'complete') {
          if (!commitSent || !event.text.trim()) throw new Error('Unexpected final transcript')
          const text = event.text.trim()
          cancel(); onComplete(text)
        } else if (event.text.trim() && peakInput >= minimumInput) {
          const changed = event.text !== liveText
          liveText = event.text
          if (!ending && changed) { heardSpeech = true; pause.confirmSpeech(environment.performance.now()); unschedule(idleTimer) }
          onTranscript(event.text)
        }
      }
    } catch { fail('Couldn’t transcribe that reply. Try again or type it.') }
  }
  socket.onerror = () => fail('Couldn’t connect live voice. Try again or type your reply.')
  socket.onclose = () => { if (!closed) fail('Live voice disconnected. Your draft is here to review and send.') }
  const captureStarted = startCapture().catch(() => fail('Couldn’t capture microphone audio. Try again or type your reply.'))
  return { stop, cancel }
}
