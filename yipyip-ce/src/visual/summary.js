const expressionNames = new Set(['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'browDownLeft', 'browDownRight', 'cheekSquintLeft', 'cheekSquintRight', 'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight'])
const pointOK = point => Number.isFinite(point?.x) && Number.isFinite(point?.y) && Math.abs(point.x) <= 2 && Math.abs(point.y) <= 2
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// Aggregate online. Raw frames/landmarks are never part of a saved summary.
export function createVisualReplySession({ now = () => performance.now() } = {}) {
  let active = null, pending = null
  function cancel() { active = null; pending = null }
  function finish() {
    if (!active) return
    const a = active, durationMs = Math.max(0, now() - a.startedAt)
    const measured = a.samples >= 5 && durationMs >= 1000 && a.coveredMs / durationMs >= .35 && (a.faces >= 3 || a.hands >= 3)
    pending = { version: 1, status: measured ? 'measured' : 'insufficient', durationMs: Math.round(durationMs), samples: a.samples,
      faceVisiblePercent: a.samples ? Math.round(a.faces / a.samples * 100) : 0,
      handsVisiblePercent: a.samples ? Math.round(a.hands / a.samples * 100) : 0,
      handMovement: a.handPairs < 3 ? 'unobserved' : a.movingPairs >= 3 ? 'observed' : 'little',
      facialMovement: a.expressionFrames < 3 ? 'unobserved' : [...a.expressions.values()].some(range => range.max - range.min >= .18) ? 'observed' : 'little',
    }
    active = null
  }
  return {
    status(status, reason) {
      if (status === 'requesting' || reason === 'cancel' || reason === 'error') { cancel(); return }
      if (status === 'recording' && !active) {
        pending = null
        active = { startedAt: now(), samples: 0, faces: 0, hands: 0, coveredMs: 0, previousAt: null, previousHands: new Map(), handPairs: 0, movingPairs: 0, expressions: new Map(), expressionFrames: 0 }
      }
      if (status === 'transcribing' || (status === 'idle' && reason === 'complete')) finish()
    },
    sample(observation) {
      if (!active || !Number.isFinite(observation.timestamp)) return
      const a = active, timestamp = observation.timestamp
      if (timestamp < a.startedAt || (a.previousAt !== null && timestamp <= a.previousAt)) return
      const dt = a.previousAt === null ? 0 : timestamp - a.previousAt
      if (dt > 0 && dt <= 600) a.coveredMs += Math.min(dt, 250)
      a.samples++
      const faceVisible = observation.faceLandmarks?.some(face => face.some(pointOK))
      if (faceVisible) {
        a.faces++
        let expressionSeen = false
        for (const category of observation.faceBlendshapes?.[0]?.categories ?? []) {
          if (!expressionNames.has(category.categoryName) || !Number.isFinite(category.score) || category.score < 0 || category.score > 1) continue
          const range = a.expressions.get(category.categoryName) ?? { min: 1, max: 0 }
          range.min = Math.min(range.min, category.score); range.max = Math.max(range.max, category.score)
          a.expressions.set(category.categoryName, range); expressionSeen = true
        }
        if (expressionSeen) a.expressionFrames++
      }
      const currentHands = new Map()
      let handsVisible = false
      for (const [index, points] of (observation.handLandmarks ?? []).entries()) {
        const palm = [0, 5, 9, 13, 17].map(i => points[i])
        if (!palm.every(pointOK)) continue
        handsVisible = true
        const label = observation.handedness?.[index]?.[0]
        if (!['Left', 'Right'].includes(label?.categoryName) || label.score < .5) continue
        const center = { x: palm.reduce((sum, p) => sum + p.x, 0) / 5, y: palm.reduce((sum, p) => sum + p.y, 0) / 5 }
        const scale = Math.max(.03, distance(points[0], points[9]), distance(points[5], points[17]))
        const previous = a.previousHands.get(label.categoryName)
        if (previous && dt > 0 && dt <= 600) {
          const movement = distance(center, previous.center) / Math.max(scale, previous.scale)
          if (movement <= 3) { a.handPairs++; if (movement >= .12) a.movingPairs++ }
        }
        currentHands.set(label.categoryName, { center, scale })
      }
      if (handsVisible) a.hands++
      a.previousHands = currentHands; a.previousAt = timestamp
    },
    take() { const result = pending; pending = null; return result },
    cancel,
  }
}
