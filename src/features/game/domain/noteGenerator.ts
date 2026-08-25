import {
  type Clef,
  type Pitch,
} from './music'
import {
  type PitchRange,
  enumeratePitches,
} from './pitchRange'

export type RandomSource = () => number

export interface NotePrompt {
  pitch: Pitch
  clef: Clef
}

export interface CreateNotePromptOptions {
  clef: Clef
  range: PitchRange
  random?: RandomSource
}

const assertValidRandomValue = (value: number): void => {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      `Random source must return a finite number in the range [0, 1), received ${value}.`,
    )
  }
}

export const pickRandomPitch = (
  range: PitchRange,
  random: RandomSource = Math.random,
): Pitch => {
  const pitches = enumeratePitches(range)
  const randomValue = random()

  assertValidRandomValue(randomValue)

  const selectedPitch = pitches[Math.floor(randomValue * pitches.length)]

  if (!selectedPitch) {
    throw new Error('Unable to select a pitch from the supplied range.')
  }

  return { ...selectedPitch }
}

export const createNotePrompt = ({
  clef,
  range,
  random = Math.random,
}: CreateNotePromptOptions): NotePrompt => ({
  pitch: pickRandomPitch(range, random),
  clef,
})
