import { describe, expect, it } from 'vitest'
import { createTargetEmergenceSchedule } from './targetEmergence'
import { type GameTarget } from './gameRound'

const targets: readonly GameTarget[] = [
  { id: 'a', slot: 0, note: 'C', isCorrect: true },
  { id: 'b', slot: 2, note: 'D', isCorrect: false },
  { id: 'c', slot: 5, note: 'E', isCorrect: false },
]

const sequence = (...values: number[]) => {
  let index = 0

  return (): number => values[Math.min(index++, values.length - 1)] ?? 0
}

describe('createTargetEmergenceSchedule', () => {
  it('uses the randomized anticipation and exact final emergence boundary', () => {
    const schedule = createTargetEmergenceSchedule(targets, sequence(0, 0, 0))

    expect(schedule.readyDelayMs).toBe(580)
    expect(schedule.delaysByTargetId).toEqual({
      a: 300,
      b: 180,
      c: 240,
    })
  })

  it('supports the full normal-motion anticipation range', () => {
    const schedule = createTargetEmergenceSchedule(
      targets,
      sequence(0.999, 0.999, 0.999),
    )

    expect(schedule.readyDelayMs).toBe(660)
    expect(Object.values(schedule.delaysByTargetId).sort((a, b) => a - b)).toEqual([
      260,
      320,
      380,
    ])
  })

  it('makes targets immediately ready when reduced motion is enabled', () => {
    const schedule = createTargetEmergenceSchedule(
      targets,
      () => 0.5,
      true,
    )

    expect(schedule.readyDelayMs).toBe(0)
    expect(schedule.delaysByTargetId).toEqual({ a: 0, b: 0, c: 0 })
  })
})

