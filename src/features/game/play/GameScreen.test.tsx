import { act, fireEvent, render, screen } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type NotePrompt } from '../domain'
import { type GameEffects } from '../effects'
import { GameScreen } from './GameScreen'
import { type DifficultyStage } from './gameDifficulty'
import { type GameRound, type GameTarget } from './gameRound'

const DETERMINISTIC_READY_DELAY_MS = 180 + 2 * 60 + 280

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

const bassRound: GameRound = {
  ...firstRound,
  prompt: { ...firstRound.prompt, clef: 'bass' },
}

const getStatValue = (label: string): string => {
  const stat = screen.getByText(label).closest('[data-stat]')
  const value = stat?.querySelector('.game-stat-value')

  if (!value) {
    throw new Error(`Unable to find the value for ${label}.`)
  }

  return value.textContent ?? ''
}

const advanceRoundStart = (): void => {
  act(() => {
    vi.advanceTimersByTime(DETERMINISTIC_READY_DELAY_MS)
  })
}

const renderReady = (ui: Parameters<typeof render>[0]) => {
  const deterministicUi = cloneElement(
    ui as ReactElement<{ presentationRandom?: () => number }>,
    { presentationRandom: () => 0 },
  )
  const result = render(deterministicUi)
  advanceRoundStart()
  return result
}

const createFakeEffects = (): GameEffects => ({
  unlockAudio: vi.fn(),
  emit: vi.fn(),
  configure: vi.fn(),
  dispose: vi.fn(),
})

