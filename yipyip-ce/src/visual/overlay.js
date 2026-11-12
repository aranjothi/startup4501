const fingers = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]]
const valid = point => Number.isFinite(point?.x) && Number.isFinite(point?.y)
export function paintTracking(canvas, observation) {
  if (!canvas) return
  if (canvas.width !== 640) canvas.width = 640
  if (canvas.height !== 480) canvas.height = 480
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, 640, 480)
  if (!observation) return
  function dot(point, color) {
    if (!valid(point)) return
    context.beginPath(); context.arc(point.x * 640, point.y * 480, 5, 0, Math.PI * 2)
    context.fillStyle = color; context.fill()
  }
  for (const face of observation.faceLandmarks ?? []) {
    face.forEach((point, index) => { if (index % 24 === 0) dot(point, '#54e7ac') })
  }
  context.strokeStyle = '#4ca7ff'; context.lineWidth = 4
  for (const hand of observation.handLandmarks ?? []) {
    for (const finger of fingers) {
      for (let i = 1; i < finger.length; i++) {
        const a = hand[finger[i - 1]], b = hand[finger[i]]
        if (!valid(a) || !valid(b)) continue
        context.beginPath(); context.moveTo(a.x * 640, a.y * 480); context.lineTo(b.x * 640, b.y * 480); context.stroke()
      }
    }
    hand.forEach(point => dot(point, '#fff'))
  }
}
