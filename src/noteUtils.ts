export const NOTE_SET = [
  { english: "C", german: "C" },
  { english: "C#", german: "Cis" },
  { english: "D", german: "D" },
  { english: "D#", german: "Dis" },
  { english: "E", german: "E" },
  { english: "F", german: "F" },
  { english: "F#", german: "Fis" },
  { english: "G", german: "G" },
  { english: "G#", german: "Gis" },
  { english: "A", german: "A" },
  { english: "A#", german: "Ais" },
  { english: "B", german: "H" }, // English B is German H
];

export interface NoteOptions {
  includeAccidentals: boolean;
  useGermanNotation: boolean;
}

/**
 * Returns an array of note names in the selected notation and accidental mode.
 * @param options.includeAccidentals - Whether to include sharps (accidentals)
 * @param options.useGermanNotation - Whether to use German notation (otherwise English)
 */
export function getNotes(options: NoteOptions): string[] {
  const key = options.useGermanNotation ? "german" : "english";
  let notes = NOTE_SET.map(n => n[key]);
  if (!options.includeAccidentals) {
    notes = notes.filter((_, i) => [0, 2, 4, 5, 7, 9, 11].includes(i));
  }
  return notes;
}
