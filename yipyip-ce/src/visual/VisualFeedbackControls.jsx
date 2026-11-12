import { FiEye, FiCamera, FiCameraOff } from 'react-icons/fi'

export default function VisualFeedbackControls({ enabled = false, onEnabled }) {
  return <details className="lesson-visual-options"><summary><FiEye aria-hidden="true" />Body language <span>(optional)</span></summary>
    <label className="demo-opt-in"><input type="checkbox" checked={enabled} onChange={event => onEnabled(event.target.checked)} />Visual feedback (camera)</label>
    <p className="panel-description">Live tracking and feedback for voice replies. Video stays on this device.</p>
  </details>
}

export function VisualTrackingPreview({ enabled = false, cameraRequested = false, onCameraToggle, visual = { status: 'off' } }) {
  if (!enabled) return null
  const status = visual.error || ({ off: 'Camera off', loading: 'Loading tracking…', ready: 'Checking camera…', paused: 'Tracking paused', framing: 'Adjust framing' }[visual.status])
    || (visual.handsVisible ? `Tracking · ${visual.handsVisible} ${visual.handsVisible === 1 ? 'hand' : 'hands'}` : 'Tracking · hands out of view')
  return <section className="lesson-visual-tracking" aria-label="Visual tracking">
    {cameraRequested && <div className="lesson-visual-camera" style={{ aspectRatio: `${visual.videoWidth || 640} / ${visual.videoHeight || 480}` }}>
      <video ref={visual.previewRef} autoPlay muted playsInline aria-label="Optional camera preview" />
      <canvas ref={visual.overlayRef} aria-hidden="true" />
    </div>}
    <div><p role={visual.error ? 'alert' : 'status'}>{status}</p>
      {visual.status === 'tracking' && <p className="visual-live-measurements">{visual.faceVisible ? 'Face in frame' : 'Face not visible'} · {visual.handsVisible || 0} {visual.handsVisible === 1 ? 'hand' : 'hands'} visible</p>}
      <button type="button" className="lesson-text-button" onClick={visual.status === 'error' ? visual.retry : onCameraToggle}>
        {cameraRequested ? <FiCameraOff aria-hidden="true" /> : <FiCamera aria-hidden="true" />}{visual.status === 'error' ? 'Retry camera' : cameraRequested ? 'Camera off' : 'Camera preview'}
      </button>
    </div>
  </section>
}
