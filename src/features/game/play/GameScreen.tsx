import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { MusicStaff } from '../notation'
import {
  ACTIVE_TARGET_COUNT,
  createGameRound,
  GAME_BOARD_SLOTS,
  isCorrectTarget,
  type GameRoundFactory,
  type GameRound,
  type GameTarget,
} from './gameRound'
import { Target, TargetHole, type TargetVisualState } from './Target'
import { GameHud } from './GameHud'
import { GameOverScreen } from './GameOverScreen'
import { DifficultyStatus } from './DifficultyStatus'
import { getDifficultyStage } from './gameDifficulty'
import { WhackNoteMark } from './WhackNoteMark'
import {
  applyProgressResult,
  createInitialGameProgress,
  type GameProgress,
} from './gameProgress'
import {
  addTimeToDeadline,
  CORRECT_TIME_BONUS_MS,
  createGameDeadline,
  getRemainingTime,
  HIT_FEEDBACK_MS,
  INITIAL_GAME_TIME_MS,
  TIMER_REFRESH_MS,
  type ClockSource,
} from './gameTimer'
import {
  applyRoundResult,
  createInitialGameStats,
  type GameResult,
  type GameStats,
} from './gameStats'

type TimerHandleRef = { current: number | null }

type RoundFeedback = {
  type: Extract<GameResult, 'correct' | 'incorrect'>
  selectedTargetId: string
  levelUp: boolean
} | {
  type: 'miss'
} | null

type RoundOutcome =
  | { type: 'correct'; selectedTargetId: string }
  | { type: 'incorrect'; selectedTargetId: string }
  | { type: 'miss' }

export type GamePhase = 'playing' | 'game-over'
export type GameOverReason = 'lives' | 'time'

export interface GameScreenProps {
  createRound?: GameRoundFactory
  clock?: ClockSource
}

