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
import {
  Target,
  TargetHole,
  TARGET_EMERGENCE_DURATION_MS,
  TARGET_EMERGENCE_STAGGER_MS,
  type TargetVisualState,
} from './Target'
import { GameHud } from './GameHud'
import { GameOverScreen } from './GameOverScreen'
import { DifficultyStatus } from './DifficultyStatus'
import { getDifficultyStage, type DifficultyStage } from './gameDifficulty'
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

const ROUND_ANTICIPATION_MIN_MS = 180
const ROUND_ANTICIPATION_MAX_MS = 260
export const ROUND_READY_DELAY_MAX_MS =
  ROUND_ANTICIPATION_MAX_MS +
  (ACTIVE_TARGET_COUNT - 1) * TARGET_EMERGENCE_STAGGER_MS +
  TARGET_EMERGENCE_DURATION_MS

type TargetEmergenceDelays = Readonly<Record<string, number>>

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const createTargetEmergenceDelays = (
  targets: readonly GameTarget[],
): TargetEmergenceDelays => {
  if (prefersReducedMotion()) {
    return Object.fromEntries(targets.map((target) => [target.id, 0]))
  }

  const anticipationDelay =
    ROUND_ANTICIPATION_MIN_MS +
    Math.floor(
      Math.random() *
        (ROUND_ANTICIPATION_MAX_MS - ROUND_ANTICIPATION_MIN_MS + 1),
    )
  const orderedTargets = [...targets].sort(() => Math.random() - 0.5)

  return Object.fromEntries(
    orderedTargets.map((target, index) => [
      target.id,
      anticipationDelay + index * TARGET_EMERGENCE_STAGGER_MS,
    ]),
  )
}

