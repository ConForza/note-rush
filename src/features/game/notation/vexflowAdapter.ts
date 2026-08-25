import type { Pitch } from '../domain'

export const toVexFlowKey = (pitch: Pitch): string =>
  `${pitch.note.toLowerCase()}/${pitch.octave}`
