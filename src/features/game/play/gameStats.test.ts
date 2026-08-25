import { describe, expect, it } from 'vitest'
import {
  applyHitResult,
  createInitialGameStats,
  INITIAL_LIVES,
} from './gameStats'

describe('game stats', () => {
  it('creates a fresh run with the initial values', () => {
    expect(createInitialGameStats()).toEqual({
      score: 0,
      streak: 0,
      bestStreak: 0,
      lives: INITIAL_LIVES,
    })
  })

  it('awards base points and starts a streak on a correct hit', () => {
    expect(applyHitResult(createInitialGameStats(), true)).toEqual({
      score: 100,
      streak: 1,
      bestStreak: 1,
      lives: 3,
    })
  })

  it('uses the previous streak for consecutive-hit bonuses', () => {
    const first = applyHitResult(createInitialGameStats(), true)
    const second = applyHitResult(first, true)
    const third = applyHitResult(second, true)

    expect(second).toEqual({
      score: 210,
      streak: 2,
      bestStreak: 2,
      lives: 3,
    })
    expect(third).toEqual({
      score: 330,
      streak: 3,
      bestStreak: 3,
      lives: 3,
    })
  })

  it('resets the current streak and removes one life without changing score', () => {
    expect(
      applyHitResult(
        { score: 330, streak: 3, bestStreak: 3, lives: 3 },
        false,
      ),
    ).toEqual({
      score: 330,
      streak: 0,
      bestStreak: 3,
      lives: 2,
    })
  })

  it('uses the reset streak for the next correct score', () => {
    const afterMistake = applyHitResult(
      { score: 210, streak: 2, bestStreak: 2, lives: 2 },
      false,
    )

    expect(applyHitResult(afterMistake, true)).toEqual({
      score: 310,
      streak: 1,
      bestStreak: 2,
      lives: 1,
    })
  })

  it('preserves a higher best streak after a mistake and extends it when exceeded', () => {
    const afterMistake = applyHitResult(
      { score: 500, streak: 4, bestStreak: 5, lives: 2 },
      false,
    )
    const nextCorrect = applyHitResult(
      { ...afterMistake, streak: 4 },
      true,
    )
    const newBest = applyHitResult(nextCorrect, true)

    expect(afterMistake.bestStreak).toBe(5)
    expect(nextCorrect.bestStreak).toBe(5)
    expect(newBest.bestStreak).toBe(6)
  })

  it('clamps lives at zero and never produces a negative score', () => {
    expect(
      applyHitResult({ score: -10, streak: 0, bestStreak: 0, lives: 0 }, false),
    ).toEqual({ score: 0, streak: 0, bestStreak: 0, lives: 0 })
  })
})
