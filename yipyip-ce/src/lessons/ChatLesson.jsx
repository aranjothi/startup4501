import { useEffect, useRef, useState } from 'react'
import { FiMic, FiSend, FiSquare, FiCamera, FiCameraOff, FiCheck, FiMessageSquare, FiThumbsUp, FiTarget, FiEye, FiAward, FiChevronDown, FiChevronLeft, FiInfo, FiMessageCircle } from 'react-icons/fi'
import PanelScreen from '../components/PanelScreen'
import { getLesson } from './catalog.js'
import { getAttempt, getDraft, saveAttempt } from './lessonStore.js'
import { lessonTurn } from './api.js'
import { useVoiceReply } from './useVoiceReply.js'
import TopicIcon from './TopicIcon'
import { requestMedia, mediaAccessError } from '../media/access.js'
import './Lessons.css'
import './Conversation.css'
import PracticePause from './PracticePause'
import { lessonProgress } from './engagement.js'
import { transcriptFillers } from './disfluency.js'

function ReplyFeedback({ message }) {
  const fillers = message.source === 'voice' ? transcriptFillers(message.content) : null
  return <details className="reply-feedback"><summary><FiMessageSquare aria-hidden="true" />Feedback<FiChevronDown className="feedback-chevron" aria-hidden="true" /></summary><div className="feedback-content">
    <h4 className="feedback-strength">{['warning', 'paused'].includes(message.outcome) ? <><FiInfo aria-hidden="true" />This turn</> : <><FiThumbsUp aria-hidden="true" />What worked</>}</h4><p>{message.feedback.strength}</p>
    <h4 className="feedback-next"><FiTarget aria-hidden="true" />Try next</h4><p>{message.feedback.improvement}</p><p>{message.feedback.suggestion}</p>
    <blockquote>“{message.feedback.evidenceQuote}”</blockquote>
    {!!fillers?.total && <div className="reply-speech-notes"><h4><FiMic aria-hidden="true" />Recognized fillers · {fillers.total}</h4><p>{Object.entries(fillers.counts).map(([word, count]) => `“${word}” × ${count}`).join(' · ')}</p><p>{fillers.total >= 3 ? 'Try a short silent pause instead of repeated fillers.' : 'Occasional fillers are natural; watch for repeated ones.'}</p></div>}
    {message.visualDemo && <div className="visual-feedback-demo"><strong className="icon-heading"><FiEye aria-hidden="true" />Body language · Demo</strong><p>Hard-coded presentation example. Your video has not been analyzed.</p><ul><li>Posture: try a comfortable, upright position.</li><li>Gestures: try one intentional gesture to emphasize your point.</li></ul></div>}
  </div></details>
}

