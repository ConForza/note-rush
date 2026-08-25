import { type ReactElement } from 'react'
import { type GameStats } from './gameStats'

export interface GameHudProps {
  stats: GameStats
}

export const GameHud = ({ stats }: GameHudProps): ReactElement => {
  const visibleHearts = stats.lives > 0 ? '♥ '.repeat(stats.lives).trim() : '—'
  const livesDescription = `${stats.lives} ${stats.lives === 1 ? 'life' : 'lives'} remaining`

  return (
    <div className="game-hud" aria-label="Game stats">
      <div className="game-stat" data-stat="score">
        <span className="game-stat-label">Score</span>
        <strong className="game-stat-value">{stats.score.toLocaleString()}</strong>
      </div>
      <div className="game-stat" data-stat="streak">
        <span className="game-stat-label">Streak</span>
        <strong className="game-stat-value">{stats.streak}</strong>
      </div>
      <div className="game-stat game-stat--lives" data-stat="lives">
        <span className="game-stat-label">Lives</span>
        <span className="life-hearts" aria-hidden="true">
          {visibleHearts}
        </span>
        <span className="sr-only">{livesDescription}</span>
      </div>
    </div>
  )
}
