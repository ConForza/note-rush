import { describe, expect, it } from 'vitest'
import {
  createInitialGameProgress,
  applyProgressResult,
} from './gameProgress'

describe('game progression', () => {
  it('starts at Level 1 with no correct answers', () => {
    expect(createInitialGameProgress()).toEqual({
      stageIndex: 0,
      correctInStage: 0,
    })
  })

  it('increments progress without advancing before four correct answers', () => {
    const update = applyProgressResult(createInitialGameProgress(), 'correct')

    expect(update).toEqual({
      progress: { stageIndex: 0, correctInStage: 1 },
      advanced: false,
    })
  })

  it('advances exactly one stage on the fourth correct answer', () => {
    let progress = createInitialGameProgress()

    for (let index = 0; index < 3; index += 1) {
      progress = applyProgressResult(progress, 'correct').progress
    }

    const update = applyProgressResult(progress, 'correct')

    expect(update).toEqual({
      progress: { stageIndex: 1, correctInStage: 0 },
      advanced: true,
    })
  })

  it('preserves progress across incorrect and missed results', () => {
    const progress = { stageIndex: 0, correctInStage: 2 }

    expect(applyProgressResult(progress, 'incorrect')).toEqual({
      progress,
      advanced: false,
    })
    expect(applyProgressResult(progress, 'miss')).toEqual({
      progress,
      advanced: false,
    })
  })

  it('keeps the final stage stable after many correct results', () => {
    const progress = { stageIndex: 5, correctInStage: 0 }
    let current = progress

    for (let index = 0; index < 20; index += 1) {
      current = applyProgressResult(current, 'correct').progress
    }

    expect(current).toEqual(progress)
  })

  it('rejects malformed progress values', () => {
    expect(() =>
      applyProgressResult({ stageIndex: 99, correctInStage: 0 }, 'correct'),
    ).toThrow(RangeError)
    expect(() =>
      applyProgressResult({ stageIndex: 0, correctInStage: -1 }, 'correct'),
    ).toThrow(RangeError)
  })
})
