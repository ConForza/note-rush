import {
  createNotePrompt,
  NATURAL_NOTE_NAMES,
  type NoteName,
  type NotePrompt,
  type RandomSource,
} from '../domain'
import {
  getDifficultyStage,
  type DifficultyStage,
} from './gameDifficulty'

export const GAME_BOARD_SLOTS = Object.freeze([0, 1, 2, 3, 4, 5])
export const ACTIVE_TARGET_COUNT = 3

export interface GameTarget {
  readonly id: string
  readonly slot: number
  readonly note: NoteName
  readonly isCorrect: boolean
}

export interface GameRound {
  readonly prompt: NotePrompt
  readonly targets: readonly GameTarget[]
}

export type GameRoundFactory = (stage: DifficultyStage) => GameRound

const getRandomIndex = (length: number, random: RandomSource): number => {
  const value = random()

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      `Random source must return a finite number in the range [0, 1), received ${value}.`,
    )
  }

  return Math.floor(value * length)
}

export const sampleWithoutReplacement = <T>(
  items: readonly T[],
  count: number,
  random: RandomSource,
): T[] => {
  if (!Number.isInteger(count) || count < 0 || count > items.length) {
    throw new RangeError(
      `Cannot sample ${count} items from a collection of ${items.length}.`,
    )
  }

  const available = [...items]

  for (let index = 0; index < count; index += 1) {
    const randomIndex =
      index + getRandomIndex(available.length - index, random)
    const selected = available[index]

    available[index] = available[randomIndex] as T
    available[randomIndex] = selected as T
  }

  return available.slice(0, count)
}

const shuffle = <T>(items: readonly T[], random: RandomSource): T[] => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = getRandomIndex(index + 1, random)
    const current = shuffled[index]

    shuffled[index] = shuffled[randomIndex] as T
    shuffled[randomIndex] = current as T
  }

  return shuffled
}

export const isCorrectAnswer = (
  prompt: NotePrompt,
  answer: NoteName,
): boolean => prompt.pitch.note === answer

export const isCorrectTarget = (target: GameTarget): boolean =>
  target.isCorrect

type StageOrRandom = DifficultyStage | RandomSource

const resolveStageAndRandom = (
  stageOrRandom: StageOrRandom | undefined,
  random: RandomSource | undefined,
): { stage: DifficultyStage; random: RandomSource } => {
  if (typeof stageOrRandom === 'function') {
    return {
      stage: getDifficultyStage(0),
      random: stageOrRandom,
    }
  }

  return {
    stage: stageOrRandom ?? getDifficultyStage(0),
    random: random ?? Math.random,
  }
}

export function createGamePrompt(
  stage: DifficultyStage,
  random?: RandomSource,
): NotePrompt
export function createGamePrompt(random?: RandomSource): NotePrompt
export function createGamePrompt(
  stageOrRandom: StageOrRandom = getDifficultyStage(0),
  random?: RandomSource,
): NotePrompt {
  const resolved = resolveStageAndRandom(stageOrRandom, random)
  const promptSpecIndex =
    resolved.stage.promptPool.length === 1
      ? 0
      : getRandomIndex(resolved.stage.promptPool.length, resolved.random)
  const promptSpec = resolved.stage.promptPool[promptSpecIndex]

  if (!promptSpec) {
    throw new Error(`Difficulty stage ${resolved.stage.id} has no prompt specifications.`)
  }

  return createNotePrompt({
    clef: promptSpec.clef,
    range: promptSpec.range,
    random: resolved.random,
  })
}

export const createGameTargets = (
  prompt: NotePrompt,
  random: RandomSource = Math.random,
): readonly GameTarget[] => {
  const decoyNotes = sampleWithoutReplacement(
    NATURAL_NOTE_NAMES.filter((note) => note !== prompt.pitch.note),
    ACTIVE_TARGET_COUNT - 1,
    random,
  )
  const targetNotes = shuffle([prompt.pitch.note, ...decoyNotes], random)
  const targetSlots = sampleWithoutReplacement(
    GAME_BOARD_SLOTS,
    ACTIVE_TARGET_COUNT,
    random,
  )

  return targetSlots
    .map((slot, index) => {
      const note = targetNotes[index]

      if (!note) {
        throw new Error('Unable to create a complete target set.')
      }

      return {
        id: `slot-${slot}`,
        slot,
        note,
        isCorrect: note === prompt.pitch.note,
      }
    })
    .sort((a, b) => a.slot - b.slot)
}

export function createGameRound(
  stage: DifficultyStage,
  random?: RandomSource,
): GameRound
export function createGameRound(random?: RandomSource): GameRound
export function createGameRound(
  stageOrRandom: StageOrRandom = getDifficultyStage(0),
  random?: RandomSource,
): GameRound {
  const resolved = resolveStageAndRandom(stageOrRandom, random)
  const prompt = createGamePrompt(resolved.stage, resolved.random)

  return {
    prompt,
    targets: createGameTargets(prompt, resolved.random),
  }
}
