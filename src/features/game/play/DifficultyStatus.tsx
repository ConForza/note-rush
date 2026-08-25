import { type ReactElement } from 'react'
import { type DifficultyStage } from './gameDifficulty'

export interface DifficultyStatusProps {
  stage: DifficultyStage
  correctInStage: number
  practice?: boolean
}

export const DifficultyStatus = ({
  stage,
  correctInStage,
  practice = false,
}: DifficultyStatusProps): ReactElement => (
  <div
    className="difficulty-status"
    aria-label={practice ? `Practice, ${stage.label}` : `Level ${stage.level}, ${stage.label}`}
  >
    <div className="difficulty-stage">
      <span className="difficulty-level">{practice ? 'Practice' : `Level ${stage.level}`}</span>
      <strong className="difficulty-label">{stage.label}</strong>
    </div>
    <span className="difficulty-progress">
      {practice ? (
        <span className="final-level-badge">Fixed stage</span>
      ) : null}
      {!practice && stage.correctHitsToAdvance === null ? (
        <span className="final-level-badge">Final level</span>
      ) : null}
      {!practice && stage.correctHitsToAdvance !== null ? (
        <>
          <span className="progress-dots" aria-hidden="true">
            {Array.from({ length: stage.correctHitsToAdvance }, (_, index) => (
              <span
                className={`progress-dot${index < correctInStage ? ' progress-dot--filled' : ''}`}
                key={index}
              />
            ))}
          </span>
          <span>{`${correctInStage} / ${stage.correctHitsToAdvance} correct`}</span>
        </>
      ) : null}
    </span>
  </div>
)
