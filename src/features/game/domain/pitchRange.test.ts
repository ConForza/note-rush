import { describe, expect, it } from 'vitest'
import {
  enumeratePitches,
  validatePitchRange,
  type PitchRange,
} from './pitchRange'
import { formatPitch, type Pitch } from './music'

const pitch = (note: Pitch['note'], octave: number): Pitch => ({
  note,
  octave,
})

const formattedPitches = (range: PitchRange): string[] =>
  enumeratePitches(range).map(formatPitch)

describe('inclusive pitch ranges', () => {
  it('enumerates a single-note range', () => {
    expect(formattedPitches({ lowest: pitch('C', 4), highest: pitch('C', 4) })).toEqual([
      'C4',
    ])
  })

  it('enumerates a same-octave range inclusively', () => {
    expect(formattedPitches({ lowest: pitch('C', 4), highest: pitch('G', 4) })).toEqual([
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
    ])
  })

  it('enumerates a range across an octave boundary', () => {
    expect(formattedPitches({ lowest: pitch('B', 3), highest: pitch('D', 4) })).toEqual([
      'B3',
      'C4',
      'D4',
    ])
  })

  it('enumerates a larger range across multiple octave boundaries', () => {
    expect(
      formattedPitches({ lowest: pitch('F', 3), highest: pitch('C', 5) }),
    ).toEqual([
      'F3',
      'G3',
      'A3',
      'B3',
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
    ])
  })

  it('rejects a reversed range explicitly', () => {
    const reversedRange: PitchRange = {
      lowest: pitch('G', 4),
      highest: pitch('C', 4),
    }

    expect(() => validatePitchRange(reversedRange)).toThrowError(RangeError)
    expect(() => enumeratePitches(reversedRange)).toThrow(
      'lowest pitch G4 must not be higher than highest pitch C4',
    )
  })

  it('does not mutate the caller-owned range or its endpoints', () => {
    const range: PitchRange = {
      lowest: pitch('B', 3),
      highest: pitch('D', 4),
    }

    const result = enumeratePitches(range)
    result[0].note = 'A'
    result[0].octave = 8

    expect(range).toEqual({ lowest: pitch('B', 3), highest: pitch('D', 4) })
  })
})
