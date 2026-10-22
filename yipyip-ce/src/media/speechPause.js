export function speechPause({ silenceMs = 1500, threshold = 0.003 } = {}) {
  let voicedFrames = 0, heardSpeech = false, lastSpeech = 0
  function update(rms, now) {
    if (rms >= threshold) {
      voicedFrames++
      if (voicedFrames >= 2) heardSpeech = true
      lastSpeech = now
    } else voicedFrames = 0
    return { heardSpeech, stopped: heardSpeech && now - lastSpeech >= silenceMs }
  }
  // Recognition is stronger evidence than a volume heuristic. Brief fillers
  // and quiet words must not be rejected for missing two loud audio frames.
  update.confirmSpeech = now => { heardSpeech = true; lastSpeech = now }
  return update
}
