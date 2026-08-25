import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ARCADE_CONFIG,
  DEFAULT_PRACTICE_CONFIG,
  getSessionRules,
  getSessionStage,
  getSessionTimerMs,
  getStageRangeLabel,
} from './gameSession'

describe('game session rules', () => {
  it('keeps Arcade timed defaults and rules', () => {
    expect(getSessionTimerMs(DEFAULT_ARCADE_CONFIG)).toBe(30_000)
    expect(getSessionRules(DEFAULT_ARCADE_CONFIG)).toEqual({
      usesLives: true,
      usesRoundDeadline: true,
      usesProgression: true,
      usesCorrectTimeBonus: true,
    })
  })

  it('makes Practice fixed, life-free, and untimed by default', () => {
    expect(getSessionTimerMs(DEFAULT_PRACTICE_CONFIG)).toBeNull()
    expect(getSessionStage(DEFAULT_PRACTICE_CONFIG, 0).id).toBe('treble-basics')
    expect(getSessionRules(DEFAULT_PRACTICE_CONFIG)).toEqual({
      usesLives: false,
      usesRoundDeadline: false,
      usesProgression: false,
      usesCorrectTimeBonus: false,
    })
  })

  it('describes curriculum ranges from the authoritative stages', () => {
    expect(getStageRangeLabel(getSessionStage({
      mode: 'practice',
      stageId: 'bass-basics',
      timerSeconds: null,
    }, 0))).toBe('G2–F3')
    expect(getStageRangeLabel(getSessionStage({
      mode: 'practice',
      stageId: 'mixed-clefs',
      timerSeconds: null,
    }, 0))).toBe('Treble + Bass')
  })
})

