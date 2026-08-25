import { useEffect, useRef, type ReactElement } from 'react'
import { type GameOverReason } from './GameScreen'
import { type DifficultyStage } from './gameDifficulty'
import { WhackNoteMark } from './WhackNoteMark'
import { focusWithoutScroll } from './focus'

export interface GameOverScreenProps {
  score: number
  bestStreak: number
  reason: GameOverReason
  levelReached: DifficultyStage
  onRestart: () => void
  onExit?: () => void
  practice?: boolean
}

export const GameOverScreen = ({
  score,
  bestStreak,
  reason,
  levelReached,
  onRestart,
  onExit,
  practice = false,
}: GameOverScreenProps): ReactElement => {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    focusWithoutScroll(headingRef.current)
  }, [])

  return (
    <section
      className={`game-over game-over--${reason}`}
      aria-labelledby="game-over-title"
    >
      <WhackNoteMark />
      <p className="eyebrow">{practice ? 'Practice complete' : 'Run complete'}</p>
      <h2 ref={headingRef} id="game-over-title" tabIndex={-1}>
        {practice ? 'Practice Complete' : 'Game Over'}
      </h2>
      <p className="game-over-reason">
        {practice
          ? 'Nice work — keep building your note-reading speed.'
          : reason === 'time'
            ? "Time's up"
            : 'Out of lives'}
      </p>
      <dl className="game-over-stats">
        <div>
          <dt>Final score</dt>
          <dd>{score.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{bestStreak}</dd>
        </div>
        <div className="game-over-stat--level">
          <dt>{practice ? 'Practice level' : 'Level reached'}</dt>
          <dd>
            {levelReached.level} — {levelReached.label}
          </dd>
        </div>
      </dl>
      <button className="restart-button" type="button" onClick={onRestart}>
        {practice ? 'Practice Again' : 'Play Again'}
      </button>
      {onExit ? (
        <button className="exit-button" type="button" onClick={onExit}>
          Change Setup
        </button>
      ) : null}
    </section>
  )
}
