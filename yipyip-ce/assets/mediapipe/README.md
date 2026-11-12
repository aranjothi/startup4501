`face_landmarker.task` is the official MediaPipe Face Landmarker float16 model,
version 1, downloaded from:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

The production build packages this model and the installed `@mediapipe/tasks-vision`
WASM runtime for local camera presence checks. No CDN is needed at runtime.
See https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker for
the model documentation and applicable license information.


## Build integration

The face model lives in `assets/mediapipe/face_landmarker.task`.
The hand model is the official MediaPipe Hand Landmarker float16 model, version 1,
stored at `assets/mediapipe/hand_landmarker.task` and downloaded from:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
 `vite.config.js`
emits both models under `dist/mediapipe/` and copies the SIMD and non-SIMD
runtime files from the installed `@mediapipe/tasks-vision/wasm` directory to
`dist/mediapipe/wasm/`. Work Mode uses `src/work/faceDetector.js`. Optional conversation tracking uses
`src/visual/vision.worker.js` for face blendshapes, transformation matrices, and
two-hand landmarks, off the main UI thread.

The old `npm run setup-mediapipe` script copies files into ignored
`public/mediapipe/`; that directory is not used by the current production build
(`publicDir` is disabled). A normal `npm ci` followed by `npm run build` uses the
checked-in model and installed runtime directly.

These assets support local face-presence checks for Work Mode and local
face/hand observations in the conversation preview. Recorded replies receive
local aggregate visibility and movement summaries; this is not AI coaching. These assets do
not verify task completion or identity, or infer emotions or gesture meaning.
No camera frames or landmarks are stored or sent to the server.

The explicit `camera-test` build substitutes `tests/work-camera-detector.js` for
the Work Mode loader. The `visual-test` build substitutes
`tests/visual-detector.js` for the conversation loader. Run `npm run build` after browser-fixture testing to restore the real
detector and remove test-only code before loading or sharing `dist/`.
