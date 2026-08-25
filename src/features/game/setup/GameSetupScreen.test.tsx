import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GameSetupScreen } from './GameSetupScreen'

describe('GameSetupScreen', () => {
  it('defaults to Arcade Run with a 30-second timer', () => {
    render(<GameSetupScreen onStart={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /Arcade Run/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '30 sec' })).toBeChecked()
    expect(screen.queryByText('Practice level')).not.toBeInTheDocument()
  })

  it('offers every practice stage and starts the selected configuration', () => {
    const onStart = vi.fn()
    render(<GameSetupScreen onStart={onStart} />)

    fireEvent.click(screen.getByRole('radio', { name: /Practice/ }))

    expect(screen.getByRole('radio', { name: /Off/ })).toBeChecked()
    expect(screen.getAllByRole('radio', { name: /Basics|Extended|Challenge|Mixed Clefs/ })).toHaveLength(6)
    fireEvent.click(screen.getByRole('radio', { name: /Bass Basics/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }))

    expect(onStart).toHaveBeenCalledWith({
      mode: 'practice',
      stageId: 'bass-basics',
      timerSeconds: null,
    })
  })
})