const clearTimeoutRef = (timerRef: TimerHandleRef): void => {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

const clearIntervalRef = (timerRef: TimerHandleRef): void => {
  if (timerRef.current !== null) {
    window.clearInterval(timerRef.current)
    timerRef.current = null
  }
}

const getTargetVisualState = (
  target: GameTarget,
  feedback: RoundFeedback,
): TargetVisualState => {
  if (!feedback) {
    return 'idle'
  }

  if (
    feedback.type !== 'miss' &&
    target.id === feedback.selectedTargetId
  ) {
    return feedback.type === 'correct' ? 'correct' : 'incorrect'
  }

  if (feedback.type !== 'correct' && isCorrectTarget(target)) {
    return 'correct-answer'
  }

  return 'idle'
}

export const GameScreen = ({
  createRound = createGameRound,
  clock = Date.now,
}: GameScreenProps): ReactElement => {
  const [progress, setProgress] = useState<GameProgress>(
    createInitialGameProgress,
  )
  const [round, setRound] = useState<GameRound>(() =>
    createRound(getDifficultyStage(0)),
  )
  const [feedback, setFeedback] = useState<RoundFeedback>(null)
  const [stats, setStats] = useState<GameStats>(createInitialGameStats)
  const [phase, setPhase] = useState<GamePhase>('playing')
  const [gameOverReason, setGameOverReason] =
    useState<GameOverReason | null>(null)
  const [initialGameDeadline] = useState(() =>
    createGameDeadline(clock(), INITIAL_GAME_TIME_MS),
  )
  const [remainingTimeMs, setRemainingTimeMs] = useState(() =>
    getRemainingTime(initialGameDeadline, clock()),
  )

  const clockRef = useRef<ClockSource>(clock)
  const gameDeadlineRef = useRef(initialGameDeadline)
  const progressRef = useRef(progress)
  const roundRef = useRef(round)
  const feedbackRef = useRef<RoundFeedback>(null)
  const statsRef = useRef(stats)
  const phaseRef = useRef<GamePhase>('playing')
  const gameOverReasonRef = useRef<GameOverReason | null>(null)
  const globalExpiredRef = useRef(false)
  const roundIdRef = useRef(0)
  const roundDeadlineRef = useRef(0)
  const isRoundResolvedRef = useRef(false)

  const transitionTimeoutRef = useRef<number | null>(null)
  const roundExpiryTimeoutRef = useRef<number | null>(null)
  const globalExpiryTimeoutRef = useRef<number | null>(null)
  const globalRefreshIntervalRef = useRef<number | null>(null)
  const roundExpiryHandlerRef = useRef<(roundId: number) => void>(() => {})

  const clearTransition = useCallback(() => {
    clearTimeoutRef(transitionTimeoutRef)
  }, [])

  const clearRoundExpiry = useCallback(() => {
    clearTimeoutRef(roundExpiryTimeoutRef)
  }, [])

  const clearGlobalExpiry = useCallback(() => {
    clearTimeoutRef(globalExpiryTimeoutRef)
  }, [])

  const commitProgress = useCallback((nextProgress: GameProgress): void => {
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }, [])

  const finishGame = useCallback(
    (reason: GameOverReason): void => {
      if (phaseRef.current === 'game-over') {
        return
      }

      phaseRef.current = 'game-over'
      gameOverReasonRef.current = reason
      clearRoundExpiry()
      clearGlobalExpiry()
      clearIntervalRef(globalRefreshIntervalRef)
      setPhase('game-over')
      setGameOverReason(reason)
    },
    [clearGlobalExpiry, clearRoundExpiry],
  )

  const refreshGlobalTimer = useCallback((): void => {
    if (phaseRef.current === 'game-over') {
      return
    }

    const remaining = getRemainingTime(
      gameDeadlineRef.current,
      clockRef.current(),
    )
    setRemainingTimeMs(remaining)

    if (remaining === 0) {
      globalExpiredRef.current = true

      if (feedbackRef.current === null) {
        finishGame('time')
      }
    }
  }, [finishGame])

  const scheduleGlobalExpiry = useCallback((): void => {
    clearGlobalExpiry()

    const remaining = getRemainingTime(
      gameDeadlineRef.current,
      clockRef.current(),
    )

    globalExpiryTimeoutRef.current = window.setTimeout(() => {
      globalExpiryTimeoutRef.current = null
      refreshGlobalTimer()
    }, remaining)
  }, [clearGlobalExpiry, refreshGlobalTimer])

  const startGlobalRefresh = useCallback((): void => {
    clearIntervalRef(globalRefreshIntervalRef)
    globalRefreshIntervalRef.current = window.setInterval(
      refreshGlobalTimer,
      TIMER_REFRESH_MS,
    )
  }, [refreshGlobalTimer])

  const scheduleRoundExpiry = useCallback(
    (roundId: number, deadline: number): void => {
      clearRoundExpiry()

      const remaining = getRemainingTime(deadline, clockRef.current())
      roundExpiryTimeoutRef.current = window.setTimeout(() => {
        roundExpiryTimeoutRef.current = null
        roundExpiryHandlerRef.current(roundId)
      }, remaining)
    },
    [clearRoundExpiry],
  )

  const startNextRound = useCallback((): void => {
    if (phaseRef.current !== 'playing') {
      return
    }

    const roundStart = clockRef.current()
    const remaining = getRemainingTime(gameDeadlineRef.current, roundStart)
    setRemainingTimeMs(remaining)

    if (remaining === 0) {
      globalExpiredRef.current = true
      finishGame('time')
      return
    }

    const nextStage = getDifficultyStage(progressRef.current.stageIndex)
    const nextRound = createRound(nextStage)
    const nextRoundId = roundIdRef.current + 1
    const nextRoundDeadline = createGameDeadline(
      clockRef.current(),
      nextStage.roundLifetimeMs,
    )

    roundIdRef.current = nextRoundId
    roundDeadlineRef.current = nextRoundDeadline
    isRoundResolvedRef.current = false
    roundRef.current = nextRound
    feedbackRef.current = null
    setRound(nextRound)
    setFeedback(null)
    scheduleRoundExpiry(nextRoundId, nextRoundDeadline)
  }, [createRound, finishGame, scheduleRoundExpiry])

  const resolveRound = useCallback(
    (outcome: RoundOutcome, expectedRoundId: number): void => {
      if (
        phaseRef.current !== 'playing' ||
        feedbackRef.current !== null ||
        isRoundResolvedRef.current ||
        roundIdRef.current !== expectedRoundId
      ) {
        return
      }

      isRoundResolvedRef.current = true
      clearRoundExpiry()

      const nextStats = applyRoundResult(statsRef.current, outcome.type)
      const progressUpdate = applyProgressResult(
        progressRef.current,
        outcome.type,
      )
      const nextFeedback: RoundFeedback =
        outcome.type === 'miss'
          ? { type: 'miss' }
          : {
              type: outcome.type,
              selectedTargetId: outcome.selectedTargetId,
              levelUp: progressUpdate.advanced,
            }

      statsRef.current = nextStats
      feedbackRef.current = nextFeedback
      setStats(nextStats)
      setFeedback(nextFeedback)

      if (outcome.type === 'correct') {
        gameDeadlineRef.current = addTimeToDeadline(
          gameDeadlineRef.current,
          CORRECT_TIME_BONUS_MS,
        )
        globalExpiredRef.current = false
        refreshGlobalTimer()
        scheduleGlobalExpiry()
      }

      transitionTimeoutRef.current = window.setTimeout(() => {
        transitionTimeoutRef.current = null
        feedbackRef.current = null
        setFeedback(null)
        commitProgress(progressUpdate.progress)

        if (phaseRef.current !== 'playing') {
          return
        }

        if (nextStats.lives === 0) {
          finishGame('lives')
          return
        }

        const remaining = getRemainingTime(
          gameDeadlineRef.current,
          clockRef.current(),
        )
        setRemainingTimeMs(remaining)

        if (globalExpiredRef.current || remaining === 0) {
          globalExpiredRef.current = true
          finishGame('time')
          return
        }

        startNextRound()
      }, HIT_FEEDBACK_MS)
    },
    [
      clearRoundExpiry,
      commitProgress,
      finishGame,
      refreshGlobalTimer,
      scheduleGlobalExpiry,
      startNextRound,
    ],
  )

  const handleRoundExpiry = useCallback(
    (expectedRoundId: number): void => {
      if (
        phaseRef.current !== 'playing' ||
        feedbackRef.current !== null ||
        isRoundResolvedRef.current ||
        roundIdRef.current !== expectedRoundId
      ) {
        return
      }

      const remaining = getRemainingTime(
        gameDeadlineRef.current,
        clockRef.current(),
      )
      setRemainingTimeMs(remaining)

      if (remaining === 0) {
        globalExpiredRef.current = true
        finishGame('time')
        return
      }

      resolveRound({ type: 'miss' }, expectedRoundId)
    },
    [finishGame, resolveRound],
  )

  const handleTargetHit = useCallback(
    (target: GameTarget): void => {
      if (
        phaseRef.current !== 'playing' ||
        feedbackRef.current !== null ||
        isRoundResolvedRef.current ||
        !roundRef.current.targets.some(
          (currentTarget) => currentTarget.id === target.id,
        )
      ) {
        return
      }

      const now = clockRef.current()
      const remaining = getRemainingTime(
        gameDeadlineRef.current,
        now,
      )
      setRemainingTimeMs(remaining)

      if (remaining === 0) {
        globalExpiredRef.current = true
        finishGame('time')
        return
      }

      if (getRemainingTime(roundDeadlineRef.current, now) === 0) {
        resolveRound({ type: 'miss' }, roundIdRef.current)
        return
      }

      const outcome: RoundOutcome = isCorrectTarget(target)
        ? { type: 'correct', selectedTargetId: target.id }
        : { type: 'incorrect', selectedTargetId: target.id }

      resolveRound(outcome, roundIdRef.current)
    },
    [finishGame, resolveRound],
  )

  const handleRestart = useCallback((): void => {
    clearTransition()
    clearRoundExpiry()
    clearGlobalExpiry()

    const freshProgress = createInitialGameProgress()
    const freshStage = getDifficultyStage(freshProgress.stageIndex)
    const freshRound = createRound(freshStage)
    const freshDeadline = createGameDeadline(
      clockRef.current(),
      INITIAL_GAME_TIME_MS,
    )
    const freshRoundId = roundIdRef.current + 1
    const freshRoundDeadline = createGameDeadline(
      clockRef.current(),
      freshStage.roundLifetimeMs,
    )

    gameDeadlineRef.current = freshDeadline
    roundDeadlineRef.current = freshRoundDeadline
    roundIdRef.current = freshRoundId
    globalExpiredRef.current = false
    isRoundResolvedRef.current = false
    progressRef.current = freshProgress
    phaseRef.current = 'playing'
    gameOverReasonRef.current = null
    roundRef.current = freshRound
    feedbackRef.current = null
    statsRef.current = createInitialGameStats()

    setProgress(freshProgress)
    setRound(freshRound)
    setStats(statsRef.current)
    setFeedback(null)
    setPhase('playing')
    setGameOverReason(null)
    setRemainingTimeMs(
      getRemainingTime(freshDeadline, clockRef.current()),
    )

    startGlobalRefresh()
    scheduleRoundExpiry(freshRoundId, freshRoundDeadline)
    scheduleGlobalExpiry()
  }, [
    clearGlobalExpiry,
    clearRoundExpiry,
    clearTransition,
    createRound,
    scheduleGlobalExpiry,
    scheduleRoundExpiry,
    startGlobalRefresh,
  ])

  useEffect(() => {
    clockRef.current = clock
  }, [clock])

  useEffect(() => {
    roundExpiryHandlerRef.current = handleRoundExpiry
  }, [handleRoundExpiry])

  useEffect(() => {
    globalExpiredRef.current = false
    roundIdRef.current = 1
    isRoundResolvedRef.current = false
    roundDeadlineRef.current = createGameDeadline(
      clockRef.current(),
      getDifficultyStage(progressRef.current.stageIndex).roundLifetimeMs,
    )

    startGlobalRefresh()
    scheduleGlobalExpiry()
    scheduleRoundExpiry(1, roundDeadlineRef.current)
    refreshGlobalTimer()

    const handleVisibilityChange = (): void => {
      refreshGlobalTimer()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTransition()
      clearRoundExpiry()
      clearGlobalExpiry()
      clearIntervalRef(globalRefreshIntervalRef)
      roundIdRef.current += 1
      isRoundResolvedRef.current = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    clearGlobalExpiry,
    clearRoundExpiry,
    clearTransition,
    refreshGlobalTimer,
    scheduleGlobalExpiry,
    scheduleRoundExpiry,
    startGlobalRefresh,
  ])

  const currentStage = getDifficultyStage(progress.stageIndex)
  const feedbackMessage = feedback
    ? feedback.type === 'correct'
      ? feedback.levelUp
        ? 'Correct! Level up'
        : 'Correct!'
      : feedback.type === 'incorrect'
        ? `Not quite — ${round.prompt.pitch.note}`
      : `Too slow — ${round.prompt.pitch.note}`
    : ''
  const feedbackIcon = feedback
    ? feedback.type === 'correct'
      ? '✓'
      : feedback.type === 'incorrect'
        ? '×'
        : '◷'
    : ''
  const targetsBySlot = new Map(round.targets.map((target) => [target.slot, target]))

  return (
    <section className="game-card" aria-labelledby="game-title">
      <header className="game-header">
        <div className="brand-lockup">
          <WhackNoteMark />
          <p className="eyebrow">Music note arcade</p>
        </div>
        <h1 id="game-title">Whack-a-Note</h1>
        <p className="subtitle">Find the matching note</p>
      </header>

      {phase === 'game-over' ? (
        <GameOverScreen
          score={stats.score}
          bestStreak={stats.bestStreak}
          reason={gameOverReason ?? 'time'}
          levelReached={currentStage}
          onRestart={handleRestart}
        />
      ) : (
        <>
          <GameHud stats={stats} remainingTimeMs={remainingTimeMs} />
          <DifficultyStatus
            stage={currentStage}
            correctInStage={progress.correctInStage}
          />

          <div className="game-prompt">
            <div className="staff-panel">
              <MusicStaff
                prompt={round.prompt}
                ariaLabel={`Note to identify on ${round.prompt.clef} clef`}
              />
            </div>
          </div>

          <p className="prompt-instruction">Which note?</p>

          <div className="target-board-shell">
            <div className="target-board" role="group" aria-label="Note targets">
              {GAME_BOARD_SLOTS.map((slot) => {
                const target = targetsBySlot.get(slot)

                return (
                  <div className="target-slot" data-slot={slot} key={`slot-${slot}`}>
                    {target ? (
                      <Target
                        target={target}
                        state={getTargetVisualState(target, feedback)}
                        disabled={feedback !== null}
                        onHit={handleTargetHit}
                      />
                    ) : (
                      <TargetHole />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <p
            className={`game-feedback${feedback ? ` game-feedback--${feedback.type}` : ''}${feedback?.type === 'correct' && feedback.levelUp ? ' game-feedback--level-up' : ''}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="feedback-icon" aria-hidden="true">
              {feedbackIcon}
            </span>
            <span>{feedbackMessage}</span>
          </p>
          <span className="sr-only">
            {ACTIVE_TARGET_COUNT} note targets are active.
          </span>
        </>
      )}
    </section>
  )
}
