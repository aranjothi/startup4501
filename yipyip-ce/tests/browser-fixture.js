// Local UI test harness only: synthetic media and Chrome APIs, never shipped.
import { getSession } from '../src/practice/sessionStore.js'
import { rewardSession } from '../src/practice/rewards.js'
import { getAttempt } from '../src/lessons/lessonStore.js'
import { rewardLesson } from '../src/lessons/rewards.js'
import { getLesson, validateProfile } from '../src/lessons/catalog.js'
import { conversationOutcome } from '../src/lessons/engagement.js'
const listeners = new Set()
const read = () => JSON.parse(localStorage.getItem('yipyip-lessons-test-state') || 'null') ?? {
  id: 'browser-test', coins: 0, treats: 0, rewardedSessionIds: [],
  pet: { name: 'Pal', level: 1, xp: 0, hunger: 70, mood: 85, lastActiveAt: Date.now(), lastDecayAt: Date.now() },
}
function write(state) {
  const before = read()
  localStorage.setItem('yipyip-lessons-test-state', JSON.stringify(state))
  listeners.forEach(listener => listener({ userState: { newValue: state, oldValue: before } }))
}
window.addEventListener('storage', event => {
  if (event.key === 'yipyip-lessons-test-state' && event.newValue) listeners.forEach(listener => listener({ userState: { newValue: JSON.parse(event.newValue) } }))
})
window.chrome = {
  runtime: {
    getURL: path => path,
    sendMessage: async message => {
      let state = read()
      if (message.type === 'COMPLETE_PRACTICE') {
        const result = rewardSession(state, await getSession(message.payload.sessionId))
        state = result.state
        write(state)
        return { payload: state, awarded: result.awarded }
      }
      if (message.type === 'SET_LEARNING_PROFILE') {
        if (!validateProfile(message.payload)) return { error: 'Choose a topic and daily goal.' }
        state.learningProfile = message.payload; write(state); return { payload: state }
      }
      if (message.type === 'COMPLETE_LESSON') {
        const result = rewardLesson(state, await getAttempt(message.payload.attemptId))
        write(result.state); return { payload: result.state, awarded: result.awarded }
      }
      if (message.type === 'BUY_TREAT') {
        if (state.coins < 10) return { error: 'Not enough coins.' }
        state.coins -= 10; state.treats += 1; write(state)
        return { type: 'BUY_TREAT_SUCCESS', payload: state }
      }
      if (message.type === 'USE_TREAT') {
        if (!state.treats) return { error: 'Pick up a treat first.' }
        state.treats -= 1; state.pet.hunger = Math.min(100, state.pet.hunger + 10); write(state)
        return { payload: state }
      }
      if (message.type === 'RENAME_PET') { state.pet.name = message.payload.name; write(state) }
      return { payload: state }
    },
  },
  storage: { local: { get: async key => ({ [key]: JSON.parse(localStorage.getItem(`yipyip-test-${key}`) || 'null') }), set: async values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(`yipyip-test-${key}`, JSON.stringify(value)) } }, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
}
const originalFetch = window.fetch.bind(window)
window.fetch = async (url, options) => {
  if (String(url) === 'http://127.0.0.1:8787/api/turn') {
    const { lessonId, messages } = JSON.parse(options.body)
    const lesson = getLesson(lessonId)
    const latest = messages.at(-1).content
    const count = messages.filter(message => message.role === 'user').length
    const users = messages.filter(message => message.role === 'user')
    const offTopic = value => /purple elephants|off topic|go away/i.test(value || '')
    const classify = value => /^(nah fam|idc|whatever)[.!?]*$/i.test((value || '').trim()) ? 'blocking' : offTopic(value) ? 'off_topic' : 'engaged'
    const engagement = { latest: classify(latest), previous: count === 1 ? 'none' : classify(users.at(-2).content) }
    const outcome = conversationOutcome(engagement)
    const replies = [
      `You mentioned “${latest.slice(0, 60)}”. Could you tell me a little more about that?`,
      `Thanks for sharing that. In this situation, how would you ${lesson.goal.toLowerCase().replace(/\.$/, '')}?`,
      'That helps me understand your perspective. Thanks for taking the time to talk with me.',
    ]
    return new Response(JSON.stringify({ topicId: lesson.topicId, engagement, outcome, assessmentVersion: 2, reply: replies[Math.min(count - 1, 2)], feedback: { strength: 'You gave a direct response to the conversation.', improvement: outcome === 'paused' ? 'Two replies moved away from the café conversation, so this practice partner has paused.' : 'Make the next step specific to the other person.', suggestion: 'Try sharing one detail about your week and asking how theirs went.', evidenceQuote: latest.slice(0, 80) }, validation: { approved: true, attempts: 1 } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  if (String(url) === 'http://127.0.0.1:8787/api/transcribe') return new Response(JSON.stringify({ text: params.has('fillers') ? 'Um, I, uh, enjoy cooking, um, with my friends.' : 'I have been enjoying cooking lately. What about you?' }), { status: 200 })
  return originalFetch(url, options)
}
const params = new URLSearchParams(window.location.search)
{
  // No physical camera/microphone is accessed. A canvas and silent oscillator
  // exercise the real MediaRecorder, Blob, playback, and IndexedDB paths.
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (params.has('deny')) throw new DOMException('Test denied', 'NotAllowedError')
    const canvas = document.createElement('canvas')
    canvas.width = 640; canvas.height = 480
    const ctx = canvas.getContext('2d')
    let frame = 0
    const draw = () => {
      ctx.fillStyle = '#b1cff3'; ctx.fillRect(0, 0, 640, 480)
      ctx.fillStyle = '#355c9f'; ctx.font = '26px sans-serif'
      ctx.fillText('YipYip simulated camera', 150, 220)
      ctx.font = '18px sans-serif'; ctx.fillText(`Frame ${frame++} · no physical devices`, 150, 260)
    }
    draw()
    const timer = setInterval(draw, 100)
    const video = canvas.captureStream(10)
    const audio = new AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain(); gain.gain.value = constraints.audio && params.has('livevoice') ? .12 : 0
    const destination = audio.createMediaStreamDestination()
    oscillator.connect(gain).connect(destination); oscillator.start()
    if (constraints.audio && params.has('livevoice')) gain.gain.setValueAtTime(0, audio.currentTime + 2)
    const stream = new MediaStream([...(constraints.video ? video.getTracks() : []), ...(constraints.audio ? destination.stream.getTracks() : [])])
    if (!constraints.video) { video.getTracks().forEach(track => track.stop()); clearInterval(timer) }
    if (!constraints.audio) { destination.stream.getTracks().forEach(track => track.stop()); audio.close() }
    stream.getTracks().forEach(track => {
      const stop = track.stop.bind(track)
      track.stop = () => { stop(); clearInterval(timer); if (audio.state !== 'closed') audio.close() }
    })
    return stream
  }
}

// Deterministic streaming voice fixture: no network calls or real speech service.
const NativeWebSocket = window.WebSocket
window.WebSocket = class extends EventTarget {
  constructor(url) {
    super()
    if (!String(url).endsWith('/api/voice')) return new NativeWebSocket(url)
    this.readyState = 1; this.frames = 0; this.timers = []
    this.timers.push(setTimeout(() => this.emit({ type: 'ready' }), 30))
  }
  emit(value) { if (this.readyState === 1) this.onmessage?.({ data: JSON.stringify(value) }) }
  send(raw) {
    const event = JSON.parse(raw)
    if (event.type === 'append') {
      this.frames++
      if (this.frames === 5) this.emit({ type: 'transcript', text: params.has('fillers') ? 'Um, I, uh, enjoy' : 'I have been enjoying' })
      if (this.frames === 12) this.emit({ type: 'transcript', text: params.has('fillers') ? 'Um, I, uh, enjoy cooking, um, with my friends.' : 'I have been enjoying cooking lately. What about you?' })
    }
    if (event.type === 'commit') this.timers.push(setTimeout(() => this.emit({ type: 'complete', text: params.has('fillers') ? 'Um, I, uh, enjoy cooking, um, with my friends.' : 'I have been enjoying cooking lately. What about you?' }), 100))
  }
  close() { this.readyState = 3; this.timers.forEach(clearTimeout); this.onclose?.() }
}
