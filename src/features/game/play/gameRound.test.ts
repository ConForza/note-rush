import { describe, expect, it } from 'vitest'
import { type NotePrompt } from '../domain'
import {
  ACTIVE_TARGET_COUNT,
  createGamePrompt,
  createGameRound,
  createGameTargets,
  GAME_BOARD_SLOTS,
  isCorrectAnswer,
  sampleWithoutReplacement,
} from './gameRound'

const prompt = (
  note: NotePrompt['pitch']['note'],
  octave: number,
): NotePrompt => ({
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

  it('creates a deterministic round with one correct target and two decoys', () => {
    const round = createGameRound(() => 0)

    expect(round).toEqual({
      prompt: prompt('C', 4),
      targets: [
        { id: 'slot-0', slot: 0, note: 'D', isCorrect: false },
        { id: 'slot-1', slot: 1, note: 'E', isCorrect: false },
        { id: 'slot-2', slot: 2, note: 'C', isCorrect: true },
      ],
    })
  })

  it('keeps every generated target and slot unique', () => {
    const round = createGameRound(() => 0.42)
    const targetNotes = round.targets.map((target) => target.note)
    const targetSlots = round.targets.map((target) => target.slot)

    expect(round.targets).toHaveLength(ACTIVE_TARGET_COUNT)
    expect(new Set(targetNotes).size).toBe(ACTIVE_TARGET_COUNT)
    expect(new Set(targetSlots).size).toBe(ACTIVE_TARGET_COUNT)
    expect(round.targets.every((target) => GAME_BOARD_SLOTS.includes(target.slot))).toBe(
      true,
    )
    expect(round.targets.filter((target) => target.isCorrect)).toHaveLength(1)
    expect(
      round.targets.find((target) => target.isCorrect)?.note,
    ).toBe(round.prompt.pitch.note)
  })

  it('selects decoys that differ from the answer', () => {
    const targets = createGameTargets(prompt('C', 4), () => 0)

    expect(targets.filter((target) => !target.isCorrect).map((target) => target.note)).toEqual([
      'D',
      'E',
    ])
    expect(targets.every((target) => target.note !== 'C' || target.isCorrect)).toBe(true)
  })

  it('allows the correct target to appear in different slots', () => {
    const lowRandomRound = createGameRound(() => 0)
    const highRandomRound = createGameRound(() => 1 - Number.EPSILON)

    expect(
      lowRandomRound.targets.find((target) => target.isCorrect)?.slot,
    ).not.toBe(highRandomRound.targets.find((target) => target.isCorrect)?.slot)
  })

  it('retains the inclusive C4–C5 prompt range', () => {
    expect(createGamePrompt(() => 0)).toEqual(prompt('C', 4))
    expect(createGamePrompt(() => 1 - Number.EPSILON)).toEqual(prompt('C', 5))
  })

  it('samples without mutating the source collection', () => {
    const source = ['C', 'D', 'E', 'F'] as const
    const result = sampleWithoutReplacement(source, 2, () => 0)

    expect(result).toEqual(['C', 'D'])
    expect(source).toEqual(['C', 'D', 'E', 'F'])
  })

  it('rejects impossible sample sizes', () => {
    expect(() => sampleWithoutReplacement(['C', 'D'], 3, () => 0)).toThrow(
      RangeError,
    )
  })
})