const advanceHit = (): void => {
  act(() => {
    vi.advanceTimersByTime(400 + DETERMINISTIC_READY_DELAY_MS)
  })
}

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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
    expect(getStatValue('Time')).toBe('30')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(container.querySelectorAll('.music-staff svg')).toHaveLength(1)
    expect(container.querySelectorAll('.target-slot')).toHaveLength(6)
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Hit C' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Note to identify on treble clef' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Which note?')).not.toBeInTheDocument()
    expect(screen.getByText('Level 1')).toBeInTheDocument()
    expect(screen.getByText('Treble Basics')).toBeInTheDocument()
    expect(screen.getByText('0 / 4 correct')).toBeInTheDocument()
  })

  it('holds the global clock through anticipation and feedback', () => {
    render(
      <GameScreen
        createRound={() => firstRound}
        presentationRandom={() => 0}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(getStatValue('Time')).toBe('30')

    act(() => {
      vi.advanceTimersByTime(80)
    })
    expect(getStatValue('Time')).toBe('30')

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    expect(getStatValue('Time')).toBe('31')

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(getStatValue('Time')).toBe('31')
  })

  it('starts the round deadline only after the emergence boundary', () => {
    const createRound = vi.fn(() => firstRound)
    render(
      <GameScreen
        createRound={createRound}
        presentationRandom={() => 0}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(screen.getByRole('status')).not.toHaveTextContent('Too slow')

    act(() => {
      vi.advanceTimersByTime(DETERMINISTIC_READY_DELAY_MS)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
  })

  it('keeps every target disabled and ignores pre-ready hits', () => {
    render(
      <GameScreen
        createRound={() => firstRound}
        presentationRandom={() => 0}
      />,
    )

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('0')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(screen.getByRole('status')).not.toHaveTextContent(/Correct|Not quite|Too slow/)

    act(() => {
      vi.advanceTimersByTime(DETERMINISTIC_READY_DELAY_MS - 1)
    })
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })

    act(() => {
      vi.advanceTimersByTime(1)
    })
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeEnabled()
    })
  })

  it('starts the response deadline exactly at readiness', () => {
    render(
      <GameScreen
        createRound={() => firstRound}
        presentationRandom={() => 0}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(DETERMINISTIC_READY_DELAY_MS - 1)
    })
    act(() => {
      vi.advanceTimersByTime(1)
    })

    act(() => {
      vi.advanceTimersByTime(2_999)
    })
    expect(screen.getByRole('status')).not.toHaveTextContent('Too slow')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
  })

  it('makes the initial round immediately ready under reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        () =>
          ({
            matches: true,
            media: '(prefers-reduced-motion: reduce)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    )

    render(<GameScreen createRound={() => firstRound} />)
    act(() => {
      vi.advanceTimersByTime(0)
    })

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeEnabled()
      expect(button).toHaveStyle('--target-emergence-delay: 0ms')
    })
  })

  it('starts Practice directly on the selected Bass Basics stage', () => {
    const createRound = vi.fn((stage: DifficultyStage): GameRound =>
      stage.id === 'bass-basics' ? bassRound : firstRound,
    )

    render(
      <GameScreen
        createRound={createRound}
        presentationRandom={() => 0}
        sessionConfig={{
          mode: 'practice',
          stageId: 'bass-basics',
          timerSeconds: null,
        }}
      />,
    )

    expect(createRound.mock.calls[0]?.[0].id).toBe('bass-basics')
    expect(screen.getByRole('img', { name: 'Note to identify on bass clef' })).toBeInTheDocument()
    expect(screen.getByText('Practice')).toBeInTheDocument()
    expect(screen.getByText('Bass Basics')).toBeInTheDocument()
    expect(screen.queryByText('3 lives remaining')).not.toBeInTheDocument()
    expect(screen.queryByText('Time')).not.toBeInTheDocument()
  })

  it('keeps Practice fixed and life-free after correct and incorrect answers', () => {
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        sessionConfig={{
          mode: 'practice',
          stageId: 'bass-basics',
          timerSeconds: null,
        }}
      />,
    )

    for (let index = 0; index < 8; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('Practice')).toBeInTheDocument()
    expect(screen.getByText('Bass Basics')).toBeInTheDocument()
    expect(screen.queryByText('Correct! Level up')).not.toBeInTheDocument()
    expect(screen.queryByText('3 lives remaining')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    expect(getStatValue('Score')).toBe('1,080')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')
    expect(screen.queryByText('2 lives remaining')).not.toBeInTheDocument()
  })

  it('leaves an unanswered untimed Practice question available indefinitely', () => {
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        sessionConfig={{
          mode: 'practice',
          stageId: 'treble-basics',
          timerSeconds: null,
        }}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByRole('button', { name: 'Hit C' })).toBeEnabled()
    expect(screen.getByRole('status')).not.toHaveTextContent('Too slow')
    expect(screen.getByText('Practice')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('100')
    expect(getStatValue('Streak')).toBe('1')
    expect(screen.getByRole('status')).toHaveTextContent('Correct!')
    expect(screen.queryByText('3 lives remaining')).not.toBeInTheDocument()
  })

  it('emits exactly one correct effect after an authoritative hit', () => {
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hit C, correct' }))

    expect(effects.emit).toHaveBeenCalledTimes(1)
    expect(effects.emit).toHaveBeenCalledWith('correct')
  })

  it('emits no effect for a pre-ready click', () => {
    const effects = createFakeEffects()
    render(
      <GameScreen
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(effects.emit).not.toHaveBeenCalled()
  })

  it('maps a missed Arcade round to one miss effect', () => {
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(effects.emit).toHaveBeenCalledWith('miss')
    expect(effects.emit).toHaveBeenCalledTimes(1)
  })

  it('uses one level-up effect instead of correct on advancement', () => {
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(effects.emit).toHaveBeenCalledTimes(4)
    expect(vi.mocked(effects.emit).mock.calls.map(([event]) => event)).toEqual([
      'correct',
      'correct',
      'correct',
      'level-up',
    ])
  })

  it('keeps Practice correct effects free of progression and miss events', () => {
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        effects={effects}
        sessionConfig={{
          mode: 'practice',
          stageId: 'mixed-clefs',
          timerSeconds: null,
        }}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(effects.emit).toHaveBeenCalledTimes(1)
    expect(effects.emit).toHaveBeenCalledWith('correct')
    expect(effects.emit).not.toHaveBeenCalledWith('level-up')
    expect(effects.emit).not.toHaveBeenCalledWith('miss')
  })

  it('restores keyboard focus to the first active target after the next round is ready', () => {
    renderReady(
      <GameScreen
        createRound={vi
          .fn<() => GameRound>()
          .mockReturnValueOnce(firstRound)
          .mockReturnValueOnce(secondRound)}
      />,
    )

    const board = screen.getByRole('group', { name: 'Note targets' })
    const correctTarget = screen.getByRole('button', { name: 'Hit C' })
    correctTarget.focus()
    fireEvent.keyDown(board, { key: 'Enter' })
    fireEvent.click(correctTarget)

    advanceHit()
    expect(screen.getByRole('button', { name: 'Hit A' })).toHaveFocus()
  })

  it('restores keyboard focus after an Arcade round times out automatically', () => {
    renderReady(
      <GameScreen
        createRound={vi
          .fn<() => GameRound>()
          .mockReturnValueOnce(firstRound)
          .mockReturnValueOnce(secondRound)}
      />,
    )

    const board = screen.getByRole('group', { name: 'Note targets' })
    const focusedTarget = screen.getByRole('button', { name: 'Hit C' })
    focusedTarget.focus()
    fireEvent.keyDown(board, { key: 'Enter' })

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')

    advanceHit()
    expect(screen.getByRole('button', { name: 'Hit A' })).toHaveFocus()
  })

  it('recognizes keyboard focus reached without activating a target', () => {
    renderReady(
      <GameScreen
        createRound={vi
          .fn<() => GameRound>()
          .mockReturnValueOnce(firstRound)
          .mockReturnValueOnce(secondRound)}
      />,
    )

    const focusedTarget = screen.getByRole('button', { name: 'Hit C' })
    fireEvent.keyDown(document, { key: 'Tab' })
    focusedTarget.focus()

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    advanceHit()

    expect(screen.getByRole('button', { name: 'Hit A' })).toHaveFocus()
  })

  it('does not steal pointer focus when the next round becomes ready', () => {
    renderReady(
      <GameScreen
        createRound={vi
          .fn<() => GameRound>()
          .mockReturnValueOnce(firstRound)
          .mockReturnValueOnce(secondRound)}
      />,
    )

    const correctTarget = screen.getByRole('button', { name: 'Hit C' })
    correctTarget.focus()
    fireEvent.pointerDown(correctTarget)
    fireEvent.click(correctTarget)

    advanceHit()
    advanceRoundStart()
    expect(screen.getByRole('button', { name: 'Hit A' })).not.toHaveFocus()
  })

  it('emits incorrect once, then game-over once at the final Arcade life', () => {
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
      advanceHit()
    }

    expect(effects.emit).toHaveBeenCalledTimes(4)
    expect(effects.emit).toHaveBeenNthCalledWith(1, 'incorrect')
    expect(effects.emit).toHaveBeenNthCalledWith(2, 'incorrect')
    expect(effects.emit).toHaveBeenNthCalledWith(3, 'incorrect')
    expect(effects.emit).toHaveBeenNthCalledWith(4, 'game-over')
  })

  it('emits Practice Complete once when a timed Practice session expires', () => {
    let now = 0
    const effects = createFakeEffects()
    const clock = (): number => now

    renderReady(
      <GameScreen
        clock={clock}
        createRound={() => firstRound}
        effects={effects}
        sessionConfig={{
          mode: 'practice',
          stageId: 'treble-basics',
          timerSeconds: 30,
        }}
      />,
    )

    now = 30_000
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(effects.emit).toHaveBeenCalledTimes(1)
    expect(effects.emit).toHaveBeenCalledWith('practice-complete')
    expect(effects.emit).not.toHaveBeenCalledWith('miss')
    expect(effects.emit).not.toHaveBeenCalledWith('game-over')
  })

  it.each([60, 120] as const)('shows the configured Arcade timer (%s seconds)', (seconds) => {
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        sessionConfig={{ mode: 'arcade', timerSeconds: seconds }}
      />,
    )

    expect(getStatValue('Time')).toBe(String(seconds))
  })

  it('hides the global timer in Arcade timer-Off mode while keeping lives', () => {
    renderReady(
      <GameScreen
        createRound={() => firstRound}
        sessionConfig={{ mode: 'arcade', timerSeconds: null }}
      />,
    )

    expect(screen.queryByText('Time')).not.toBeInTheDocument()
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()
  })

  it('allows a timed Practice hit after the question lifetime without a bonus', () => {
    let now = 0
    const clock = (): number => now

    renderReady(
      <GameScreen
        clock={clock}
        createRound={() => firstRound}
        sessionConfig={{ mode: 'practice', stageId: 'treble-basics', timerSeconds: 30 }}
      />,
    )

    now = 4_000
    act(() => {
      vi.advanceTimersByTime(4_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('100')
    expect(getStatValue('Streak')).toBe('1')
    expect(getStatValue('Time')).toBe('26')
    expect(screen.getByRole('status')).toHaveTextContent('Correct!')
    expect(screen.queryByText('Too slow')).not.toBeInTheDocument()
  })

  it('ends timed Practice positively when the session timer expires', () => {
    let now = 0
    const clock = (): number => now

    renderReady(
      <GameScreen
        clock={clock}
        createRound={() => firstRound}
        sessionConfig={{ mode: 'practice', stageId: 'treble-basics', timerSeconds: 30 }}
      />,
    )

    now = 30_000
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByRole('heading', { name: 'Practice Complete' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Practice Complete' })).toHaveFocus()
    expect(screen.getByText(/Nice work/)).toBeInTheDocument()
    expect(screen.queryByText('Too slow')).not.toBeInTheDocument()
  })

  it('updates score, streak, and leaves lives unchanged on a correct hit', () => {
    renderReady(<GameScreen createRound={() => firstRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('100')
    expect(getStatValue('Streak')).toBe('1')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Correct!')
    expect(screen.getByText('0 / 4 correct')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hit C, correct' })).toHaveClass(
      'target-button--correct',
    )
    expect(screen.getByRole('button', { name: 'Hit D' })).toHaveClass(
      'target-button--retreating',
    )
    expect(screen.getByRole('button', { name: 'Hit G' })).toHaveClass(
      'target-button--retreating',
    )
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })

    advanceHit()

    expect(screen.getByText('1 / 4 correct')).toBeInTheDocument()
  })

  it('advances after four correct answers and delays the level switch until feedback ends', () => {
    const createRound = vi.fn((stage: DifficultyStage): GameRound => {
      void stage
      return firstRound
    })
    renderReady(<GameScreen createRound={createRound} />)

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('3 / 4 correct')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct! Level up')
    expect(screen.getByRole('status')).toHaveClass('game-feedback--level-up')
    expect(screen.getByText('Treble Basics')).toBeInTheDocument()
    expect(screen.getByText('3 / 4 correct')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(4)

    advanceHit()

    expect(screen.getByText('Level 2')).toBeInTheDocument()
    expect(screen.getByText('Treble Extended')).toBeInTheDocument()
    expect(screen.getByText('0 / 4 correct')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(5)
    expect(createRound.mock.calls.at(-1)?.[0].id).toBe('treble-extended')
  })

  it('preserves level progress after an incorrect answer', () => {
    renderReady(<GameScreen createRound={() => firstRound} />)

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()

    expect(screen.getByText('Treble Basics')).toBeInTheDocument()
    expect(screen.getByText('3 / 4 correct')).toBeInTheDocument()
  })

  it('preserves level progress after a missed round', () => {
    renderReady(<GameScreen createRound={() => firstRound} />)

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    act(() => {
      vi.advanceTimersByTime(3_000)
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Treble Basics')).toBeInTheDocument()
    expect(screen.getByText('3 / 4 correct')).toBeInTheDocument()
  })

  it('uses the stage-specific round lifetime as difficulty increases', () => {
    renderReady(<GameScreen createRound={() => firstRound} />)

    for (let index = 0; index < 8; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('Treble Challenge')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2_499)
    })
    expect(screen.getByRole('status')).not.toHaveTextContent('Too slow')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
  })

  it('passes bass stages to the round factory and labels the staff by clef', () => {
    const createRound = vi.fn((stage: DifficultyStage): GameRound =>
      stage.level >= 4 ? bassRound : firstRound,
    )
    renderReady(<GameScreen createRound={createRound} />)

    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('Level 4')).toBeInTheDocument()
    expect(screen.getByText('Bass Basics')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Note to identify on bass clef' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: /C4/ }),
    ).not.toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(13)
    expect(createRound.mock.calls[0]?.[0].id).toBe('treble-basics')
    expect(createRound.mock.calls[4]?.[0].id).toBe('treble-extended')
    expect(createRound.mock.calls[8]?.[0].id).toBe('treble-challenge')
    expect(createRound.mock.calls[12]?.[0].id).toBe('bass-basics')
  })

  it('keeps the final level stable after twenty correct answers', () => {
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} />)

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('Level 6')).toBeInTheDocument()
    expect(screen.getByText('Mixed Clefs')).toBeInTheDocument()
    expect(screen.getByText('Final level')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(21)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    advanceHit()

    expect(screen.getByText('Level 6')).toBeInTheDocument()
    expect(screen.getByText('Final level')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(22)
  })

  it('includes the reached level in game over and resets it on restart', () => {
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} />)

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('Treble Extended')).toBeInTheDocument()

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
      advanceHit()
    }

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByText('Level reached')).toBeInTheDocument()
    expect(screen.getByText('2 — Treble Extended')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))

    expect(screen.getByText('Level 1')).toBeInTheDocument()
    expect(screen.getByText('Treble Basics')).toBeInTheDocument()
    expect(screen.getByText('0 / 4 correct')).toBeInTheDocument()
  })

  it('refreshes the visible countdown from elapsed wall-clock time', () => {
    renderReady(<GameScreen createRound={() => firstRound} />)

    expect(getStatValue('Time')).toBe('30')

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(getStatValue('Time')).toBe('30')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(getStatValue('Time')).toBe('29')
  })

  it('adds one second to the absolute deadline for a correct answer', () => {
    let now = 0
    const clock = (): number => now
    renderReady(<GameScreen createRound={() => firstRound} clock={clock} />)

    now = 1_000
    act(() => {
      vi.advanceTimersByTime(400)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Time')).toBe('30')
  })

  it('does not change the deadline for an incorrect answer', () => {
    let now = 0
    const clock = (): number => now
    renderReady(<GameScreen createRound={() => firstRound} clock={clock} />)

    now = 1_000
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))

    expect(getStatValue('Time')).toBe('29')
    now = 1_500
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(getStatValue('Time')).toBe('29')
  })

  it('preserves the final 200ms after an incorrect answer and feedback', () => {
    let now = 29_800
    let initialClockCalls = 0
    const clock = (): number => {
      initialClockCalls += 1
      return initialClockCalls <= 2 ? 0 : now
    }
    renderReady(<GameScreen createRound={() => firstRound} clock={clock} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    expect(getStatValue('Time')).toBe('1')

    advanceHit()
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    now = 29_999
    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    now = 30_000
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
  })

  it('preserves the final 1200ms after a correct answer receives its bonus', () => {
    let now = 29_800
    let initialClockCalls = 0
    const clock = (): number => {
      initialClockCalls += 1
      return initialClockCalls <= 2 ? 0 : now
    }
    renderReady(<GameScreen createRound={() => firstRound} clock={clock} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    expect(getStatValue('Time')).toBe('2')

    advanceHit()
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    now = 30_999
    act(() => {
      vi.advanceTimersByTime(1_199)
    })
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    now = 31_000
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
  })

  it('uses the configured Level 4 three-second deadline at the exact boundary', () => {
    const createRound = vi.fn((stage: DifficultyStage): GameRound => ({
      ...firstRound,
      prompt: { ...firstRound.prompt, clef: stage.level >= 4 ? 'bass' : 'treble' },
    }))
    renderReady(<GameScreen createRound={createRound} />)

    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
      advanceHit()
    }

    expect(screen.getByText('Bass Basics')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2_999)
    })
    expect(screen.getByRole('status')).not.toHaveTextContent('Too slow')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
  })

  it('resolves an expired round as a miss and reveals the correct target', () => {
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} />)

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
    expect(getStatValue('Score')).toBe('0')
    expect(getStatValue('Streak')).toBe('0')
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'C, correct answer' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'C, correct answer' })).toHaveClass(
      'target-button--correct-answer',
    )
    expect(screen.getByRole('button', { name: 'Hit D' })).toHaveClass(
      'target-button--retreating',
    )
    expect(screen.getByRole('button', { name: 'Hit G' })).toHaveClass(
      'target-button--retreating',
    )
    expect(screen.queryByRole('button', { name: 'Hit D, incorrect' })).not.toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(createRound).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(createRound).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Hit C' })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(DETERMINISTIC_READY_DELAY_MS)
    })
    expect(screen.getByRole('button', { name: 'Hit C' })).toBeEnabled()
    expect(screen.getByRole('status')).not.toHaveTextContent('Too slow')
  })

  it('turns a stale hit after the round deadline into a miss', () => {
    let now = 0
    const clock = (): number => now
    renderReady(<GameScreen createRound={() => firstRound} clock={clock} />)

    now = 3_000
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
    expect(screen.getByText('2 lives remaining')).toBeInTheDocument()
    expect(getStatValue('Score')).toBe('0')
  })

  it('reconciles an expired round when visibility changes', () => {
    let now = 0
    const clock = (): number => now
    const effects = createFakeEffects()

    renderReady(
      <GameScreen
        clock={clock}
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    const board = screen.getByRole('group', { name: 'Note targets' })
    const focusedTarget = screen.getByRole('button', { name: 'Hit C' })
    focusedTarget.focus()
    fireEvent.keyDown(board, { key: 'Enter' })

    now = 3_000
    fireEvent(document, new Event('visibilitychange'))

    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
    expect(effects.emit).toHaveBeenCalledTimes(1)
    expect(effects.emit).toHaveBeenCalledWith('miss')

    advanceHit()
    expect(screen.getByRole('button', { name: 'Hit D' })).toHaveFocus()
  })

  it('shows miss feedback before game over when the final life expires', () => {
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} />)

    act(() => {
      vi.advanceTimersByTime(3_000)
      vi.advanceTimersByTime(400 + DETERMINISTIC_READY_DELAY_MS)
      vi.advanceTimersByTime(3_000)
      vi.advanceTimersByTime(400 + DETERMINISTIC_READY_DELAY_MS)
      vi.advanceTimersByTime(3_000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Too slow — C')
    expect(screen.getByText('0 lives remaining')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Game Over' })).toHaveFocus()
    expect(screen.getByText('Out of lives')).toBeInTheDocument()
    expect(createRound).toHaveBeenCalledTimes(3)
  })

  it('shows time game over when the absolute global deadline is reached', () => {
    let now = 0
    const clock = (): number => now
    renderReady(<GameScreen createRound={() => firstRound} clock={clock} />)

    now = 30_000
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByText("Time's up")).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Whack-a-Note' })).not.toHaveClass(
      'game-card--playing',
    )
    expect(screen.queryByRole('group', { name: 'Note targets' })).not.toBeInTheDocument()
  })

  it('lets global expiry win over a stale target hit', () => {
    let now = 0
    const clock = (): number => now
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        clock={clock}
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    now = 30_000
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(screen.getByText('Final score').nextElementSibling).toHaveTextContent('0')
    expect(effects.emit).toHaveBeenCalledTimes(1)
    expect(effects.emit).toHaveBeenCalledWith('game-over')
    expect(effects.emit).not.toHaveBeenCalledWith('correct')
    expect(effects.emit).not.toHaveBeenCalledWith('miss')
  })

  it('lets global visibility expiry win over a round miss', () => {
    let now = 0
    const clock = (): number => now
    const effects = createFakeEffects()
    renderReady(
      <GameScreen
        clock={clock}
        createRound={() => firstRound}
        effects={effects}
      />,
    )

    now = 30_000
    fireEvent(document, new Event('visibilitychange'))

    expect(screen.getByRole('heading', { name: 'Game Over' })).toBeInTheDocument()
    expect(effects.emit).toHaveBeenCalledTimes(1)
    expect(effects.emit).toHaveBeenCalledWith('game-over')
    expect(effects.emit).not.toHaveBeenCalledWith('miss')
  })

  it('keeps global time paused through feedback and the next anticipation', () => {
    let now = 0
    const clock = (): number => now
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} clock={clock} />)

    now = 1_000
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')

    now = 30_000
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Not quite — C')
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByRole('status')).not.toHaveTextContent('Not quite')
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(DETERMINISTIC_READY_DELAY_MS)
    })
    expect(screen.queryByRole('heading', { name: 'Game Over' })).not.toBeInTheDocument()
    expect(getStatValue('Time')).toBe('29')
    expect(createRound).toHaveBeenCalledTimes(2)
  })

  it('lets the first event win the hit-versus-expiry race', () => {
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} />)

    act(() => {
      vi.advanceTimersByTime(2_499)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))

    expect(getStatValue('Score')).toBe('100')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Correct!')

    act(() => {
      vi.advanceTimersByTime(401)
    })

    expect(createRound).toHaveBeenCalledTimes(2)
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()
  })

  it('resets the global timer and restarts its refresh loop', () => {
    let now = 0
    const clock = (): number => now
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} clock={clock} />)

    now = 30_000
    act(() => {
      vi.advanceTimersByTime(100)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))

    expect(getStatValue('Time')).toBe('30')
    expect(getStatValue('Score')).toBe('0')
    expect(screen.getByText('3 lives remaining')).toBeInTheDocument()

    advanceRoundStart()

    now = 31_000
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(getStatValue('Time')).toBe('29')
  })

  it('shows an incorrect target, resets streak, and removes one life', () => {
    renderReady(<GameScreen createRound={() => firstRound} />)

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
    expect(screen.getByRole('button', { name: 'Hit G' })).toHaveClass(
      'target-button--retreating',
    )
  })

  it('applies the previous streak bonus across consecutive correct hits', () => {
    const createRound = vi.fn(() => firstRound)
    renderReady(<GameScreen createRound={createRound} />)

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
    renderReady(<GameScreen createRound={createRound} />)

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
    const { container } = renderReady(<GameScreen createRound={createRound} />)

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
    expect(container.querySelectorAll('.music-staff svg')).toHaveLength(1)
  })

  it('does not process a second hit during feedback', () => {
    const createRound = vi
      .fn<() => GameRound>()
      .mockReturnValueOnce(firstRound)
      .mockReturnValueOnce(secondRound)
    renderReady(<GameScreen createRound={createRound} />)
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
    renderReady(<GameScreen createRound={createRound} />)

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
    renderReady(<GameScreen createRound={createRound} />)

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
    renderReady(<GameScreen createRound={createRound} />)

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
    renderReady(<GameScreen createRound={createRound} />)

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
    renderReady(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()
    fireEvent.click(screen.getByRole('button', { name: 'Hit D' }))
    advanceHit()

    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))

    expect(createRound).toHaveBeenCalledTimes(4)
    expect(screen.getByRole('heading', { name: 'Whack-a-Note' })).toHaveFocus()
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
    const { unmount } = renderReady(<GameScreen createRound={createRound} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hit C' }))
    unmount()

    advanceHit()

    expect(createRound).toHaveBeenCalledTimes(1)
  })
})
