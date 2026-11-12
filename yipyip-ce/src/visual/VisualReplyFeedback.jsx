import { FiEye } from 'react-icons/fi'

export default function VisualReplyFeedback({ summary }) {
  if (summary?.version !== 1) return null
  return <section className="visual-reply-feedback" aria-label="Body language feedback">
    <h4><FiEye aria-hidden="true" />Body language</h4>
    {summary.status !== 'measured' ? <p>Not enough clear camera data for this reply. Try keeping your face and hands in frame.</p> : <>
      <p className="visual-coverage">Face visible in {summary.faceVisiblePercent}% of tracked frames.</p>
      <ul>
        <li>{summary.handMovement === 'unobserved' ? 'Hands weren’t visible long enough to assess movement.' : summary.handMovement === 'observed' ? 'Hand movement observed.' : 'Little hand movement observed.'}</li>
        <li>{summary.facialMovement === 'unobserved' ? 'Not enough face data to assess movement.' : summary.facialMovement === 'observed' ? 'Facial movement varied during this reply.' : 'Little facial movement variation observed.'}</li>
      </ul>
      {summary.handMovement === 'unobserved' && <p className="visual-feedback-tip">Include your hands in the frame for gesture feedback.</p>}
    </>}
  </section>
}
