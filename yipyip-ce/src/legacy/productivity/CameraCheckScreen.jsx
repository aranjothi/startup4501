import { useState, useEffect, useRef } from 'react'
import './CameraCheckScreen.css'

export default function CameraCheckScreen({ onStart, onBack }) {
  const [cameraError, setCameraError] = useState(null)
  const [waitingForPermission, setWaitingForPermission] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animFrameRef = useRef(null)
  const abortRef = useRef(false)

  useEffect(() => {
    abortRef.current = false
    setup()
    return () => {
      abortRef.current = true
      teardown()
    }
  }, [])

  useEffect(() => {
    if (!waitingForPermission) return
    const bc = new BroadcastChannel('dopal_camera')
    bc.onmessage = (e) => {
      if (e.data?.type === 'CAMERA_PERMISSION_GRANTED') {
        bc.close()
        setCameraError(null)
        setWaitingForPermission(false)
        abortRef.current = false
        setup()
      }
    }
    return () => bc.close()
  }, [waitingForPermission])

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
      setModelReady(true)
      detect()
    } catch (err) {
      if (abortRef.current) return
      console.error('[CameraCheck]', err.name, err.message)
      setCameraError(`${err.name}: ${err.message}`)
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
      const results = lm.detectForVideo(video, performance.now())
      setFaceDetected(results.facialTransformationMatrixes?.length > 0)
    }
    animFrameRef.current = requestAnimationFrame(detect)
  }

  function handleGrantAccess() {
    window.open(chrome.runtime.getURL('camera-permission.html'), '_blank')
    setWaitingForPermission(true)
  }

  function handleStart() {
    teardown()
    onStart()
  }

  const isNotAllowed = cameraError?.includes('NotAllowedError')
  const showVideo = !cameraError

  return (
    <div className="cam-check-screen">
      <div className="cam-check-container">
        <div className="cam-check-header">
          <button className="cam-check-back" onClick={onBack}>←</button>
          <p className="cam-check-title">Camera Check</p>
          <div className="cam-check-header-spacer" />
        </div>

        <div className="cam-preview-wrap">
          <video
            ref={videoRef}
            className="cam-preview-video"
            playsInline
            muted
            style={{ display: showVideo ? 'block' : 'none' }}
          />
          {!showVideo && (
            <div className="cam-preview-placeholder">
              {cameraError ? '📷' : ''}
            </div>
          )}
          {showVideo && !modelReady && (
            <div className="cam-preview-loading">Loading model…</div>
          )}
        </div>

        <div className="cam-status-area">
          {cameraError
            ? waitingForPermission
              ? <div className="cam-status-pill cam-status-waiting">Allow in new tab…</div>
              : isNotAllowed
              ? <>
                  <div className="cam-status-pill cam-status-warn">Camera access required</div>
                  <button className="cam-grant-btn" onClick={handleGrantAccess}>Grant Access</button>
                </>
              : <div className="cam-status-pill cam-status-warn">No camera found</div>
            : !modelReady
            ? <div className="cam-status-pill cam-status-waiting">Starting up…</div>
            : <>
                <div className={`cam-status-pill ${faceDetected ? 'cam-status-ok' : 'cam-status-warn'}`}>
                  <span className={`cam-dot ${faceDetected ? 'cam-dot-green' : 'cam-dot-yellow'}`} />
                  {faceDetected ? 'All Set!' : 'Not recognized…'}
                </div>
                <p className={`cam-hint ${faceDetected ? 'cam-hint-ok' : ''}`}>
                  {faceDetected
                    ? "Let's get started!"
                    : 'Try moving to better lighting or adjusting the positioning of your camera.'}
                </p>
              </>
          }
        </div>

        <button
          className="cam-start-btn"
          onClick={handleStart}
          disabled={!faceDetected}
          style={{ opacity: faceDetected ? 1 : 0.4, cursor: faceDetected ? 'pointer' : 'default' }}
        >
          Start Session
        </button>
      </div>
    </div>
  )
}
