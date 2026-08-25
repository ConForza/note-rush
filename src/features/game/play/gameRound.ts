import {
  createNotePrompt,
  type Clef,
  type NoteName,
  type NotePrompt,
  type PitchRange,
  type RandomSource,
} from '../domain'

export interface GameRound {
  prompt: NotePrompt
}

const GAME_CLEF: Clef = 'treble'
const GAME_RANGE: PitchRange = {
  lowest: { note: 'C', octave: 4 },
  highest: { note: 'C', octave: 5 },
}

export const isCorrectAnswer = (
  prompt: NotePrompt,
  answer: NoteName,
): boolean => prompt.pitch.note === answer

export const createGamePrompt = (random?: RandomSource): NotePrompt =>
  createNotePrompt({
    clef: GAME_CLEF,
    range: GAME_RANGE,
    random,
  })

export const createGameRound = (random?: RandomSource): GameRound => ({
  prompt: createGamePrompt(random),
})
