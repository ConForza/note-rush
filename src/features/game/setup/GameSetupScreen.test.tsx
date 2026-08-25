import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_GAME_PREFERENCES,
  type GamePreferences,
} from '../preferences'
import { GameSetupScreen } from './GameSetupScreen'

const renderSetup = (
  onStart: Parameters<typeof GameSetupScreen>[0]['onStart'] = vi.fn(),
  initialPreferences: GamePreferences = DEFAULT_GAME_PREFERENCES,
) => {
  const SetupHarness = (): ReactElement => {
    const [preferences, setPreferences] = useState(initialPreferences)

    return (
      <GameSetupScreen
        onPreferencesChange={setPreferences}
        onStart={onStart}
        preferences={preferences}
      />
    )
  }

  return render(<SetupHarness />)
}

describe('GameSetupScreen', () => {
  it('defaults to Arcade Run with a 30-second timer', () => {
    renderSetup()

    expect(screen.getByRole('radio', { name: /Arcade Run/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '30 sec' })).toBeChecked()
    expect(screen.queryByText('Practice level')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Sound/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Haptics/ })).toBeChecked()
  })

  it('offers every practice stage and starts the selected configuration', () => {
    const onStart = vi.fn()
    renderSetup(onStart)

    fireEvent.click(screen.getByRole('radio', { name: /Practice/ }))

    expect(screen.getByRole('radio', { name: /Off/ })).toBeChecked()
    expect(screen.getAllByRole('radio', { name: /Basics|Extended|Challenge|Mixed Clefs/ })).toHaveLength(6)
    fireEvent.click(screen.getByRole('radio', { name: /Bass Basics/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }))

    expect(onStart).toHaveBeenCalledWith(
      {
        mode: 'practice',
        stageId: 'bass-basics',
        timerSeconds: null,
      },
      { soundEnabled: true, hapticsEnabled: true },
    )
  })

  it('remembers separate Arcade and Practice timers while switching modes', () => {
    renderSetup()

    fireEvent.click(screen.getByRole('radio', { name: /60 sec/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Practice/ }))
    expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /120 sec/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Arcade Run/ }))

    expect(screen.getByRole('radio', { name: '60 sec' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /Practice/ }))
    expect(screen.getByRole('radio', { name: '120 sec' })).toBeChecked()
  })

  it('updates feedback preferences without changing the selected mode', () => {
    renderSetup()

    fireEvent.click(screen.getByRole('checkbox', { name: /Sound/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Haptics/ }))

    expect(screen.getByRole('radio', { name: /Arcade Run/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Sound/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Haptics/ })).not.toBeChecked()
  })
})
