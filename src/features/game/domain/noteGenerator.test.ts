import { describe, expect, it } from 'vitest'
import {
  createNotePrompt,
  pickRandomPitch,
} from './noteGenerator'
import { formatPitch, type Pitch } from './music'
import type { PitchRange } from './pitchRange'

const pitch = (note: Pitch['note'], octave: number): Pitch => ({
  note,
  octave,
})

const range: PitchRange = {
  lowest: pitch('C', 4),
  highest: pitch('G', 4),
}

describe('note generation', () => {
  it('selects the first pitch at the lower random boundary', () => {
    expect(formatPitch(pickRandomPitch(range, () => 0))).toBe('C4')
  })

  it('selects a middle pitch deterministically', () => {
    expect(formatPitch(pickRandomPitch(range, () => 0.5))).toBe('E4')
  })

  it('selects the last pitch at the upper usable boundary', () => {
    expect(
      formatPitch(pickRandomPitch(range, () => 1 - Number.EPSILON)),
    ).toBe('G4')
  })

  it('rejects random values outside the Math.random contract', () => {
    expect(() => pickRandomPitch(range, () => -Number.EPSILON)).toThrow(
      RangeError,
    )
    expect(() => pickRandomPitch(range, () => 1)).toThrow(RangeError)
    expect(() => pickRandomPitch(range, () => Number.NaN)).toThrow(RangeError)
  })

  it('creates a treble prompt with the supplied clef', () => {
    expect(
      createNotePrompt({ clef: 'treble', range, random: () => 0.5 }),
    ).toEqual({ pitch: pitch('E', 4), clef: 'treble' })
  })

  it('creates a bass prompt without deriving the clef from the pitch', () => {
    expect(
      createNotePrompt({ clef: 'bass', range, random: () => 0 }),
    ).toEqual({ pitch: pitch('C', 4), clef: 'bass' })
  })

  it('does not mutate the caller-owned range while creating a prompt', () => {
    const originalRange: PitchRange = {
      lowest: pitch('B', 3),
      highest: pitch('D', 4),
    }

    createNotePrompt({ clef: 'treble', range: originalRange, random: () => 0 })

    expect(originalRange).toEqual({
      lowest: pitch('B', 3),
      highest: pitch('D', 4),
    })
  })
})