const getTargetReadyDelay = (): number =>
  prefersReducedMotion()
    ? 0
    : ROUND_READY_DELAY_MAX_MS

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

  if (feedback.type === 'correct') {
    return target.id === feedback.selectedTargetId ? 'correct' : 'retreating'
  }

  if (
    feedback.type === 'incorrect' &&
    target.id === feedback.selectedTargetId
  ) {
    return 'incorrect'
  }

  if (isCorrectTarget(target)) {
    return 'correct-answer'
  }

  return 'retreating'
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
  const [targetAnimationKey, setTargetAnimationKey] = useState(0)
  const [targetEmergenceDelays, setTargetEmergenceDelays] = useState<TargetEmergenceDelays>(() =>
    createTargetEmergenceDelays(round.targets),
  )
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
  const roundReadyRef = useRef(false)
  const globalPauseStartedRef = useRef<number | null>(null)
  const isRoundResolvedRef = useRef(false)

  const transitionTimeoutRef = useRef<number | null>(null)
  const roundReadyTimeoutRef = useRef<number | null>(null)
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

  const clearRoundReady = useCallback(() => {
    clearTimeoutRef(roundReadyTimeoutRef)
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
      globalPauseStartedRef.current = null
      clearRoundReady()
      clearRoundExpiry()
      clearGlobalExpiry()
      clearIntervalRef(globalRefreshIntervalRef)
      setPhase('game-over')
      setGameOverReason(reason)
    },
    [clearGlobalExpiry, clearRoundExpiry, clearRoundReady],
  )

  const refreshGlobalTimer = useCallback((): void => {
    if (phaseRef.current === 'game-over') {
      return
    }

    if (globalPauseStartedRef.current !== null) {
      setRemainingTimeMs(
        getRemainingTime(gameDeadlineRef.current, clockRef.current()),
      )
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

    if (globalPauseStartedRef.current !== null) {
      return
    }

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

    if (globalPauseStartedRef.current !== null) {
      return
    }

    globalRefreshIntervalRef.current = window.setInterval(
      refreshGlobalTimer,
      TIMER_REFRESH_MS,
    )
  }, [refreshGlobalTimer])

  const pauseGlobalTimer = useCallback((): void => {
    if (globalPauseStartedRef.current !== null) {
      return
    }

    globalPauseStartedRef.current = clockRef.current()
    clearGlobalExpiry()
    clearIntervalRef(globalRefreshIntervalRef)
  }, [clearGlobalExpiry])

  const resumeGlobalTimer = useCallback((): void => {
    const pauseStarted = globalPauseStartedRef.current

    if (pauseStarted === null) {
      return
    }

    const pausedDuration = Math.max(0, clockRef.current() - pauseStarted)
    gameDeadlineRef.current += pausedDuration
    globalPauseStartedRef.current = null
    refreshGlobalTimer()
    startGlobalRefresh()
    scheduleGlobalExpiry()
  }, [refreshGlobalTimer, scheduleGlobalExpiry, startGlobalRefresh])

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

  const startRoundPresentation = useCallback(
    (
      roundId: number,
      stage: DifficultyStage,
    ): void => {
      clearRoundReady()
      clearRoundExpiry()
      roundReadyRef.current = false
      roundDeadlineRef.current = 0
      pauseGlobalTimer()

      roundReadyTimeoutRef.current = window.setTimeout(() => {
        roundReadyTimeoutRef.current = null

        if (
          phaseRef.current !== 'playing' ||
          feedbackRef.current !== null ||
          roundIdRef.current !== roundId
        ) {
          return
        }

        roundReadyRef.current = true
        roundDeadlineRef.current = createGameDeadline(
          clockRef.current(),
          stage.roundLifetimeMs,
        )
        scheduleRoundExpiry(roundId, roundDeadlineRef.current)
        resumeGlobalTimer()
      }, getTargetReadyDelay())
    },
    [
      clearRoundExpiry,
      clearRoundReady,
      pauseGlobalTimer,
      resumeGlobalTimer,
      scheduleRoundExpiry,
    ],
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
    const nextEmergenceDelays = createTargetEmergenceDelays(nextRound.targets)

    roundIdRef.current = nextRoundId
    roundReadyRef.current = false
    roundDeadlineRef.current = 0
    isRoundResolvedRef.current = false
    roundRef.current = nextRound
    feedbackRef.current = null
    setRound(nextRound)
    setTargetAnimationKey((key) => key + 1)
    setTargetEmergenceDelays(nextEmergenceDelays)
    setFeedback(null)
    startRoundPresentation(nextRoundId, nextStage)
  }, [createRound, finishGame, startRoundPresentation])

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
      clearRoundReady()
      clearRoundExpiry()
      roundReadyRef.current = false
      pauseGlobalTimer()

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
        setRemainingTimeMs(
          getRemainingTime(gameDeadlineRef.current, clockRef.current()),
        )
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
      clearRoundReady,
      commitProgress,
      finishGame,
      pauseGlobalTimer,
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

      if (
        roundReadyRef.current &&
        getRemainingTime(roundDeadlineRef.current, now) === 0
      ) {
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
    clearRoundReady()
    clearRoundExpiry()
    clearGlobalExpiry()
    globalPauseStartedRef.current = null

    const freshProgress = createInitialGameProgress()
    const freshStage = getDifficultyStage(freshProgress.stageIndex)
    const freshRound = createRound(freshStage)
    const freshEmergenceDelays = createTargetEmergenceDelays(freshRound.targets)
    const freshDeadline = createGameDeadline(
      clockRef.current(),
      INITIAL_GAME_TIME_MS,
    )
    const freshRoundId = roundIdRef.current + 1

    gameDeadlineRef.current = freshDeadline
    roundIdRef.current = freshRoundId
    roundReadyRef.current = false
    roundDeadlineRef.current = 0
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
    setTargetAnimationKey((key) => key + 1)
    setTargetEmergenceDelays(freshEmergenceDelays)
    setStats(statsRef.current)
    setFeedback(null)
    setPhase('playing')
    setGameOverReason(null)
    setRemainingTimeMs(
      getRemainingTime(freshDeadline, clockRef.current()),
    )

    startRoundPresentation(freshRoundId, freshStage)
  }, [
    clearGlobalExpiry,
    clearRoundExpiry,
    clearRoundReady,
    clearTransition,
    createRound,
    startRoundPresentation,
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
    roundReadyRef.current = false
    isRoundResolvedRef.current = false
    roundDeadlineRef.current = 0
    pauseGlobalTimer()
    startRoundPresentation(
      1,
      getDifficultyStage(progressRef.current.stageIndex),
    )
    refreshGlobalTimer()

    const handleVisibilityChange = (): void => {
      refreshGlobalTimer()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTransition()
      clearRoundReady()
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
    clearRoundReady,
    clearTransition,
    pauseGlobalTimer,
    refreshGlobalTimer,
    startRoundPresentation,
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
                        key={`${targetAnimationKey}-${target.id}`}
                        target={target}
                        state={getTargetVisualState(target, feedback)}
                        disabled={feedback !== null}
                        emergenceDelayMs={targetEmergenceDelays[target.id] ?? 0}
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
