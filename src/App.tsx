import { useState } from 'react'
import { GameSetupScreen } from './features/game/setup'
import { GameScreen } from './features/game/play'
import { type GameSessionConfig } from './features/game/session'

function App() {
  const [sessionConfig, setSessionConfig] = useState<GameSessionConfig | null>(null)

  return (
    <main className="app-shell">
      {sessionConfig === null ? (
        <GameSetupScreen onStart={setSessionConfig} />
      ) : (
        <GameScreen
          onExit={() => setSessionConfig(null)}
          sessionConfig={sessionConfig}
        />
      )}
    </main>
  )
}

export default App
