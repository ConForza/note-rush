import { formatPitch } from '../domain'
import {
  DIFFICULTY_STAGES,
  getDifficultyStage,
  type DifficultyStage,
  type DifficultyStageId,
} from '../play/gameDifficulty'

export { DIFFICULTY_STAGES }
export type { DifficultyStageId } from '../play/gameDifficulty'

export type GameMode = 'arcade' | 'practice'
export type SessionTimerSeconds = 30 | 60 | 120 | null

export type GameSessionConfig =
  | {
      readonly mode: 'arcade'
      readonly timerSeconds: SessionTimerSeconds
    }
  | {
      readonly mode: 'practice'
      readonly timerSeconds: SessionTimerSeconds
      readonly stageId: DifficultyStageId
    }

export interface SessionRules {
  readonly usesLives: boolean
  readonly usesRoundDeadline: boolean
  readonly usesProgression: boolean
  readonly usesCorrectTimeBonus: boolean
}

export const DEFAULT_ARCADE_CONFIG: Extract<GameSessionConfig, { mode: 'arcade' }> = {
  mode: 'arcade',
  timerSeconds: 30,
}

export const DEFAULT_PRACTICE_CONFIG: Extract<GameSessionConfig, { mode: 'practice' }> = {
  mode: 'practice',
  stageId: 'treble-basics',
  timerSeconds: null,
}

export const SESSION_TIMER_OPTIONS: readonly SessionTimerSeconds[] = [
  null,
  30,
  60,
  120,
]

export const getSessionRules = (config: GameSessionConfig): SessionRules =>
  config.mode === 'arcade'
    ? {
        usesLives: true,
        usesRoundDeadline: true,
        usesProgression: true,
        usesCorrectTimeBonus: config.timerSeconds !== null,
      }
    : {
        usesLives: false,
        usesRoundDeadline: false,
        usesProgression: false,
        usesCorrectTimeBonus: false,
      }

export const getSessionStage = (
  config: GameSessionConfig,
  stageIndex: number,
): DifficultyStage =>
  config.mode === 'practice'
    ? getDifficultyStage(getSessionStageIndex(config))
    : getDifficultyStage(stageIndex)

export const getSessionStageIndex = (
  config: Extract<GameSessionConfig, { mode: 'practice' }>,
): number => {
  const stageIndex = DIFFICULTY_STAGES.findIndex(
    (stage) => stage.id === config.stageId,
  )

  if (stageIndex < 0) {
    throw new RangeError(`Unknown practice stage: ${config.stageId}`)
  }

  return stageIndex
}

export const getSessionTimerMs = (
  config: GameSessionConfig,
): number | null =>
  config.timerSeconds === null ? null : config.timerSeconds * 1_000

export const getStageRangeLabel = (stage: DifficultyStage): string => {
  const clefs = new Set(stage.promptPool.map((spec) => spec.clef))

  if (clefs.size > 1) {
    return 'Treble + Bass'
  }

  const [spec] = stage.promptPool

  if (!spec) {
    return ''
  }

  return `${formatPitch(spec.range.lowest)}–${formatPitch(spec.range.highest)}`
}
