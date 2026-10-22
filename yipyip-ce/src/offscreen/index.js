let chimeInterval = null

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PLAY_CHIME') startChimeLoop()
})

function startChimeLoop() {
  const actx = new AudioContext()

  function scheduleChime() {
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, i) => {
      const osc = actx.createOscillator()
      const gain = actx.createGain()
      osc.connect(gain)
      gain.connect(actx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = actx.currentTime + i * 0.2
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
      osc.start(t)
      osc.stop(t + 1.0)
    })
  }

  scheduleChime()
  chimeInterval = setInterval(scheduleChime, 4000)
}
