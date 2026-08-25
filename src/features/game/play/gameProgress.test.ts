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
      campaignCompleted: false,
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
      campaignCompleted: false,
    })
  })

  it('advances through Levels 1–5 without skipping a stage', () => {
    let progress = createInitialGameProgress()

    for (let stageIndex = 0; stageIndex < 5; stageIndex += 1) {
      for (let hit = 0; hit < 3; hit += 1) {
        progress = applyProgressResult(progress, 'correct').progress
      }

      const update = applyProgressResult(progress, 'correct')

      expect(update).toEqual({
        progress: { stageIndex: stageIndex + 1, correctInStage: 0 },
        advanced: true,
        campaignCompleted: false,
      })
      progress = update.progress
    }
  })

  it('preserves progress across incorrect and missed results', () => {
    const progress = { stageIndex: 0, correctInStage: 2 }

    expect(applyProgressResult(progress, 'incorrect')).toEqual({
      progress,
      advanced: false,
      campaignCompleted: false,
    })
    expect(applyProgressResult(progress, 'miss')).toEqual({
      progress,
      advanced: false,
      campaignCompleted: false,
    })
  })

  it('completes the campaign on the fourth correct answer in the final stage', () => {
    const progress = { stageIndex: 5, correctInStage: 0 }
    let current = progress

    for (let index = 0; index < 3; index += 1) {
      const update = applyProgressResult(current, 'correct')
      expect(update.advanced).toBe(false)
      expect(update.campaignCompleted).toBe(false)
      current = update.progress
    }

    expect(applyProgressResult(current, 'correct')).toEqual({
      progress: { stageIndex: 5, correctInStage: 4 },
      advanced: false,
      campaignCompleted: true,
    })
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
