export const INITIAL_GAME_TIME_MS = 30_000
export const ROUND_LIFETIME_MS = 2_500
export const CORRECT_TIME_BONUS_MS = 1_000
export const HIT_FEEDBACK_MS = 400
export const TIMER_REFRESH_MS = 100

export type ClockSource = () => number

export const createGameDeadline = (now: number, durationMs: number): number =>
  now + durationMs

export const getRemainingTime = (deadline: number, now: number): number =>
  Math.max(0, deadline - now)

export const addTimeToDeadline = (deadline: number, bonusMs: number): number =>
  deadline + bonusMs

export const formatRemainingSeconds = (remainingTimeMs: number): number =>
  remainingTimeMs <= 0 ? 0 : Math.ceil(remainingTimeMs / 1000)
