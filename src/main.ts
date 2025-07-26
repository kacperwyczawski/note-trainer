import "./style.css";
import { PitchDetector } from "pitchy";

// Note sets
const ALL_NOTES = [
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
const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"];

// Utility: Get current note set selection from checkbox
function includeAccidentals(): boolean {
  const checkbox = document.getElementById(
    "include-accidentals",
  ) as HTMLInputElement | null;
  return !!(checkbox && checkbox.checked);
}

// Utility: Get notes for current note set
function getNotesForCurrentSet(): string[] {
  return includeAccidentals() ? ALL_NOTES : NATURAL_NOTES;
}

// Convert Hz to musical note name (e.g., A4, C#5)
function hzToNoteName(hz: number): string {
  if (!hz || hz <= 0) return "-";
  // Always use all 12 notes for pitch-to-note mapping, but filter display if naturals only
  const ALL_NOTE_NAMES = [
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
  const note = ALL_NOTE_NAMES[(midi + 1200) % 12];
  const octave = Math.floor(midi / 12) - 1;
  // If naturals only, filter out accidentals
  if (!includeAccidentals() && note.includes("#")) return "-";
  return `${note}${octave}`;
}

async function setupPitchDetection() {
  const settingsBottom = document.querySelector(".settings-bottom");
  if (!settingsBottom) return;

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    settingsBottom.textContent =
      "Microphone access is not supported in this browser or environment.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule("/pitch-processor.js");

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, "pitch-processor");
    source.connect(workletNode);

    const inputLength = 2048;
    const detector = PitchDetector.forFloat32Array(inputLength);

    workletNode.port.onmessage = (event: MessageEvent) => {
      const buffer = new Float32Array(event.data);
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
  } catch (err) {
    settingsBottom.textContent = "Microphone access denied or error: " + err;
  }
}

setupPitchDetection();

// Listen for checkbox changes to update note display immediately
const accCheckbox = document.getElementById("include-accidentals");
if (accCheckbox) {
  accCheckbox.addEventListener("change", () => {
    // Optionally, you could trigger a UI update here if needed
  });
}