export default function ChatLesson({ lessonId, attemptId, coins, profile, onBack, onProgress, onRestart, onHome, fresh = false }) {
  const [attempt, setAttempt] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [source, setSource] = useState('typed')
  const [pending, setPending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [rewarded, setRewarded] = useState(false)
  const [visualDemo, setVisualDemo] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraPending, setCameraPending] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showPause, setShowPause] = useState(false)
  const [pauseError, setPauseError] = useState('')
  const [readId, setReadId] = useState(null)
  const responseBusy = useRef(false), voiceBase = useRef('')
  const cameraPermission = useRef(null)
  const request = useRef(null), end = useRef(null), camera = useRef(null), cameraStream = useRef(null), mounted = useRef(false), cameraGeneration = useRef(0)
  const lesson = getLesson(attempt?.lessonId ?? lessonId)
  const voice = useVoiceReply((value, final) => {
    const draft = [voiceBase.current, value].filter(Boolean).join(' ')
    setText(draft); setSource('voice')
    if (final) submitContent(draft, 'voice')
  })
  const readOnly = !!attemptId
  const { engagedReplies: accepted, totalReplies, canComplete } = lessonProgress(messages, lesson?.requiredReplies, paused)
  const failed = messages.at(-1)?.role === 'user' && !messages.at(-1).validated
  const voiceBusy = voice.status !== 'idle'

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    async function load() {
      try {
        const saved = attemptId ? await getAttempt(attemptId) : (fresh ? null : await getDraft(lessonId))
        if (cancelled) return
        if (attemptId && !saved) throw new Error('This lesson could not be found.')
        const currentLesson = getLesson(saved?.lessonId ?? lessonId)
        if (!currentLesson) throw new Error('This lesson is no longer available.')
        const current = saved ?? { id: crypto.randomUUID(), lessonId, startedAt: Date.now(), messages: [{ id: crypto.randomUUID(), role: 'assistant', content: currentLesson.opening }] }
        if (!saved) await saveAttempt(current)
        if (cancelled) return
        setAttempt(current); setMessages(current.messages); setDone(!!current.completedAt); setPaused(!!current.paused)
        const result = await chrome.runtime.sendMessage({ type: 'GET_STATE' })
        if (!cancelled) setRewarded((result.payload?.rewardedLessonAttemptIds ?? []).includes(current.id))
      } catch (err) { if (!cancelled) setError(err.message) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true; mounted.current = false; request.current?.abort(); cameraPermission.current?.abort(); cameraGeneration.current++; cameraStream.current?.getTracks().forEach(track => track.stop()) }
  }, [lessonId, attemptId, fresh])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }, [messages.length, pending])
  useEffect(() => {
    if (!pending) return
    const id = messages.at(-1)?.id
    const timer = setTimeout(() => setReadId(id), 500)
    return () => clearTimeout(timer)
  }, [pending])
  useEffect(() => {
    if (!paused || readOnly) return
    const timer = setTimeout(() => setShowPause(true), 650)
    return () => clearTimeout(timer)
  }, [paused, readOnly])
  useEffect(() => {
    if (!visualDemo) {
      cameraPermission.current?.abort(); cameraGeneration.current++
      cameraStream.current?.getTracks().forEach(track => track.stop()); cameraStream.current = null
      setCameraOn(false); setCameraPending(false)
    }
  }, [visualDemo])
  async function toggleCamera() {
    if (cameraOn) { cameraPermission.current?.abort(); cameraGeneration.current++; cameraStream.current?.getTracks().forEach(track => track.stop()); cameraStream.current = null; setCameraOn(false); return }
    const generation = ++cameraGeneration.current
    setCameraPending(true)
    cameraPermission.current?.abort(); cameraPermission.current = new AbortController()
    try {
      const stream = await requestMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 } }, audio: false }, { signal: cameraPermission.current.signal })
      if (!mounted.current || generation !== cameraGeneration.current) { stream.getTracks().forEach(track => track.stop()); return }
      cameraStream.current = stream
      if (camera.current) { camera.current.srcObject = stream; await camera.current.play() }
      setCameraOn(true)
    } catch (err) { if (mounted.current && generation === cameraGeneration.current) setError(mediaAccessError(err, 'Camera')) }
    finally { if (mounted.current && generation === cameraGeneration.current) setCameraPending(false) }
  }
  async function getResponse(nextMessages) {
    if (!attempt || responseBusy.current || paused) return
    responseBusy.current = true
    setPending(true); setError('')
    request.current = new AbortController()
    try {
      await saveAttempt({ ...attempt, messages: nextMessages })
      const result = await lessonTurn(lesson.id, nextMessages, request.current.signal, profile?.confidence)
      if (!mounted.current) return
      const approved = nextMessages.map((message, index) => index === nextMessages.length - 1 ? { ...message, validated: true, feedback: result.feedback, engagement: result.engagement, assessmentVersion: result.assessmentVersion, outcome: result.outcome, readAt: Date.now() } : message)
      const stalled = result.outcome === 'paused'
      const next = stalled ? approved : [...approved, { id: crypto.randomUUID(), role: 'assistant', content: result.reply }]
      const saved = await saveAttempt({ ...attempt, messages: next, paused: stalled })
      if (!mounted.current) return
      setMessages(next); setAttempt(saved); setPaused(stalled)
      if (stalled) { cameraPermission.current?.abort(); cameraGeneration.current++; cameraStream.current?.getTracks().forEach(track => track.stop()); cameraStream.current = null; setCameraOn(false) }
    } catch (err) { if (mounted.current) setError(err.message) }
    finally { responseBusy.current = false; if (mounted.current) setPending(false) }
  }
  function submitContent(content, replySource) {
    if (!content.trim() || responseBusy.current || failed || done || paused || finishing || readOnly || totalReplies >= 8) return
    if (content.length > 1500) { setError('Shorten your reply to 1,500 characters before sending.'); return }
    const next = [...messages, { id: crypto.randomUUID(), role: 'user', content: content.trim(), source: replySource, visualDemo, validated: false }]
    setMessages(next); setText(''); setSource('typed'); getResponse(next)
  }
  function send(event) {
    event?.preventDefault()
    if (!voiceBusy) submitContent(text, source)
  }
  function startVoice() { voiceBase.current = text.trim(); voice.start() }
  async function retryPractice() {
    if (finishing) return
    setFinishing(true); setPauseError(''); voice.cancel()
    try {
      await saveAttempt({ ...attempt, abandonedAt: Date.now() })
      if (mounted.current) onRestart(lesson.id)
    } catch { if (mounted.current) { setPauseError('Couldn’t start a fresh attempt. Please try again.'); setError('Couldn’t start a fresh attempt. Please try again.') } }
    finally { if (mounted.current) setFinishing(false) }
  }
  async function finish() {
    if (!attempt || !canComplete || paused || pending || failed || finishing || voiceBusy) return
    setFinishing(true); setError('')
    try {
      const completed = await saveAttempt({ ...attempt, messages }, true)
      setAttempt(completed); setDone(true)
      voice.cancel(); cameraPermission.current?.abort(); cameraGeneration.current++; cameraStream.current?.getTracks().forEach(track => track.stop()); cameraStream.current = null; setCameraOn(false)
      const result = await chrome.runtime.sendMessage({ type: 'COMPLETE_LESSON', payload: { attemptId: completed.id } })
      if (result.error) throw new Error(result.error)
      setRewarded(true)
      onProgress()
    } catch (err) { setError(err.message) }
    finally { if (mounted.current) setFinishing(false) }
  }
  function editFailed() {
    const last = messages.at(-1)
    const next = messages.slice(0, -1)
    setText(last.content); setSource(last.source ?? 'typed'); setMessages(next); setError('')
    saveAttempt({ ...attempt, messages: next }).catch(err => setError(err.message))
  }
  const footer = !loading && lesson && <>
    {error && <div className="lesson-error" role="alert"><p>{error}</p></div>}
    {voice.error && <p className="lesson-error" role="alert">{voice.error}</p>}
    {paused && !readOnly ? <div className="paused-footer"><FiMessageCircle aria-hidden="true" /><span>This practice conversation paused.</span><button className="lesson-text-button" onClick={() => setShowPause(true)}>See what happened</button></div> : done || readOnly ? <div className="lesson-finished"><span><FiCheck /> Lesson completed{rewarded ? ' · +10 coins, +30 XP' : ''}</span>{!rewarded && !readOnly && <button className="panel-action lesson-wide" disabled={finishing} onClick={finish}>Collect reward</button>}<button className="panel-action lesson-wide" onClick={() => onRestart(lesson.id)}>Practice again</button></div> : <>
      {canComplete && <button className="panel-action lesson-wide" disabled={pending || failed || finishing || voiceBusy} onClick={finish}><FiAward aria-hidden="true" />{finishing ? 'Saving…' : 'Complete lesson · +10 coins'}</button>}
      {failed && !pending && <div className="failed-reply"><button className="panel-action" onClick={() => getResponse(messages)}>Retry reply</button><button className="lesson-text-button" onClick={editFailed}>Edit message</button></div>}
      {totalReplies < 8 && <form className="lesson-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="lesson-message">Your reply</label>
        <textarea id="lesson-message" value={text} maxLength={1500} placeholder={voice.status === 'recording' ? 'Listening…' : voice.status === 'transcribing' ? 'Finishing transcript…' : 'Message…'} disabled={pending || failed || voiceBusy || finishing} onChange={event => { setText(event.target.value); setSource('typed') }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} rows={1} />
        <div className="composer-actions">
          <button type="button" className={`composer-icon ${voice.status === 'recording' ? 'recording' : ''}`} aria-label={voice.status === 'recording' ? 'Stop voice recording' : 'Record a voice reply'} disabled={pending || failed || finishing || ['transcribing', 'requesting'].includes(voice.status)} onClick={voice.status === 'recording' ? voice.stop : startVoice}>{voice.status === 'recording' ? <FiSquare /> : <FiMic />}</button>
          {voiceBusy && <button type="button" className="lesson-text-button" onClick={voice.cancel}>Cancel</button>}
          <button type="submit" className="composer-send" aria-label="Send reply" disabled={!text.trim() || text.length > 1500 || pending || failed || voiceBusy || finishing}><FiSend /></button>
        </div>
      </form>}
      {totalReplies >= 8 && !canComplete && <button className="panel-action lesson-wide" disabled={finishing} onClick={retryPractice}>Try lesson again</button>}
      {voice.status === 'recording' && <span className="panel-description" role="status">Listening · pause to send automatically</span>}
      {text.length > 1500 && <p className="lesson-error">Shorten your reply to 1,500 characters before sending.</p>}
      {voice.status === 'transcribing' && <span className="voice-status" role="status">Finishing your words…</span>}
      {voice.status === 'recording' && <div className="voice-wave" aria-hidden="true">{Array.from({ length: 15 }, (_, i) => <i key={i} style={{ '--wave-delay': `${i * 65}ms` }} />)}</div>}
    </>}
  </>
  const chatHeader = <header className="conversation-header">
    <button className="conversation-back" aria-label="Back to lessons" onClick={onBack} disabled={finishing}><FiChevronLeft /></button>
    <div className="conversation-person"><span className="conversation-avatar" aria-hidden="true"><TopicIcon topicId={lesson?.topicId} /></span><strong>{lesson?.partnerName ?? 'Your practice partner'}</strong><span>AI practice partner</span></div>
    <span className="conversation-header-icon" aria-hidden="true"><FiMessageCircle /></span>
  </header>
  return <PanelScreen title={readOnly ? 'Review' : 'Lesson'} coins={coins} onBack={onBack} backDisabled={finishing} className="lesson-chat" topic={lesson?.topicId} footer={footer} header={chatHeader}>
    {loading ? <p role="status">Loading lesson…</p> : lesson && <>
      <details className="conversation-brief"><summary><FiInfo aria-hidden="true" /><span>{lesson.title}</span><FiChevronDown aria-hidden="true" /></summary>
        <div className="lesson-context"><p>{lesson.goal}</p><span>{Math.min(accepted, lesson.requiredReplies)} / {lesson.requiredReplies} engaged replies</span></div>
        {!readOnly && !done && !paused && <button className="lesson-text-button" disabled={pending || voiceBusy || finishing} onClick={retryPractice}>Restart lesson</button>}
        {!readOnly && !done && !paused && <details className="lesson-visual-options"><summary><FiEye aria-hidden="true" />Body-language demo <span>(optional)</span></summary><label className="demo-opt-in"><input type="checkbox" checked={visualDemo} onChange={event => setVisualDemo(event.target.checked)} />Include sample visual feedback</label><p className="panel-description">Hard-coded examples for the presentation. No vision analysis.</p>{visualDemo && <><div className={`lesson-camera ${cameraOn ? 'active' : ''}`}><video ref={camera} autoPlay muted playsInline aria-label="Optional camera preview" /></div><button className="lesson-text-button" disabled={cameraPending} onClick={toggleCamera}>{cameraOn ? <FiCameraOff /> : <FiCamera />}{cameraPending ? 'Opening camera…' : cameraOn ? 'Camera off' : 'Camera preview'}</button></>}</details>}
      </details>
      <div className="conversation-day">{readOnly ? 'Your conversation' : 'Today · a little practice goes a long way'}</div>
      <div className="chat-messages">{messages.map((message, index) => <div key={message.id} className={`chat-message ${message.role}`}>
        <span className="message-author">{message.role === 'assistant' ? lesson.partnerName : message.source === 'voice' ? 'You · Voice' : 'You'}</span>
        <p className="message-bubble">{message.content}</p>
        {message.role === 'user' && index === messages.length - (messages.at(-1)?.role === 'assistant' ? 2 : 1) && <span className="message-receipt">{message.validated || readId === message.id ? 'Read' : pending ? 'Delivered' : 'Retry needed'}</span>}
        {message.role === 'user' && message.validated && message.feedback && <ReplyFeedback message={message} />}
        {message.outcome === 'warning' && <p className="conversation-nudge">Let’s bring it back to the conversation. Check your feedback for a tip.</p>}
      </div>)}{pending && <div className="typing-indicator" role="status" aria-label="Practice partner is typing"><i /><i /><i /></div>}</div><div ref={end} />
    </>}
    {!loading && !lesson && error && <p role="alert" className="lesson-error">{error}</p>}
    {showPause && !readOnly && <PracticePause feedback={messages.at(-1)?.feedback} busy={finishing} error={pauseError} onRetry={retryPractice} onHome={() => { voice.cancel(); onHome() }} />}
  </PanelScreen>
}
