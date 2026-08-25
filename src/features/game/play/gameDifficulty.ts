import {
  type Clef,
  type PitchRange,
} from '../domain'

export const CORRECT_HITS_TO_ADVANCE = 4

export type DifficultyStageId =
  | 'treble-basics'
  | 'treble-extended'
  | 'treble-challenge'
  | 'bass-basics'
  | 'bass-extended'
  | 'mixed-clefs'

export interface StagePromptSpec {
  readonly clef: Clef
  readonly range: PitchRange
}

export interface DifficultyStage {
  readonly id: DifficultyStageId
  readonly level: number
  readonly label: string
  readonly promptPool: readonly StagePromptSpec[]
  readonly roundLifetimeMs: number
  readonly correctHitsToAdvance: number | null
}

const trebleBasics: StagePromptSpec = {
  clef: 'treble',
  range: {
    lowest: { note: 'E', octave: 4 },
    highest: { note: 'D', octave: 5 },
  },
}

const trebleExtended: StagePromptSpec = {
  clef: 'treble',
  range: {
    lowest: { note: 'C', octave: 4 },
    highest: { note: 'F', octave: 5 },
  },
}

const trebleChallenge: StagePromptSpec = {
  clef: 'treble',
  range: {
    lowest: { note: 'C', octave: 4 },
    highest: { note: 'A', octave: 5 },
  },
}

const bassBasics: StagePromptSpec = {
  clef: 'bass',
  range: {
    lowest: { note: 'G', octave: 2 },
    highest: { note: 'F', octave: 3 },
  },
}

const bassExtended: StagePromptSpec = {
  clef: 'bass',
  range: {
    lowest: { note: 'E', octave: 2 },
    highest: { note: 'C', octave: 4 },
  },
}

export const DIFFICULTY_STAGES: readonly DifficultyStage[] = [
  {
    id: 'treble-basics',
    level: 1,
    label: 'Treble Basics',
    promptPool: [trebleBasics],
    roundLifetimeMs: 3_000,
    correctHitsToAdvance: CORRECT_HITS_TO_ADVANCE,
  },
  {
    id: 'treble-extended',
    level: 2,
    label: 'Treble Extended',
    promptPool: [trebleExtended],
    roundLifetimeMs: 2_750,
    correctHitsToAdvance: CORRECT_HITS_TO_ADVANCE,
  },
  {
    id: 'treble-challenge',
    level: 3,
    label: 'Treble Challenge',
    promptPool: [trebleChallenge],
    roundLifetimeMs: 2_500,
    correctHitsToAdvance: CORRECT_HITS_TO_ADVANCE,
  },
  {
    id: 'bass-basics',
    level: 4,
    label: 'Bass Basics',
    promptPool: [bassBasics],
    roundLifetimeMs: 3_000,
    correctHitsToAdvance: CORRECT_HITS_TO_ADVANCE,
  },
  {
    id: 'bass-extended',
    level: 5,
    label: 'Bass Extended',
    promptPool: [bassExtended],
    roundLifetimeMs: 2_750,
    correctHitsToAdvance: CORRECT_HITS_TO_ADVANCE,
  },
  {
    id: 'mixed-clefs',
    level: 6,
    label: 'Mixed Clefs',
    promptPool: [trebleChallenge, bassExtended],
    roundLifetimeMs: 2_500,
    correctHitsToAdvance: null,
  },
]

export const getDifficultyStage = (stageIndex: number): DifficultyStage => {
  if (
    !Number.isInteger(stageIndex) ||
    stageIndex < 0 ||
    stageIndex >= DIFFICULTY_STAGES.length
  ) {
    throw new RangeError(
      `Unknown difficulty stage index: ${stageIndex}. Expected a value from 0 to ${DIFFICULTY_STAGES.length - 1}.`,
    )
  }

  const stage = DIFFICULTY_STAGES[stageIndex]

  if (!stage) {
    throw new Error(`Difficulty stage ${stageIndex} is not configured.`)
  }

  return stage
}
