import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

let face, hands
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const vision = await FilesetResolver.forVisionTasks(data.assets.wasm)
      face = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: data.assets.face, delegate: 'CPU' }, runningMode: 'VIDEO', numFaces: 1,
        outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
      })
      hands = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: data.assets.hands, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 2,
      })
      self.postMessage({ type: 'ready' })
    }
    if (data.type === 'frame') {
      try {
        const facial = face.detectForVideo(data.bitmap, data.timestamp)
        const hand = hands.detectForVideo(data.bitmap, data.timestamp)
        self.postMessage({ type: 'result', id: data.id, observation: {
          faceLandmarks: facial.faceLandmarks, faceBlendshapes: facial.faceBlendshapes,
          facialTransformationMatrixes: facial.facialTransformationMatrixes,
          handLandmarks: hand.landmarks, handedness: hand.handedness,
        } })
      } finally { data.bitmap.close() }
    }
  } catch {
    face?.close(); hands?.close(); face = null; hands = null
    self.postMessage({ type: 'error', message: 'Visual tracking is unavailable. Please retry.' })
  }
}
