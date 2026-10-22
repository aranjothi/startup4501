import { useState, useEffect, useRef } from 'react'

const YAW_THRESHOLD = 25
const PITCH_THRESHOLD = 20
const PAUSE_GRACE_MS = 800  // ms of continuous look-away before pausing the timer

export function useFaceDetection({ focusMode }) {
  const [faceCamReady, setFaceCamReady] = useState(false)
  const [isLookingAway, setIsLookingAway] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animFrameRef = useRef(null)
  const abortRef = useRef(false)
  const lookAwayStartRef = useRef(null)
  const lookAwayAccumRef = useRef(0)
  const isLookingAwayRef = useRef(false)

  useEffect(() => {
    if (!focusMode) return
    abortRef.current = false
    setup()
    return () => {
      abortRef.current = true
      teardown()
    }
  }, [])

  async function setup() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (abortRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      if (abortRef.current) return

      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      if (abortRef.current) return
      const vision = await FilesetResolver.forVisionTasks(chrome.runtime.getURL('mediapipe/wasm'))
      if (abortRef.current) return
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
        delegate: 'CPU',
      })
      if (abortRef.current) return
      setFaceCamReady(true)
      detect()
    } catch (err) {
      if (abortRef.current) return
      console.error('[FocusMode]', err.name, err.message)
    }
  }

  function teardown() {
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    try { landmarkerRef.current?.close() } catch {}
    landmarkerRef.current = null
  }

  function detect() {
    if (abortRef.current) return
    const video = videoRef.current
    const lm = landmarkerRef.current
    if (video && lm && video.readyState >= 2) {
      process(lm.detectForVideo(video, performance.now()))
    }
    animFrameRef.current = requestAnimationFrame(detect)
  }

  function checkLookingAway(results) {
    if (!results.facialTransformationMatrixes?.length) return true
    const m = results.facialTransformationMatrixes[0].data
    const yaw   = Math.atan2(-m[2], Math.sqrt(m[0] ** 2 + m[1] ** 2)) * (180 / Math.PI) /* turning left/right */
    const pitch  = Math.atan2(m[6], m[10]) * (180 / Math.PI) /* up/down */
    return Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD
  }

  function process(results) {
    const lookingAway = checkLookingAway(results)
    const now = Date.now()

    if (lookingAway) {
      if (lookAwayStartRef.current === null) lookAwayStartRef.current = now
      // Pause only after sustained look-away to avoid micro-pauses from blinks/glances
      if (!isLookingAwayRef.current && (now - lookAwayStartRef.current) >= PAUSE_GRACE_MS) {
        isLookingAwayRef.current = true
        setIsLookingAway(true)
      }
    } else {
      if (lookAwayStartRef.current !== null) {
        lookAwayAccumRef.current += (now - lookAwayStartRef.current) / 1000
        lookAwayStartRef.current = null
      }
      if (isLookingAwayRef.current) {
        isLookingAwayRef.current = false
        setIsLookingAway(false)
      }
    }
  }

  function getMoodPenalty() {
    let total = lookAwayAccumRef.current
    if (lookAwayStartRef.current !== null) total += (Date.now() - lookAwayStartRef.current) / 1000
    return total * 0.5
  }

  return { videoRef, faceCamReady, isLookingAway, getMoodPenalty }
}
