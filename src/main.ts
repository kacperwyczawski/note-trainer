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

// Utility: Pick a random note from the current set
function pickRandomNote(): string {
  const notes = getNotesForCurrentSet();
  const idx = Math.floor(Math.random() * notes.length);
  return notes[idx];
}

// Utility: Extract note letter (without octave) from note name string (e.g., "C#4" -> "C#")
function extractNoteLetter(noteName: string): string {
  return noteName.replace(/[0-9\-]/g, "");
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

let currentTargetNote = ""; // The note the user should sing/play
let awaitingNext = false; // Prevent rapid-fire note changes

function displayTargetNote(note: string) {
  const center = document.querySelector(".center-letter");
  if (center) {
    center.textContent = note;
  }
}

let lastResultType: "check" | "x" | null = null;
let lastDetectedText: string = "";

function updateSettingsBottom() {
  const settingsBottom = document.querySelector(".settings-bottom");
  if (!settingsBottom) return;
  settingsBottom.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:0.3em;">
      <span style="font-size:1.1em;">${lastDetectedText}</span>
      ${
        lastResultType
          ? `<img src="/${lastResultType}.svg" alt="${lastResultType}" style="width:2.5em;height:2.5em;vertical-align:middle;" />`
          : ""
      }
    </div>
  `;
}

function setResult(type: "check" | "x", detectedText: string) {
  lastResultType = type;
  lastDetectedText = detectedText;
  updateSettingsBottom();
}

function setDetectedOnly(detectedText: string) {
  lastDetectedText = detectedText;
  updateSettingsBottom();
}

function resetResultDisplay() {
  lastResultType = null;
  lastDetectedText = "";
  updateSettingsBottom();
}

function selectAndDisplayNewNote() {
  currentTargetNote = pickRandomNote();
  displayTargetNote(currentTargetNote);
  resetResultDisplay();
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
      if (clarity > 0.95 && pitch) {
        noteName = hzToNoteName(pitch);
      }

      // Always show detected pitch and note name
      const pitchDisplay =
        pitch && clarity > 0.95 ? pitch.toFixed(2) + " Hz" : "-";
      const detectedText = `Detected: ${pitchDisplay} (${noteName})`;

      // Only check if a valid note is detected and not waiting for next note
      if (!awaitingNext && noteName !== "-") {
        const detectedLetter = extractNoteLetter(noteName);
        const targetLetter = currentTargetNote;
        if (detectedLetter === targetLetter) {
          setResult("check", detectedText);
          awaitingNext = true;
          setTimeout(() => {
            selectAndDisplayNewNote();
            awaitingNext = false;
          }, 1200);
        } else {
          setResult("x", detectedText);
        }
      } else if (!awaitingNext) {
        setDetectedOnly(detectedText);
      }
    };
  } catch (err) {
    settingsBottom.textContent = "Microphone access denied or error: " + err;
  }
}

// Initial note selection and pitch detection setup
selectAndDisplayNewNote();
setupPitchDetection();

// Listen for checkbox changes to update note display and pick new note
const accCheckbox = document.getElementById("include-accidentals");
if (accCheckbox) {
  accCheckbox.addEventListener("change", () => {
    selectAndDisplayNewNote();
  });
}
