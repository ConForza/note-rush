import {
  DIFFICULTY_STAGES,
  getDifficultyStage,
  isFinalDifficultyStage,
  type DifficultyStage,
} from './gameDifficulty'
import { type GameResult } from './gameStats'

export interface GameProgress {
  readonly stageIndex: number
  readonly correctInStage: number
}

export interface ProgressUpdate {
  readonly progress: GameProgress
  readonly advanced: boolean
  readonly campaignCompleted: boolean
}

export const createInitialGameProgress = (stageIndex = 0): GameProgress => ({
  stageIndex,
  correctInStage: 0,
})

const validateProgress = (progress: GameProgress): DifficultyStage => {
  if (
    !Number.isInteger(progress.stageIndex) ||
    !Number.isInteger(progress.correctInStage) ||
    progress.correctInStage < 0
  ) {
    throw new RangeError('Game progress values must be non-negative integers.')
  }

  return getDifficultyStage(progress.stageIndex)
}

export const applyProgressResult = (
  progress: GameProgress,
  result: GameResult,
): ProgressUpdate => {
  const stage = validateProgress(progress)

  if (result !== 'correct') {
    return { progress, advanced: false, campaignCompleted: false }
  }

  const nextCorrectInStage = progress.correctInStage + 1

  if (nextCorrectInStage < stage.correctHitsToAdvance) {
    return {
      progress: {
        ...progress,
        correctInStage: nextCorrectInStage,
      },
      advanced: false,
      campaignCompleted: false,
    }
  }

  if (isFinalDifficultyStage(progress.stageIndex)) {
    return {
      progress: {
        ...progress,
        correctInStage: nextCorrectInStage,
      },
      advanced: false,
      campaignCompleted: true,
    }
  }

  const nextStageIndex = progress.stageIndex + 1

  if (nextStageIndex >= DIFFICULTY_STAGES.length) {
    throw new Error('A non-final difficulty stage cannot advance past the curriculum.')
  }

  return {
    progress: {
      stageIndex: nextStageIndex,
      correctInStage: 0,
    },
    advanced: true,
    campaignCompleted: false,
  }
}
