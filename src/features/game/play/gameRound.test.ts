import { describe, expect, it } from 'vitest'
import { type NotePrompt } from '../domain'
import {
  createGamePrompt,
  createGameRound,
  isCorrectAnswer,
} from './gameRound'

const prompt = (note: NotePrompt['pitch']['note'], octave: number): NotePrompt => ({
  pitch: { note, octave },
  clef: 'treble',
})

describe('game round domain logic', () => {
  it('accepts the matching note name regardless of octave', () => {
    expect(isCorrectAnswer(prompt('C', 4), 'C')).toBe(true)
    expect(isCorrectAnswer(prompt('C', 5), 'C')).toBe(true)
    expect(isCorrectAnswer(prompt('B', 4), 'B')).toBe(true)
  })

  it('rejects a different note name', () => {
    expect(isCorrectAnswer(prompt('C', 4), 'D')).toBe(false)
  })

  it('creates the configured first game prompt deterministically', () => {
    expect(createGamePrompt(() => 0)).toEqual(prompt('C', 4))
  })

  it('creates the configured last game prompt deterministically', () => {
    expect(createGamePrompt(() => 1 - Number.EPSILON)).toEqual(prompt('C', 5))
  })

  it('creates a round containing a treble prompt', () => {
    expect(createGameRound(() => 0).prompt.clef).toBe('treble')
  })
})
