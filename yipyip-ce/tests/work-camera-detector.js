// Replaces only the detector in the explicit camera-test build. Never shipped.
let present = true
export async function loadFaceDetector() {
  if (!document.getElementById('test-camera-presence')) {
    const button = document.createElement('button')
    button.id = 'test-camera-presence'
    button.textContent = 'Test camera: face in frame'
    Object.assign(button.style, { position: 'fixed', bottom: '16px', left: '16px', zIndex: 9999, padding: '12px' })
    button.onclick = () => { present = !present; button.textContent = `Test camera: face ${present ? 'in frame' : 'away'}` }
    document.body.append(button)
  }
  return { detectForVideo: () => ({ faceLandmarks: present ? [[{}]] : [] }), close() {} }
}
