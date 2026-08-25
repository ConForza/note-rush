import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type NotePrompt } from '../domain'
import { GameScreen } from './GameScreen'

const prompt = (note: NotePrompt['pitch']['note'], octave = 4): NotePrompt => ({
  pitch: { note, octave },
  clef: 'treble',
})

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders an initial prompt and seven canonical answer buttons', () => {
    const { container } = render(
      <GameScreen createPrompt={() => prompt('C', 4)} />,
    )

    expect(screen.getByRole('heading', { name: 'Note Rush' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ])
    expect(
      screen.getByRole('img', { name: 'Note to identify on treble clef' }),
    ).toBeInTheDocument()
  })

  it('shows correct feedback and locks all answer buttons', () => {
    render(<GameScreen createPrompt={() => prompt('C', 4)} />)

    fireEvent.click(screen.getByRole('button', { name: 'C' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    expect(screen.getByRole('button', { name: 'C, correct' })).toBeDisabled()
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('shows incorrect feedback and identifies the correct answer', () => {
    render(<GameScreen createPrompt={() => prompt('C', 4)} />)

    fireEvent.click(screen.getByRole('button', { name: 'D' }))

    expect(screen.getByRole('status')).toHaveTextContent('Incorrect — C')
    expect(screen.getByRole('button', { name: 'D, incorrect' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'C, correct answer' }),
    ).toBeDisabled()
  })

  it('advances to a new prompt and clears feedback after the delay', () => {
    const createPrompt = vi
      .fn<() => NotePrompt>()
      .mockReturnValueOnce(prompt('C', 4))
      .mockReturnValueOnce(prompt('D', 4))

    const { container } = render(<GameScreen createPrompt={createPrompt} />)

    fireEvent.click(screen.getByRole('button', { name: 'C' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct')

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(createPrompt).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).not.toHaveTextContent('Correct')
    expect(screen.getByRole('status')).not.toHaveTextContent('Incorrect')
    expect(screen.getByRole('button', { name: 'C' })).toBeEnabled()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('does not process a second answer during feedback', () => {
    const createPrompt = vi.fn(() => prompt('C', 4))
    render(<GameScreen createPrompt={createPrompt} />)
    const cButton = screen.getByRole('button', { name: 'C' })

    fireEvent.click(screen.getByRole('button', { name: 'D' }))
    fireEvent.click(cButton)

    expect(createPrompt).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect — C')

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(createPrompt).toHaveBeenCalledTimes(2)
  })

  it('cleans up the pending transition when unmounted', () => {
    const createPrompt = vi.fn(() => prompt('C', 4))
    const { unmount } = render(<GameScreen createPrompt={createPrompt} />)

    fireEvent.click(screen.getByRole('button', { name: 'C' }))
    unmount()

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(createPrompt).toHaveBeenCalledTimes(1)
  })
})
