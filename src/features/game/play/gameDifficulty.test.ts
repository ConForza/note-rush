import { describe, expect, it } from 'vitest'
import {
  CORRECT_HITS_TO_ADVANCE,
  DIFFICULTY_STAGES,
  getDifficultyStage,
} from './gameDifficulty'

const range = (
  lowest: string,
  highest: string,
): { lowest: { note: string; octave: number }; highest: { note: string; octave: number } } => ({
  lowest: { note: lowest[0] as never, octave: Number(lowest[1]) },
  highest: { note: highest[0] as never, octave: Number(highest[1]) },
})

describe('difficulty curriculum', () => {
  it('defines the six ordered stages with unique IDs', () => {
    expect(DIFFICULTY_STAGES.map((stage) => stage.level)).toEqual([1, 2, 3, 4, 5, 6])
    expect(DIFFICULTY_STAGES.map((stage) => stage.id)).toEqual([
      'treble-basics',
      'treble-extended',
      'treble-challenge',
      'bass-basics',
      'bass-extended',
      'mixed-clefs',
    ])
    expect(new Set(DIFFICULTY_STAGES.map((stage) => stage.id)).size).toBe(6)
  })

  it.each([
    ['treble-basics', 1, 'Treble Basics', 'treble', 'E4', 'D5', 3_000],
    ['treble-extended', 2, 'Treble Extended', 'treble', 'C4', 'F5', 2_750],
    ['treble-challenge', 3, 'Treble Challenge', 'treble', 'C4', 'A5', 2_500],
    ['bass-basics', 4, 'Bass Basics', 'bass', 'G2', 'F3', 3_000],
    ['bass-extended', 5, 'Bass Extended', 'bass', 'E2', 'C4', 2_750],
    ['mixed-clefs', 6, 'Mixed Clefs', 'mixed', 'C4/E2', 'A5/C4', 2_500],
  ])(
    'configures %s correctly',
    (id, level, label, clef, lowest, highest, lifetime) => {
      const stage = DIFFICULTY_STAGES.find((candidate) => candidate.id === id)

      expect(stage).toBeDefined()
      expect(stage?.level).toBe(level)
      expect(stage?.label).toBe(label)
      expect(stage?.roundLifetimeMs).toBe(lifetime)
      expect(stage?.correctHitsToAdvance).toBe(
        level === 6 ? null : CORRECT_HITS_TO_ADVANCE,
      )

      if (level === 6) {
        expect(stage?.promptPool.map((spec) => spec.clef)).toEqual(['treble', 'bass'])
        expect(stage?.promptPool.map((spec) => `${spec.range.lowest.note}${spec.range.lowest.octave}`)).toEqual(['C4', 'E2'])
        expect(stage?.promptPool.map((spec) => `${spec.range.highest.note}${spec.range.highest.octave}`)).toEqual(['A5', 'C4'])
      } else {
        expect(stage?.promptPool).toHaveLength(1)
        expect(stage?.promptPool[0]?.clef).toBe(clef)
        expect(stage?.promptPool[0]?.range).toEqual(range(lowest, highest))
      }
    },
  )

  it('returns a clear error for an invalid stage index', () => {
    expect(() => getDifficultyStage(-1)).toThrow(RangeError)
    expect(() => getDifficultyStage(DIFFICULTY_STAGES.length)).toThrow(RangeError)
  })
})
