document.getElementById('grant-btn').addEventListener('click', async function () {
  const el = document.getElementById('status')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach(t => t.stop())
    el.className = 'success'
    el.textContent = '✓ Camera access granted! You can close this tab.'
    const bc = new BroadcastChannel('yipyip_camera')
    bc.postMessage({ type: 'CAMERA_PERMISSION_GRANTED' })
    bc.close()
  } catch (err) {
    el.className = 'error'
    el.textContent = err.name + ': ' + err.message
  }
})
