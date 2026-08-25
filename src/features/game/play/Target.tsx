import { type ReactElement } from 'react'
import { type GameTarget } from './gameRound'

export type TargetVisualState =
  | 'idle'
  | 'correct'
  | 'incorrect'
  | 'correct-answer'

export interface TargetProps {
  target: GameTarget
  state: TargetVisualState
  disabled: boolean
  onHit: (target: GameTarget) => void
}

const getTargetAccessibleName = (
  target: GameTarget,
  state: TargetVisualState,
): string => {
  if (state === 'correct') {
    return `Hit ${target.note}, correct`
  }

  if (state === 'incorrect') {
    return `Hit ${target.note}, incorrect`
  }

  if (state === 'correct-answer') {
    return `${target.note}, correct answer`
  }

  return `Hit ${target.note}`
}

export const Target = ({
  target,
  state,
  disabled,
  onHit,
}: TargetProps): ReactElement => {
  const className = [
    'target-button',
    state !== 'idle' ? `target-button--${state}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-label={getTargetAccessibleName(target, state)}
        onClick={() => onHit(target)}
      >
        <span className="target-ear target-ear--left" aria-hidden="true" />
        <span className="target-ear target-ear--right" aria-hidden="true" />
        <span className="target-face" aria-hidden="true">
          <span className="target-eye target-eye--left" />
          <span className="target-eye target-eye--right" />
        </span>
        <span className="target-letter" aria-hidden="true">
          {target.note}
        </span>
        {state !== 'idle' && (
          <span className="target-marker" aria-hidden="true">
            {state === 'incorrect' ? '×' : '✓'}
          </span>
        )}
      </button>
      <span className="target-hole" aria-hidden="true" />
    </>
  )
}
