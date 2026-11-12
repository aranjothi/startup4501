export async function loadFaceDetector() {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const asset = path => chrome.runtime.getURL(`mediapipe/${path}`)
  const vision = await FilesetResolver.forVisionTasks(asset('wasm'))
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: asset('face_landmarker.task'), delegate: 'CPU' },
    runningMode: 'VIDEO', numFaces: 1,
  })
}
