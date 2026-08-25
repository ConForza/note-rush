import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { MusicStaff } from '../notation'
import { type RandomSource } from '../domain'
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
  type TargetVisualState,
} from './Target'
import {
  createTargetEmergenceSchedule,
  type TargetEmergenceSchedule,
} from './targetEmergence'
import { GameHud } from './GameHud'
import { GameOverScreen } from './GameOverScreen'
import { CampaignCompleteScreen } from './CampaignCompleteScreen'
import { DifficultyStatus } from './DifficultyStatus'
import { type DifficultyStage } from './gameDifficulty'
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
  TIMER_REFRESH_MS,
  type ClockSource,
} from './gameTimer'
import {
  applyRoundResult,
  createInitialGameStats,
  type GameResult,
  type GameStats,
} from './gameStats'
import {
  DEFAULT_ARCADE_CONFIG,
  getSessionRules,
  getSessionStage,
  getSessionStageIndex,
  getSessionTimerMs,
  type GameSessionConfig,
} from '../session'
import {
  NOOP_GAME_EFFECTS,
  type GameEffects,
  type GameFeedbackEvent,
} from '../effects'
import { focusWithoutScroll } from './focus'

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

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export type GamePhase = 'playing' | 'game-over' | 'campaign-complete'
export type GameOverReason = 'lives' | 'time'
export type GameEndReason = GameOverReason | 'campaign-complete'

