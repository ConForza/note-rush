import { type CSSProperties, type ReactElement } from 'react'
import { type GameTarget } from './gameRound'
import { WhackCreature } from './WhackCreature'
import './Target.css'

export const TARGET_EMERGENCE_DURATION_MS = 280
export const TARGET_EMERGENCE_STAGGER_MS = 60

export type TargetVisualState =
  | 'idle'
  | 'correct'
  | 'incorrect'
  | 'correct-answer'
  | 'retreating'

export interface TargetProps {
  target: GameTarget
  state: TargetVisualState
  disabled: boolean
  emergenceDelayMs?: number
  onHit: (target: GameTarget) => void
}

export const TargetHole = (): ReactElement => (
  <span className="target-hole" aria-hidden="true">
    <span className="target-hole-rim" />
  </span>
)

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
  emergenceDelayMs = 0,
  onHit,
}: TargetProps): ReactElement => {
  const className = [
    'target-button',
    state !== 'idle' ? `target-button--${state}` : null,
  ]
    .filter(Boolean)
    .join(' ')
  const hasMarker =
    state === 'correct' ||
    state === 'incorrect' ||
    state === 'correct-answer'

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        style={
          {
            '--target-emergence-delay': `${emergenceDelayMs}ms`,
          } as CSSProperties
        }
        aria-label={getTargetAccessibleName(target, state)}
        onClick={() => onHit(target)}
      >
        <WhackCreature note={target.note} />
        {hasMarker && (
          <span className="target-marker" aria-hidden="true">
            {state === 'incorrect' ? '×' : '✓'}
          </span>
        )}
      </button>
      <TargetHole />
    </>
  )
}
