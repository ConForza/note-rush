import { type RandomSource } from '../domain'
import { type GameTarget } from './gameRound'
import {
  TARGET_EMERGENCE_DURATION_MS,
  TARGET_EMERGENCE_STAGGER_MS,
} from './Target'

export const ROUND_ANTICIPATION_MIN_MS = 180
export const ROUND_ANTICIPATION_MAX_MS = 260

export type TargetEmergenceDelays = Readonly<Record<string, number>>

export interface TargetEmergenceSchedule {
  delaysByTargetId: TargetEmergenceDelays
  readyDelayMs: number
}

const getRandomIndex = (length: number, random: RandomSource): number => {
  if (length <= 0) {
    return 0
  }

  const value = random()

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      `Random source must return a finite number in the range [0, 1), received ${value}.`,
    )
  }

  return Math.floor(value * length)
}

const shuffleTargets = (
  targets: readonly GameTarget[],
  random: RandomSource,
): GameTarget[] => {
  const shuffled = [...targets]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1, random)
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

export const createTargetEmergenceSchedule = (
  targets: readonly GameTarget[],
  random: RandomSource = Math.random,
  reducedMotion = false,
): TargetEmergenceSchedule => {
  if (reducedMotion || targets.length === 0) {
    return {
      delaysByTargetId: Object.fromEntries(
        targets.map((target) => [target.id, 0]),
      ),
      readyDelayMs: 0,
    }
  }

  const anticipationRandomValue = random()

  if (
    !Number.isFinite(anticipationRandomValue) ||
    anticipationRandomValue < 0 ||
    anticipationRandomValue >= 1
  ) {
    throw new RangeError(
      `Random source must return a finite number in the range [0, 1), received ${anticipationRandomValue}.`,
    )
  }

  const anticipationDelay =
    ROUND_ANTICIPATION_MIN_MS +
    Math.floor(
      anticipationRandomValue *
        (ROUND_ANTICIPATION_MAX_MS - ROUND_ANTICIPATION_MIN_MS + 1),
    )
  const orderedTargets = shuffleTargets(targets, random)
  const delaysByTargetId = Object.fromEntries(
    orderedTargets.map((target, index) => [
      target.id,
      anticipationDelay + index * TARGET_EMERGENCE_STAGGER_MS,
    ]),
  )

  return {
    delaysByTargetId,
    readyDelayMs:
      anticipationDelay +
      (targets.length - 1) * TARGET_EMERGENCE_STAGGER_MS +
      TARGET_EMERGENCE_DURATION_MS,
  }
}
