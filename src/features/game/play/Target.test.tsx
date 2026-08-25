import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Target, type TargetVisualState } from './Target'
import { type GameTarget } from './gameRound'

const target: GameTarget = {
  id: 'slot-2',
  slot: 2,
  note: 'C',
  isCorrect: true,
}

const renderTarget = (state: TargetVisualState = 'idle'): void => {
  render(
    <Target
      target={target}
      state={state}
      disabled={state !== 'idle'}
      onHit={vi.fn()}
    />,
  )
}

describe('Target graphics', () => {
  it('renders a decorative vector creature with a readable idle target', () => {
    renderTarget()

    expect(screen.getByRole('button', { name: 'Hit C' })).toBeInTheDocument()
    expect(document.querySelector('.target-svg')).toBeInTheDocument()
    expect(document.querySelector('.target-svg-letter')).toHaveTextContent('C')
    expect(document.querySelector('.target-art')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(document.querySelector('.target-hole-rim')).toBeInTheDocument()
  })

  it.each([
    ['correct', 'Hit C, correct', '✓', 'target-button--correct'],
    ['incorrect', 'Hit C, incorrect', '×', 'target-button--incorrect'],
    ['correct-answer', 'C, correct answer', '✓', 'target-button--correct-answer'],
  ] as const)('renders the %s marker and accessible state', (state, name, marker, className) => {
    renderTarget(state)

    expect(screen.getByRole('button', { name })).toHaveClass(className)
    expect(document.querySelector('.target-marker')).toHaveTextContent(marker)
  })

  it('renders a retreating decoy without a result marker', () => {
    renderTarget('retreating')

    expect(screen.getByRole('button', { name: 'Hit C' })).toHaveClass(
      'target-button--retreating',
    )
    expect(document.querySelector('.target-marker')).not.toBeInTheDocument()
  })
})
