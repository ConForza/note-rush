import { describe, expect, it } from 'vitest'
import {
  addTimeToDeadline,
  createGameDeadline,
  formatRemainingSeconds,
  getRemainingTime,
} from './gameTimer'

describe('game timer helpers', () => {
  it('creates a deadline from a clock reading and duration', () => {
    expect(createGameDeadline(1_000, 30_000)).toBe(31_000)
  })

  it('calculates remaining time from the absolute deadline', () => {
    expect(getRemainingTime(31_000, 11_000)).toBe(20_000)
  })

  it('clamps expired time to zero', () => {
    expect(getRemainingTime(31_000, 40_000)).toBe(0)
  })

  it('adds a correct-answer bonus to the deadline', () => {
    expect(addTimeToDeadline(31_000, 1_000)).toBe(32_000)
  })

  it('formats active time with a whole-second ceiling', () => {
    expect(formatRemainingSeconds(30_000)).toBe(30)
    expect(formatRemainingSeconds(29_001)).toBe(30)
    expect(formatRemainingSeconds(29_000)).toBe(29)
    expect(formatRemainingSeconds(1)).toBe(1)
    expect(formatRemainingSeconds(0)).toBe(0)
    expect(formatRemainingSeconds(-1)).toBe(0)
  })
})
