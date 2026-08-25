const NATURAL_NOTE_NAMES_SOURCE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

export type NoteName = (typeof NATURAL_NOTE_NAMES_SOURCE)[number]

export const NATURAL_NOTE_NAMES = Object.freeze(NATURAL_NOTE_NAMES_SOURCE)

export type Clef = 'treble' | 'bass'

export interface Pitch {
  note: NoteName
  octave: number
}

const getNotePosition = (note: NoteName): number => {
  const position = NATURAL_NOTE_NAMES.indexOf(note)

  if (position === -1) {
    throw new Error(`Unknown natural note name: ${note}`)
  }

  return position
}

const getDiatonicIndex = (pitch: Pitch): number =>
  pitch.octave * NATURAL_NOTE_NAMES.length + getNotePosition(pitch.note)

export const isSamePitch = (a: Pitch, b: Pitch): boolean =>
  a.note === b.note && a.octave === b.octave

export const comparePitches = (a: Pitch, b: Pitch): number =>
  getDiatonicIndex(a) - getDiatonicIndex(b)

export const formatPitch = (pitch: Pitch): string =>
  `${pitch.note}${pitch.octave}`
