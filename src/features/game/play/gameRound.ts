import {
  createNotePrompt,
  NATURAL_NOTE_NAMES,
  type Clef,
  type NoteName,
  type NotePrompt,
  type PitchRange,
  type RandomSource,
} from '../domain'

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

const GAME_CLEF: Clef = 'treble'
const GAME_RANGE: PitchRange = {
  lowest: { note: 'C', octave: 4 },
  highest: { note: 'C', octave: 5 },
}

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

export const createGamePrompt = (random?: RandomSource): NotePrompt =>
  createNotePrompt({
    clef: GAME_CLEF,
    range: GAME_RANGE,
    random,
  })

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

export const createGameRound = (random: RandomSource = Math.random): GameRound => {
  const prompt = createGamePrompt(random)

  return {
    prompt,
    targets: createGameTargets(prompt, random),
  }
}
