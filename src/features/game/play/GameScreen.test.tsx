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

const getStatValue = (label: string): string => {
  const stat = screen.getByText(label).closest('[data-stat]')
  const value = stat?.querySelector('.game-stat-value')

  if (!value) {
    throw new Error(`Unable to find the value for ${label}.`)
  }

  return value.textContent ?? ''
}

const advanceHit = (): void => {
  act(() => {
    vi.advanceTimersByTime(400)
  })
}

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders the Whack-a-Note HUD and six-slot board', () => {
    const { container } = render(
      <GameScreen createRound={() => firstRound} />,
    )

    expect(
      screen.getByRole('heading', { name: 'Whack-a-Note' }),
    ).toBeInTheDocument()
    expect(getStatValue('Score')).toBe('0')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelectorAll('.target-slot')).toHaveLength(6)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Hit C' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Note to identify on treble clef' }),
    ).toBeInTheDocument()
  })

  it('updates score, streak, and leaves lives unchanged on a correct hit', () => {
    render(<GameScreen createRound={() => firstRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('100')
    expect(getStatValue('Streak')).toBe('1')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Correct!')
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('shows an incorrect target, resets streak, and removes one life', () => {
    render(<GameScreen createRound={() => firstRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))

    expect(getStatValue('Score')).toBe('0')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')
    expect(screen.getByRole('button', { name: 'Hit D, incorrect' })).toHaveClass(
      'target-button--incorrect',
    )
    expect(
      screen.getByRole('button', { name: 'C, correct answer' }),
    ).toHaveClass('target-button--correct-answer')
  })

  it('applies the previous streak bonus across consecutive correct hits', () => {
    const createRound = vi.fn(() => firstRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()

    expect(getStatValue('Score')).toBe('210')
    expect(getStatValue('Streak')).toBe('2')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
  })

  it('resets the streak for post-mistake scoring while preserving best streak', () => {
    const createRound = vi.fn(() => firstRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))

    expect(getStatValue('Score')).toBe('210')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()

    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('310')
    expect(getStatValue('Streak')).toBe('1')
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()
  })

  it('refreshes the board, clears feedback, and unlocks the next round', () => {
    const createRound = vi
      .fn<() => GameRound>()
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(secondRound)
    const { container } = render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()

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

    expect(getStatValue('Score')).toBe('0')
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(1)

    advanceHit()

    expect(createRound).toHaveBeenCalledTimes(2)
  })

  it('keeps one life and continues after a correct hit on the final remaining life', () => {
    const createRound = vi.fn(() => firstRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()

    expect(screen.getByText('1 life remaining')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('100')
    expect(getStatValue('Streak')).toBe('1')
    expect(screen.getByText('1 life remaining')).toBeInTheDocument()

    advanceHit()

    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('resolves only one final-life loss when a target is hit twice rapidly', () => {
    const createRound = vi.fn(() => firstRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()

    expect(screen.getByText('1 life remaining')).toBeInTheDocument()
    const wrongTarget = screen.getByRole('button', { name: 'Hit D' })
    fireEvent.click(wrongTarget)
    fireEvent.click(wrongTarget)

    expect(screen.getByText('0 lives remaining')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(3)

    advanceHit()

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
  })

  it('shows game over only after the final incorrect-feedback delay', () => {
    const createRound = vi.fn(() => firstRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))

    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')
    expect(screen.getByText('0 lives remaining')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    advanceHit()

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByText('Final score')).toBeInTheDocument()
    expect(screen.getByText('Best streak')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Note targets' })).not.toBeInTheDocument()
  })

  it('preserves best streak in the game-over summary', () => {
    const createRound = vi.fn(() => firstRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByText('330')).toBeInTheDocument()
    expect(screen.getByText('3', { selector: 'dd' })).toBeInTheDocument()
  })

  it('resets stats and creates a fresh round when Play Again is selected', () => {
    const createRound = vi
      .fn<() => GameRound>()
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(secondRound)
    render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))

    expect(createRound).toHaveBeenCalledTimes(4)
    expect(screen.getByRole('heading', { name: 'Whack-a-Note' })).toBeInTheDocument()
    expect(getStatValue('Score')).toBe('0')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'A',
      'C',
      'E',
    ])
    expect(
      screen.getByRole('img', { name: 'Note to identify on treble clef' }),
    ).toBeInTheDocument()
  })

  it('cleans up the pending transition when unmounted', () => {
    const createRound = vi.fn<() => GameRound>().mockReturnValue(firstRound)
    const { unmount } = render(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    unmount()

    advanceHit()

    expect(createRound).toHaveBeenCalledTimes(1)
  })
})
