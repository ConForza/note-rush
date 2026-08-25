import { type ReactElement } from 'react'
import { type GameOverReason } from './GameScreen'

export interface GameOverScreenProps {
  score: number
  bestStreak: number
  reason: GameOverReason
  onRestart: () => void
}

export const GameOverScreen = ({
  score,
  bestStreak,
  reason,
  onRestart,
}: GameOverScreenProps): ReactElement => (
  <section className="game-over" aria-labelledby="game-over-title">
    <p className="eyebrow">Run complete</p>
    <h2 id="game-over-title">Game Over</h2>
    <p className="game-over-reason">
      {reason === 'time' ? "Time's up" : 'Out of lives'}
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
    </dl>
    <button className="restart-button" type="button" onClick={onRestart}>
      Play Again
    </button>
  </section>
)
