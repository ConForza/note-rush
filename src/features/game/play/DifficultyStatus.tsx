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
      {stage.correctHitsToAdvance === null
        ? 'Final level'
        : `${correctInStage} / ${stage.correctHitsToAdvance} correct`}
    </span>
  </div>
)
