import {
  NATURAL_NOTE_NAMES,
  type Pitch,
  comparePitches,
  formatPitch,
} from './music'

export interface PitchRange {
  lowest: Pitch
  highest: Pitch
}

export const validatePitchRange = (range: PitchRange): void => {
  if (comparePitches(range.lowest, range.highest) > 0) {
    throw new RangeError(
      `Invalid pitch range: lowest pitch ${formatPitch(range.lowest)} ` +
        `must not be higher than highest pitch ${formatPitch(range.highest)}.`,
    )
  }
}

const getNextNaturalPitch = (pitch: Pitch): Pitch => {
  const notePosition = NATURAL_NOTE_NAMES.indexOf(pitch.note)

  if (notePosition === NATURAL_NOTE_NAMES.length - 1) {
    return { note: 'C', octave: pitch.octave + 1 }
  }

  const nextNote = NATURAL_NOTE_NAMES[notePosition + 1]

  if (!nextNote) {
    throw new Error(`Unable to find the next natural note after ${pitch.note}.`)
  }

  return { note: nextNote, octave: pitch.octave }
}

export const enumeratePitches = (range: PitchRange): Pitch[] => {
  validatePitchRange(range)

  const pitches: Pitch[] = []
  let currentPitch: Pitch = { ...range.lowest }

  while (comparePitches(currentPitch, range.highest) <= 0) {
    pitches.push({ ...currentPitch })
    currentPitch = getNextNaturalPitch(currentPitch)
  }

  return pitches
}
