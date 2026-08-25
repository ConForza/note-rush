import { useCallback, useEffect, useState } from 'react'
import {
  createGameEffects,
  type EffectPreferences,
  type GameEffects,
} from './features/game/effects'
import { GameSetupScreen } from './features/game/setup'
import { GameScreen } from './features/game/play'
import { type GameSessionConfig } from './features/game/session'
import {
  loadGamePreferences,
  saveGamePreferences,
  type GamePreferences,
} from './features/game/preferences'

interface ActiveSession {
  readonly config: GameSessionConfig
  readonly effects: GameEffects
}

function App() {
  const [preferences, setPreferences] = useState<GamePreferences>(() =>
    loadGamePreferences(),
  )
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)

  const handlePreferencesChange = useCallback(
    (nextPreferences: GamePreferences): void => {
      setPreferences(nextPreferences)
      saveGamePreferences(nextPreferences)
    },
    [],
  )

  const handleStart = useCallback(
    (config: GameSessionConfig, feedbackPreferences: EffectPreferences): void => {
      const effects = createGameEffects(feedbackPreferences)
      effects.unlockAudio()
      setActiveSession({ config, effects })
    },
    [],
  )

  useEffect(
    () => () => {
      activeSession?.effects.dispose()
    },
    [activeSession],
  )

  return (
    <main className="app-shell">
      {activeSession === null ? (
        <GameSetupScreen
          onPreferencesChange={handlePreferencesChange}
          onStart={handleStart}
          preferences={preferences}
        />
      ) : (
        <GameScreen
          effects={activeSession.effects}
          onExit={() => setActiveSession(null)}
          sessionConfig={activeSession.config}
        />
      )}
    </main>
  )
}

export default App
