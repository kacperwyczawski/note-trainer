class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 2048;
  }

  process(inputs) {
    const input = inputs[0][0];
    if (input) {
      // Append input samples to buffer
      for (let i = 0; i < input.length; i++) {
        this._buffer.push(input[i]);
      }
      // When buffer is full, send to main thread and remove from buffer
      while (this._buffer.length >= this._bufferSize) {
        const chunk = this._buffer.slice(0, this._bufferSize);
        this._buffer = this._buffer.slice(this._bufferSize);
        this.port.postMessage(chunk);
      }
    }
    return true;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
