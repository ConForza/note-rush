import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type NotePrompt } from '../domain'
import { GameScreen } from './GameScreen'
import { type GameRound, type GameTarget } from './gameRound'

const prompt = (
  note: NotePrompt['pitch']['note'],
  octave = 4,
): NotePrompt => ({
  pitch: { note, octave },
  clef: 'treble',
})

const target = (
  slot: number,
  note: GameTarget['note'],
  isCorrect: boolean,
): GameTarget => ({
  id: `slot-${slot}`,
  slot,
  note,
  isCorrect,
})

const round = (targets: readonly GameTarget[]): GameRound => ({
  prompt: prompt('C', 4),
  targets,
})

const firstRound = round([
  target(0, 'D', false),
  target(2, 'C', true),
  target(5, 'G', false),
])

const secondRound = round([
  target(1, 'A', false),
  target(4, 'C', true),
  target(5, 'E', false),
])

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders six slots with exactly three active target buttons', () => {
    const { container } = render(
      <GameScreen createRound={() => firstRound} />,
    )

    expect(screen.getByRole('heading', { name: 'Note Rush' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelectorAll('.target-slot')).toHaveLength(6)
    expect(container.querySelectorAll('.target-hole')).toHaveLength(6)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'D',
      'C',
      'G',
    ])
    expect(screen.getByRole('group', { name: 'Note targets' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Note to identify on treble clef' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hit C' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /correct/i })).not.toBeInTheDocument()
  })

  it('shows a correct target reaction and locks active targets', () => {
    render(<GameScreen createRound={() => firstRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct!')
    expect(screen.getByRole('button', { name: 'Hit C, correct' })).toHaveClass(
      'target-button--correct',
    )
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('shows an incorrect target and identifies the correct target', () => {
    render(<GameScreen createRound={() => firstRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))

    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')
    expect(screen.getByRole('button', { name: 'Hit D, incorrect' })).toHaveClass(
      'target-button--incorrect',
    )
    expect(
      screen.getByRole('button', { name: 'C, correct answer' }),
    ).toHaveClass('target-button--correct-answer')
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('refreshes the board, clears feedback, and unlocks the next round', () => {
    const createRound = vi
      .fn<() => GameRound>()
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(secondRound)
    const { container } = render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(createRound).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).not.toHaveTextContent('Correct')
    expect(screen.getByRole('status')).not.toHaveTextContent('Not quite')
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'A',
      'C',
      'E',
    ])
    expect(screen.getByRole('button', { name: 'Hit A' })).toBeEnabled()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(
      [...container.querySelectorAll<HTMLElement>('.target-slot[data-slot]')]
        .filter((slot) => slot.querySelector('button'))
        .map((slot) => slot.dataset.slot),
    ).toEqual(['1', '4', '5'])
  })

  it('does not process a second hit during feedback', () => {
    const createRound = vi
      .fn<() => GameRound>()
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(secondRound)
    render(<GameScreen createRound={createRound} />)
    const correctTarget = screen.getByRole('button', { name: 'Hit C' })

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    fireEvent.click(correctTarget)

    expect(createRound).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(createRound).toHaveBeenCalledTimes(2)
  })

  it('cleans up the pending transition when unmounted', () => {
    const createRound = vi.fn<() => GameRound>().mockReturnValue(firstRound)
    const { unmount } = render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    unmount()

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(createRound).toHaveBeenCalledTimes(1)
  })
})
