import { describe, expect, it } from 'vitest'
import { toVexFlowKey } from './vexflowAdapter'
import type { Pitch } from '../domain'

const pitch = (note: Pitch['note'], octave: number): Pitch => ({
  note,
  octave,
})

describe('VexFlow pitch adapter', () => {
  it.each([
    [pitch('C', 4), 'c/4'],
    [pitch('B', 3), 'b/3'],
    [pitch('G', 5), 'g/5'],
  ])('converts %s to %s', (input, expected) => {
    expect(toVexFlowKey(input)).toBe(expected)
  })

  it('does not mutate the supplied pitch', () => {
    const input = pitch('C', 4)

    toVexFlowKey(input)

    expect(input).toEqual(pitch('C', 4))
  })
})
