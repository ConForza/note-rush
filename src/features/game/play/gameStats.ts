export const INITIAL_LIVES = 3
export const CORRECT_HIT_BASE_SCORE = 100
export const STREAK_SCORE_BONUS = 10

export interface GameStats {
  readonly score: number
  readonly streak: number
  readonly bestStreak: number
  readonly lives: number
}

export const createInitialGameStats = (): GameStats => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  lives: INITIAL_LIVES,
})

export const applyHitResult = (
  stats: GameStats,
  correct: boolean,
): GameStats => {
  if (correct) {
    const nextStreak = stats.streak + 1
    const scoreGained =
      CORRECT_HIT_BASE_SCORE + STREAK_SCORE_BONUS * stats.streak

    return {
      score: Math.max(0, stats.score) + scoreGained,
      streak: nextStreak,
      bestStreak: Math.max(0, stats.bestStreak, nextStreak),
      lives: Math.max(0, stats.lives),
    }
  }

  return {
    score: Math.max(0, stats.score),
    streak: 0,
    bestStreak: Math.max(0, stats.bestStreak),
    lives: Math.max(0, stats.lives - 1),
  }
}
