import { useEffect, useRef, useState, type ReactElement } from 'react'
import { MusicStaff } from '../notation'
import {
  ACTIVE_TARGET_COUNT,
  createGameRound,
  GAME_BOARD_SLOTS,
  isCorrectTarget,
  type GameRound,
  type GameTarget,
} from './gameRound'
import { Target, type TargetVisualState } from './Target'
import { GameHud } from './GameHud'
import { GameOverScreen } from './GameOverScreen'
import {
  applyHitResult,
  createInitialGameStats,
  type GameStats,
} from './gameStats'

const HIT_FEEDBACK_MS = 400

type HitFeedback = {
  selectedTargetId: string
  correct: boolean
} | null

export type GamePhase = 'playing' | 'game-over'

export interface GameScreenProps {
  createRound?: () => GameRound
}

const getTargetVisualState = (
  target: GameTarget,
  feedback: HitFeedback,
): TargetVisualState => {
  if (!feedback) {
    return 'idle'
  }

  if (target.id === feedback.selectedTargetId) {
    return feedback.correct ? 'correct' : 'incorrect'
  }

  if (!feedback.correct && isCorrectTarget(target)) {
    return 'correct-answer'
  }

  return 'idle'
}

export const GameScreen = ({
  createRound = createGameRound,
}: GameScreenProps): ReactElement => {
  const [round, setRound] = useState<GameRound>(() => createRound())
  const [feedback, setFeedback] = useState<HitFeedback>(null)
  const [stats, setStats] = useState<GameStats>(createInitialGameStats)
  const [phase, setPhase] = useState<GamePhase>('playing')
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    },
    [],
  )

  const handleTargetHit = (target: GameTarget): void => {
    if (
      phase !== 'playing' ||
      feedback !== null ||
      transitionTimeoutRef.current !== null
    ) {
      return
    }

    const correct = isCorrectTarget(target)
    const nextStats = applyHitResult(stats, correct)

    setStats(nextStats)
    setFeedback({ selectedTargetId: target.id, correct })

    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null
      setFeedback(null)

      if (nextStats.lives === 0) {
        setPhase('game-over')
        return
      }

      setRound(createRound())
    }, HIT_FEEDBACK_MS)
  }

  const handleRestart = (): void => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }

    setRound(createRound())
    setStats(createInitialGameStats())
    setFeedback(null)
    setPhase('playing')
  }

  const feedbackMessage = feedback
    ? feedback.correct
      ? 'Correct!'
      : `Not quite — ${round.prompt.pitch.note}`
    : ''
  const targetsBySlot = new Map(round.targets.map((target) => [target.slot, target]))

  return (
    <section className="game-card" aria-labelledby="game-title">
      <header className="game-header">
        <p className="eyebrow">Music note arcade</p>
        <h1 id="game-title">Whack-a-Note</h1>
        <p className="subtitle">Find the matching note</p>
      </header>

      {phase === 'game-over' ? (
        <GameOverScreen
          score={stats.score}
          bestStreak={stats.bestStreak}
          onRestart={handleRestart}
        />
      ) : (
        <>
          <GameHud stats={stats} />

          <div className="game-prompt">
            <MusicStaff
              prompt={round.prompt}
              ariaLabel="Note to identify on treble clef"
            />
          </div>

          <p className="prompt-instruction">Which note?</p>

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
                    <span className="target-hole" aria-hidden="true" />
                  )}
                </div>
              )
            })}
          </div>

          <p
            className={`game-feedback${feedback ? ` game-feedback--${feedback.correct ? 'correct' : 'incorrect'}` : ''}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {feedbackMessage}
          </p>
          <span className="sr-only">
            {ACTIVE_TARGET_COUNT} note targets are active.
          </span>
        </>
      )}
    </section>
  )
}
