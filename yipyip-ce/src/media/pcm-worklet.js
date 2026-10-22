class VoicePCM extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Int16Array(2400)
    this.offset = 0
    this.energy = 0
    this.port.onmessage = ({ data }) => {
      if (data === 'flush') { this.flush(); this.port.postMessage({ flushed: true }) }
    }
  }
  flush() {
    if (!this.offset) return
    const frame = this.buffer.slice(0, this.offset)
    this.port.postMessage({ pcm: frame.buffer, rms: Math.sqrt(this.energy / this.offset) }, [frame.buffer])
    this.offset = 0; this.energy = 0
  }
  process(inputs) {
    const samples = inputs[0]?.[0]
    if (samples) for (const value of samples) {
      const clamped = Math.max(-1, Math.min(1, value))
      this.buffer[this.offset++] = Math.round(clamped * (clamped < 0 ? 32768 : 32767))
      this.energy += value * value
      if (this.offset === this.buffer.length) this.flush()
    }
    return true
  }
}
registerProcessor('voice-pcm', VoicePCM)
