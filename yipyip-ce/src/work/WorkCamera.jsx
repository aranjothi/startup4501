export default function WorkCamera({ camera = { status: 'loading', present: false }, compact = false }) {
  return <section className={`work-camera ${compact ? 'work-camera-compact' : ''}`} aria-label="Work Mode camera">
    <video ref={camera.previewRef} muted playsInline aria-label="Your camera preview" />
    <p role={camera.error ? 'alert' : 'status'} className={camera.present ? 'work-camera-present' : ''}>{camera.error || (camera.status === 'loading' ? 'Starting camera…' : camera.present ? 'In frame' : 'Return to frame')}</p>
    {camera.status === 'error' && <button type="button" className="work-secondary" onClick={camera.retry}>Retry camera</button>}
    {!compact && <details className="work-extra"><summary>About Work Mode</summary><p>2× coins and XP while you’re in frame. Keep Work open; the timer pauses without camera presence. Video stays on your device and isn’t recorded.</p></details>}
  </section>
}
