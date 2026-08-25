import { type ReactElement } from 'react'
import { type DifficultyStage } from './gameDifficulty'

export interface DifficultyStatusProps {
  stage: DifficultyStage
  correctInStage: number
}

export const DifficultyStatus = ({
  stage,
  correctInStage,
}: DifficultyStatusProps): ReactElement => (
  <div
    className="difficulty-status"
    aria-label={`Level ${stage.level}, ${stage.label}`}
  >
    <div className="difficulty-stage">
      <span className="difficulty-level">Level {stage.level}</span>
      <strong className="difficulty-label">{stage.label}</strong>
    </div>
    <span className="difficulty-progress">
      {stage.correctHitsToAdvance === null ? (
        <span className="final-level-badge">Final level</span>
      ) : (
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
      )}
    </span>
  </div>
)
