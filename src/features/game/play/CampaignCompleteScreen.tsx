import { useEffect, useRef, type ReactElement } from 'react'
import { type DifficultyStage } from './gameDifficulty'
import { WhackNoteMark } from './WhackNoteMark'
import { focusWithoutScroll } from './focus'

export interface CampaignCompleteScreenProps {
  score: number
  bestStreak: number
  levelReached: DifficultyStage
  onRestart: () => void
  onExit?: () => void
}

export const CampaignCompleteScreen = ({
  score,
  bestStreak,
  levelReached,
  onRestart,
  onExit,
}: CampaignCompleteScreenProps): ReactElement => {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    focusWithoutScroll(headingRef.current)
  }, [])

  return (
    <section
      className="game-over game-over--campaign-complete"
      aria-labelledby="campaign-complete-title"
    >
      <WhackNoteMark />
      <p className="eyebrow">Campaign complete</p>
      <h2 ref={headingRef} id="campaign-complete-title" tabIndex={-1}>
        Campaign Complete
      </h2>
      <p className="game-over-reason">You did it — every level is complete!</p>
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
          <dt>Campaign</dt>
          <dd>
            {levelReached.level} — {levelReached.label}
          </dd>
        </div>
      </dl>
      <button className="restart-button" type="button" onClick={onRestart}>
        Play Again
      </button>
      {onExit ? (
        <button className="exit-button" type="button" onClick={onExit}>
          Change Setup
        </button>
      ) : null}
    </section>
  )
}
