import { type ReactElement } from 'react'
import { type GameStats } from './gameStats'
import { formatRemainingSeconds } from './gameTimer'

export interface GameHudProps {
  stats: GameStats
  remainingTimeMs: number | null
  showLives?: boolean
}

export const GameHud = ({
  stats,
  remainingTimeMs,
  showLives = true,
}: GameHudProps): ReactElement => {
  const livesDescription = `${stats.lives} ${stats.lives === 1 ? 'life' : 'lives'} remaining`
  const remainingSeconds = remainingTimeMs === null
    ? null
    : formatRemainingSeconds(remainingTimeMs)
  const isTimeUrgent = remainingTimeMs !== null && remainingTimeMs <= 5_000
  const statCount = 2 + Number(showLives) + Number(remainingTimeMs !== null)

  return (
    <div className={`game-hud game-hud--${statCount}`} aria-label="Game stats">
      <div className="game-stat" data-stat="score">
        <span className="game-stat-label">Score</span>
        <strong className="game-stat-value">{stats.score.toLocaleString()}</strong>
      </div>
      <div
        className={`game-stat game-stat--streak${stats.streak >= 3 ? ' game-stat--streak-hot' : ''}`}
        data-stat="streak"
      >
        <span className="game-stat-label">Streak</span>
        <strong className="game-stat-value">{stats.streak}</strong>
      </div>
      {showLives ? (
        <div className="game-stat game-stat--lives" data-stat="lives">
          <span className="game-stat-label">Lives</span>
          <span className="life-hearts" aria-hidden="true">
            {[0, 1, 2].map((life) => (
              <span
                className={`life-pip${life < stats.lives ? ' life-pip--full' : ''}`}
                key={life}
              />
            ))}
          </span>
          <span className="sr-only">{livesDescription}</span>
        </div>
      ) : null}
      {remainingSeconds !== null ? (
        <div
          className={`game-stat game-stat--time${isTimeUrgent ? ' game-stat--time-urgent' : ''}`}
          data-stat="time"
        >
          <span className="game-stat-label">Time</span>
          <strong
            className="game-stat-value"
            aria-label={`${remainingSeconds} seconds remaining`}
          >
            {remainingSeconds}
          </strong>
          {isTimeUrgent ? (
            <span className="timer-urgency" aria-hidden="true">
              !
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
