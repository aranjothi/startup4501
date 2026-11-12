// Deterministic observations for the explicit visual-test build only.
// Uses synthetic video; this does not validate physical-camera model quality.
export async function loadVisualDetector() {
  let frame = 0
  return { close() {}, async detect() {
    frame++
    return {
      faceLandmarks: [Array.from({ length: 478 }, (_, i) => ({ x: .5 + .13 * Math.cos(i / 478 * Math.PI * 2), y: .35 + .18 * Math.sin(i / 478 * Math.PI * 2) }))],
      faceBlendshapes: [{ categories: [{ categoryName: 'browInnerUp', score: frame % 2 ? .15 : .5 }] }],
      handLandmarks: [Array.from({ length: 21 }, (_, i) => ({ x: .2 + (frame % 2 ? .03 : 0) + (i % 5) * .02, y: .6 + Math.floor(i / 5) * .02 }))],
      handedness: [[{ categoryName: 'Left', score: .99 }]],
    }
  } }
}
