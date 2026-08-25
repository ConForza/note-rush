import { describe, expect, it } from 'vitest'
import {
  NATURAL_NOTE_NAMES,
  comparePitches,
  formatPitch,
  isSamePitch,
  type Pitch,
} from './music'

const pitch = (note: Pitch['note'], octave: number): Pitch => ({
  note,
  octave,
})

describe('music domain values', () => {
  it('exposes natural note names in canonical order', () => {
    expect(NATURAL_NOTE_NAMES).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(Object.isFrozen(NATURAL_NOTE_NAMES)).toBe(true)
  })

  it('orders natural pitches within an octave', () => {
    expect(comparePitches(pitch('C', 4), pitch('D', 4))).toBeLessThan(0)
    expect(comparePitches(pitch('F', 4), pitch('B', 4))).toBeLessThan(0)
  })

  it('orders natural pitches across octave boundaries', () => {
    expect(comparePitches(pitch('B', 3), pitch('C', 4))).toBeLessThan(0)
    expect(comparePitches(pitch('B', 4), pitch('C', 5))).toBeLessThan(0)
  })

  it('recognises structurally equal pitches', () => {
    expect(comparePitches(pitch('C', 4), pitch('C', 4))).toBe(0)
    expect(isSamePitch(pitch('C', 4), pitch('C', 4))).toBe(true)
    expect(isSamePitch(pitch('C', 4), pitch('C', 5))).toBe(false)
    expect(isSamePitch(pitch('C', 4), pitch('D', 4))).toBe(false)
  })

  it('formats pitches using scientific pitch notation', () => {
    expect(formatPitch(pitch('C', 4))).toBe('C4')
    expect(formatPitch(pitch('B', 3))).toBe('B3')
  })
})