export interface GameScreenProps {
  createRound?: GameRoundFactory
  clock?: ClockSource
  presentationRandom?: RandomSource
  sessionConfig?: GameSessionConfig
  onExit?: () => void
  effects?: GameEffects
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
  presentationRandom = Math.random,
  sessionConfig = DEFAULT_ARCADE_CONFIG,
  onExit,
  effects = NOOP_GAME_EFFECTS,
}: GameScreenProps): ReactElement => {
  const sessionRules = getSessionRules(sessionConfig)
  const initialStageIndex =
    sessionConfig.mode === 'practice'
      ? getSessionStageIndex(sessionConfig)
      : 0
  const [progress, setProgress] = useState<GameProgress>(
    () => createInitialGameProgress(initialStageIndex),
  )
  const [round, setRound] = useState<GameRound>(() =>
    createRound(getSessionStage(sessionConfig, initialStageIndex)),
  )
  const [feedback, setFeedback] = useState<RoundFeedback>(null)
  const [roundReady, setRoundReady] = useState(false)
  const [targetAnimationKey, setTargetAnimationKey] = useState(0)
  const [emergenceSchedule, setEmergenceSchedule] =
    useState<TargetEmergenceSchedule>(() =>
      createTargetEmergenceSchedule(
        round.targets,
        presentationRandom,
        prefersReducedMotion(),
      ),
    )
  const [stats, setStats] = useState<GameStats>(createInitialGameStats)
  const [phase, setPhase] = useState<GamePhase>('playing')
  const [endReason, setEndReason] = useState<GameEndReason | null>(null)
  const [initialGameDeadline] = useState<number | null>(() => {
    const timerMs = getSessionTimerMs(sessionConfig)

    return timerMs === null ? null : createGameDeadline(clock(), timerMs)
  })
  const [remainingTimeMs, setRemainingTimeMs] = useState(() =>
    initialGameDeadline === null
      ? null
      : getRemainingTime(initialGameDeadline, clock()),
  )

  const clockRef = useRef<ClockSource>(clock)
  const gameDeadlineRef = useRef<number | null>(initialGameDeadline)
  const progressRef = useRef(progress)
  const roundRef = useRef(round)
  const feedbackRef = useRef<RoundFeedback>(null)
  const statsRef = useRef(stats)
  const phaseRef = useRef<GamePhase>('playing')
  const endReasonRef = useRef<GameEndReason | null>(null)
  const globalExpiredRef = useRef(false)
  const roundIdRef = useRef(0)
  const roundDeadlineRef = useRef(0)
  const roundReadyRef = useRef(false)
  const globalPauseStartedRef = useRef<number | null>(null)
  const isRoundResolvedRef = useRef(false)
  const initialEmergenceScheduleRef = useRef(emergenceSchedule)

  const transitionTimeoutRef = useRef<number | null>(null)
  const roundReadyTimeoutRef = useRef<number | null>(null)
  const roundExpiryTimeoutRef = useRef<number | null>(null)
  const globalExpiryTimeoutRef = useRef<number | null>(null)
  const globalRefreshIntervalRef = useRef<number | null>(null)
  const roundExpiryHandlerRef = useRef<(roundId: number) => void>(() => {})
  const gameHeadingRef = useRef<HTMLHeadingElement>(null)
  const targetBoardRef = useRef<HTMLDivElement>(null)
  const keyboardInteractionRef = useRef(false)
  const restoreTargetFocusRef = useRef(false)

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

  const focusGameHeading = useCallback((): void => {
    focusWithoutScroll(gameHeadingRef.current)
  }, [])

  useEffect(() => {
    focusGameHeading()
  }, [focusGameHeading])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
        keyboardInteractionRef.current = true
      }
    }
    const handlePointerDown = (): void => {
      keyboardInteractionRef.current = false
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!roundReady || !restoreTargetFocusRef.current) {
      return
    }

    const firstActiveTarget = targetBoardRef.current?.querySelector<HTMLButtonElement>(
      '.target-button:not(:disabled)',
    )

    if (firstActiveTarget) {
      focusWithoutScroll(firstActiveTarget)
      restoreTargetFocusRef.current = false
    }
  }, [roundReady, targetAnimationKey])

  const emitEffect = useCallback(
    (event: GameFeedbackEvent): void => {
      try {
        effects.emit(event)
      } catch {
        // Optional feedback must never affect authoritative gameplay.
      }
    },
    [effects],
  )

  const getGlobalEffectiveNow = useCallback(
    (): number => globalPauseStartedRef.current ?? clockRef.current(),
    [],
  )

  const getGlobalRemainingTime = useCallback(
    (): number | null =>
      gameDeadlineRef.current === null
        ? null
        : getRemainingTime(gameDeadlineRef.current, getGlobalEffectiveNow()),
    [getGlobalEffectiveNow],
  )

  const commitProgress = useCallback((nextProgress: GameProgress): void => {
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }, [])

  const finishGame = useCallback(
    (reason: GameEndReason): void => {
      if (phaseRef.current !== 'playing') {
        return
      }

      const nextPhase: GamePhase =
        reason === 'campaign-complete' ? 'campaign-complete' : 'game-over'

      phaseRef.current = nextPhase
      endReasonRef.current = reason
      globalPauseStartedRef.current = null
      emitEffect(
        sessionConfig.mode === 'practice'
          ? 'practice-complete'
          : reason === 'campaign-complete'
            ? 'campaign-complete'
            : 'game-over',
      )
      clearTransition()
      clearRoundReady()
      clearRoundExpiry()
      clearGlobalExpiry()
      clearIntervalRef(globalRefreshIntervalRef)
      setPhase(nextPhase)
      setEndReason(reason)
    },
    [
      clearGlobalExpiry,
      clearRoundExpiry,
      clearRoundReady,
      clearTransition,
      emitEffect,
      sessionConfig.mode,
    ],
  )

  const refreshGlobalTimer = useCallback((): void => {
    if (phaseRef.current !== 'playing') {
      return
    }

    const remaining = getGlobalRemainingTime()
    setRemainingTimeMs(remaining)

    if (remaining === 0) {
      globalExpiredRef.current = true

      if (feedbackRef.current === null) {
        finishGame('time')
      }
    }
  }, [finishGame, getGlobalRemainingTime])

  const scheduleGlobalExpiry = useCallback((): void => {
    clearGlobalExpiry()

    if (globalPauseStartedRef.current !== null) {
      return
    }

    const remaining = getGlobalRemainingTime()

    if (remaining === null) {
      return
    }

    globalExpiryTimeoutRef.current = window.setTimeout(() => {
      globalExpiryTimeoutRef.current = null
      refreshGlobalTimer()
    }, remaining)
  }, [clearGlobalExpiry, getGlobalRemainingTime, refreshGlobalTimer])

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
    if (
      gameDeadlineRef.current === null ||
      globalPauseStartedRef.current !== null
    ) {
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

    if (gameDeadlineRef.current !== null) {
      const pausedDuration = Math.max(0, clockRef.current() - pauseStarted)
      gameDeadlineRef.current += pausedDuration
    }
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
      schedule: TargetEmergenceSchedule,
    ): void => {
      clearRoundReady()
      clearRoundExpiry()
      roundReadyRef.current = false
      setRoundReady(false)
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
        setRoundReady(true)
        roundDeadlineRef.current = createGameDeadline(
          clockRef.current(),
          stage.roundLifetimeMs,
        )
        if (sessionRules.usesRoundDeadline) {
          scheduleRoundExpiry(roundId, roundDeadlineRef.current)
        }
        resumeGlobalTimer()
      }, schedule.readyDelayMs)
    },
    [
      clearRoundExpiry,
      clearRoundReady,
      pauseGlobalTimer,
      resumeGlobalTimer,
      scheduleRoundExpiry,
      sessionRules.usesRoundDeadline,
    ],
  )

  const startNextRound = useCallback((): void => {
    if (phaseRef.current !== 'playing') {
      return
    }

    const remaining = getGlobalRemainingTime()
    setRemainingTimeMs(remaining)

    if (remaining === 0 && sessionConfig.timerSeconds !== null) {
      globalExpiredRef.current = true
      finishGame('time')
      return
    }

    const nextStage = getSessionStage(sessionConfig, progressRef.current.stageIndex)
    const nextRound = createRound(nextStage)
    const nextRoundId = roundIdRef.current + 1
    const nextEmergenceSchedule = createTargetEmergenceSchedule(
      nextRound.targets,
      presentationRandom,
      prefersReducedMotion(),
    )

    roundIdRef.current = nextRoundId
    roundReadyRef.current = false
    setRoundReady(false)
    roundDeadlineRef.current = 0
    isRoundResolvedRef.current = false
    roundRef.current = nextRound
    feedbackRef.current = null
    setRound(nextRound)
    setTargetAnimationKey((key) => key + 1)
    setEmergenceSchedule(nextEmergenceSchedule)
    setFeedback(null)
    startRoundPresentation(nextRoundId, nextStage, nextEmergenceSchedule)
  }, [
    createRound,
    finishGame,
    getGlobalRemainingTime,
    presentationRandom,
    sessionConfig,
    startRoundPresentation,
  ])

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

      if (
        keyboardInteractionRef.current &&
        targetBoardRef.current?.contains(document.activeElement)
      ) {
        restoreTargetFocusRef.current = true
      }

      isRoundResolvedRef.current = true
      clearRoundReady()
      clearRoundExpiry()
      roundReadyRef.current = false
      setRoundReady(false)
      pauseGlobalTimer()

      const nextStats = applyRoundResult(
        statsRef.current,
        outcome.type,
        sessionRules.usesLives,
      )
      const progressUpdate = sessionRules.usesProgression
        ? applyProgressResult(progressRef.current, outcome.type)
        : {
            progress: progressRef.current,
            advanced: false,
            campaignCompleted: false,
          }
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
      if (!progressUpdate.campaignCompleted) {
        emitEffect(
          outcome.type === 'correct'
            ? progressUpdate.advanced
              ? 'level-up'
              : 'correct'
            : outcome.type,
        )
      }

      if (
        outcome.type === 'correct' &&
        sessionRules.usesCorrectTimeBonus &&
        gameDeadlineRef.current !== null
      ) {
        gameDeadlineRef.current = addTimeToDeadline(
          gameDeadlineRef.current,
          CORRECT_TIME_BONUS_MS,
        )
        globalExpiredRef.current = false
        setRemainingTimeMs(
          getGlobalRemainingTime(),
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

        if (progressUpdate.campaignCompleted) {
          finishGame('campaign-complete')
          return
        }

        if (sessionRules.usesLives && nextStats.lives === 0) {
          finishGame('lives')
          return
        }

        const remaining = getGlobalRemainingTime()
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
      getGlobalRemainingTime,
      pauseGlobalTimer,
      emitEffect,
      sessionRules.usesCorrectTimeBonus,
      sessionRules.usesLives,
      sessionRules.usesProgression,
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

      const remaining = getGlobalRemainingTime()
      setRemainingTimeMs(remaining)

      if (remaining === 0) {
        globalExpiredRef.current = true
        finishGame('time')
        return
      }

      resolveRound({ type: 'miss' }, expectedRoundId)
    },
    [finishGame, getGlobalRemainingTime, resolveRound],
  )

  const handleTargetHit = useCallback(
    (target: GameTarget): void => {
      if (
        phaseRef.current !== 'playing' ||
        feedbackRef.current !== null ||
        isRoundResolvedRef.current ||
        !roundReadyRef.current ||
        !roundRef.current.targets.some(
          (currentTarget) => currentTarget.id === target.id,
        )
      ) {
        return
      }

      const now = clockRef.current()
      const remaining = getGlobalRemainingTime()
      setRemainingTimeMs(remaining)

      if (remaining === 0) {
        globalExpiredRef.current = true
        finishGame('time')
        return
      }

      if (
        sessionRules.usesRoundDeadline &&
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
    [
      finishGame,
      getGlobalRemainingTime,
      resolveRound,
      sessionRules.usesRoundDeadline,
    ],
  )

  const reconcileVisibility = useCallback((): void => {
    if (phaseRef.current !== 'playing') {
      return
    }

    refreshGlobalTimer()

    if (
      phaseRef.current !== 'playing' ||
      feedbackRef.current !== null ||
      isRoundResolvedRef.current ||
      !roundReadyRef.current
    ) {
      return
    }

    if (
      sessionRules.usesRoundDeadline &&
      getRemainingTime(roundDeadlineRef.current, clockRef.current()) === 0
    ) {
      resolveRound({ type: 'miss' }, roundIdRef.current)
    }
  }, [refreshGlobalTimer, resolveRound, sessionRules.usesRoundDeadline])

  const handleRestart = useCallback((): void => {
    clearTransition()
    clearRoundReady()
    clearRoundExpiry()
    clearGlobalExpiry()
    globalPauseStartedRef.current = null

    const freshProgress = createInitialGameProgress(initialStageIndex)
    const freshStage = getSessionStage(sessionConfig, freshProgress.stageIndex)
    const freshRound = createRound(freshStage)
    const freshEmergenceSchedule = createTargetEmergenceSchedule(
      freshRound.targets,
      presentationRandom,
      prefersReducedMotion(),
    )
    const freshTimerMs = getSessionTimerMs(sessionConfig)
    const freshDeadline =
      freshTimerMs === null
        ? null
        : createGameDeadline(clockRef.current(), freshTimerMs)
    const freshRoundId = roundIdRef.current + 1

    gameDeadlineRef.current = freshDeadline
    roundIdRef.current = freshRoundId
    roundReadyRef.current = false
    setRoundReady(false)
    roundDeadlineRef.current = 0
    globalExpiredRef.current = false
    keyboardInteractionRef.current = false
    restoreTargetFocusRef.current = false
    isRoundResolvedRef.current = false
    progressRef.current = freshProgress
    phaseRef.current = 'playing'
    endReasonRef.current = null
    roundRef.current = freshRound
    feedbackRef.current = null
    statsRef.current = createInitialGameStats()

    setProgress(freshProgress)
    setRound(freshRound)
    setTargetAnimationKey((key) => key + 1)
    setEmergenceSchedule(freshEmergenceSchedule)
    setStats(statsRef.current)
    setFeedback(null)
    setPhase('playing')
    setEndReason(null)
    setRemainingTimeMs(
      freshDeadline === null
        ? null
        : getRemainingTime(freshDeadline, clockRef.current()),
    )
    focusGameHeading()

    startRoundPresentation(freshRoundId, freshStage, freshEmergenceSchedule)
  }, [
    clearGlobalExpiry,
    clearRoundExpiry,
    clearRoundReady,
    clearTransition,
    createRound,
    focusGameHeading,
    initialStageIndex,
    presentationRandom,
    sessionConfig,
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
      getSessionStage(sessionConfig, progressRef.current.stageIndex),
      initialEmergenceScheduleRef.current,
    )
    refreshGlobalTimer()

    const handleVisibilityChange = (): void => {
      reconcileVisibility()
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
    reconcileVisibility,
    refreshGlobalTimer,
    sessionConfig,
    startRoundPresentation,
  ])

  const currentStage = getSessionStage(sessionConfig, progress.stageIndex)
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
    <section
      className={`game-card${phase === 'playing' ? ' game-card--playing' : ''}`}
      aria-labelledby="game-title"
    >
      <header className="game-header">
        <div className="brand-lockup">
          <WhackNoteMark />
          <p className="eyebrow">Music note arcade</p>
        </div>
        <h1 ref={gameHeadingRef} id="game-title" tabIndex={-1}>
          Whack-a-Note
        </h1>
        <p className="subtitle">Find the matching note</p>
      </header>

      {phase === 'game-over' ? (
        <GameOverScreen
          score={stats.score}
          bestStreak={stats.bestStreak}
          reason={endReason === 'lives' || endReason === 'time' ? endReason : 'time'}
          levelReached={currentStage}
          onRestart={handleRestart}
          onExit={onExit}
          practice={sessionConfig.mode === 'practice'}
        />
      ) : phase === 'campaign-complete' ? (
        <CampaignCompleteScreen
          score={stats.score}
          bestStreak={stats.bestStreak}
          levelReached={currentStage}
          onRestart={handleRestart}
          onExit={onExit}
        />
      ) : (
        <>
          <GameHud
            stats={stats}
            remainingTimeMs={remainingTimeMs}
            showLives={sessionRules.usesLives}
          />
          <DifficultyStatus
            stage={currentStage}
            correctInStage={progress.correctInStage}
            practice={sessionConfig.mode === 'practice'}
          />

          <div className="game-prompt">
            <div className="staff-panel">
              <MusicStaff
                prompt={round.prompt}
                ariaLabel={`Note to identify on ${round.prompt.clef} clef`}
              />
            </div>
          </div>

          <div className="target-board-shell">
            <div
              ref={targetBoardRef}
              className="target-board"
              role="group"
              aria-label="Note targets"
            >
              {GAME_BOARD_SLOTS.map((slot) => {
                const target = targetsBySlot.get(slot)

                return (
                  <div className="target-slot" data-slot={slot} key={`slot-${slot}`}>
                    {target ? (
                      <Target
                        key={`${targetAnimationKey}-${target.id}`}
                        target={target}
                        state={getTargetVisualState(target, feedback)}
                        disabled={feedback !== null || !roundReady}
                        emergenceDelayMs={
                          emergenceSchedule.delaysByTargetId[target.id] ?? 0
                        }
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
          {onExit ? (
            <button className="exit-button" type="button" onClick={onExit}>
              Change Setup
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
