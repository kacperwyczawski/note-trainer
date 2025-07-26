import "./style.css";
import { PitchDetector } from "pitchy";

// Utility: Convert Hz to note name
function hzToNoteName(hz: number): string {
  if (!hz || hz <= 0) return "-";
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const A4 = 440;
  const semitones = 12 * Math.log2(hz / A4);
  const midi = Math.round(69 + semitones);
  const note = noteNames[(midi + 1200) % 12]; // +1200 to handle negatives
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

async function setupPitchDetection() {
  const settingsBottom = document.querySelector(".settings-bottom");
  if (!settingsBottom) return;

  // Request mic access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  // Buffer size and detector
  const inputLength = 2048;
  const detector = PitchDetector.forFloat32Array(inputLength);

  // Create ScriptProcessorNode for audio analysis
  const processor = audioContext.createScriptProcessor(inputLength, 1, 1);

  source.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    // Copy to new Float32Array (pitchy expects a real array, not a view)
    const buffer = new Float32Array(input);
    const [pitch, clarity] = detector.findPitch(
      buffer,
      audioContext.sampleRate,
    );

    let noteName = "-";
    let pitchDisplay = "-";
    if (clarity > 0.95 && pitch) {
      noteName = hzToNoteName(pitch);
      pitchDisplay = pitch.toFixed(2) + " Hz";
    }
    settingsBottom.textContent = `Detected: ${pitchDisplay} (${noteName})`;
  };
}

setupPitchDetection().catch((err) => {
  const settingsBottom = document.querySelector(".settings-bottom");
  if (settingsBottom) {
    settingsBottom.textContent = "Microphone access denied or error: " + err;
  }
});
