import { useState, type ReactElement } from 'react'
import {
  DEFAULT_ARCADE_CONFIG,
  DEFAULT_PRACTICE_CONFIG,
  DIFFICULTY_STAGES,
  getStageRangeLabel,
  SESSION_TIMER_OPTIONS,
  type GameSessionConfig,
  type DifficultyStageId,
  type SessionTimerSeconds,
} from '../session'
import { WhackNoteMark } from '../play/WhackNoteMark'

export interface GameSetupScreenProps {
  onStart: (config: GameSessionConfig) => void
}

const getTimerLabel = (timerSeconds: SessionTimerSeconds): string =>
  timerSeconds === null ? 'Off' : `${timerSeconds} sec`

export const GameSetupScreen = ({
  onStart,
}: GameSetupScreenProps): ReactElement => {
  const [mode, setMode] = useState<'arcade' | 'practice'>('arcade')
  const [timerSeconds, setTimerSeconds] = useState<SessionTimerSeconds>(
    DEFAULT_ARCADE_CONFIG.timerSeconds,
  )
  const [stageId, setStageId] = useState<DifficultyStageId>(
    DEFAULT_PRACTICE_CONFIG.stageId,
  )

  const handleModeChange = (nextMode: 'arcade' | 'practice'): void => {
    setMode(nextMode)
    setTimerSeconds(
      nextMode === 'practice'
        ? DEFAULT_PRACTICE_CONFIG.timerSeconds
        : DEFAULT_ARCADE_CONFIG.timerSeconds,
    )
    if (nextMode === 'practice') {
      setStageId(DEFAULT_PRACTICE_CONFIG.stageId)
    }
  }

  const selectedConfig: GameSessionConfig =
    mode === 'arcade'
      ? { mode, timerSeconds }
      : { mode, stageId, timerSeconds }

  return (
    <section className="game-card setup-card" aria-labelledby="setup-title">
      <header className="game-header">
        <div className="brand-lockup">
          <WhackNoteMark />
          <p className="eyebrow">Music note arcade</p>
        </div>
        <h1 id="setup-title">Whack-a-Note</h1>
        <p className="subtitle">Choose how you want to play</p>
      </header>

      <form
        className="setup-form"
        onSubmit={(event) => {
          event.preventDefault()
          onStart(selectedConfig)
        }}
      >
        <fieldset className="setup-fieldset">
          <legend>Play mode</legend>
          <div className="mode-options">
            <label className={`mode-card${mode === 'arcade' ? ' mode-card--selected' : ''}`}>
              <input
                checked={mode === 'arcade'}
                name="mode"
                onChange={() => handleModeChange('arcade')}
                type="radio"
                value="arcade"
              />
              <span className="mode-card-copy">
                <strong>Arcade Run</strong>
                <span>Race through all six levels with lives and quick-fire questions.</span>
              </span>
            </label>
            <label className={`mode-card${mode === 'practice' ? ' mode-card--selected' : ''}`}>
              <input
                checked={mode === 'practice'}
                name="mode"
                onChange={() => handleModeChange('practice')}
                type="radio"
                value="practice"
              />
              <span className="mode-card-copy">
                <strong>Practice</strong>
                <span>Choose exactly what you want to work on at your own pace.</span>
              </span>
            </label>
          </div>
        </fieldset>

        {mode === 'practice' ? (
          <fieldset className="setup-fieldset">
            <legend>Practice level</legend>
            <div className="stage-options">
              {DIFFICULTY_STAGES.map((stage) => (
                <label
                  className={`stage-card${stageId === stage.id ? ' stage-card--selected' : ''}`}
                  key={stage.id}
                >
                  <input
                    checked={stageId === stage.id}
                    name="stage"
                    onChange={() => setStageId(stage.id)}
                    type="radio"
                    value={stage.id}
                  />
                  <span className="stage-card-copy">
                    <strong>{stage.label}</strong>
                    <span>{getStageRangeLabel(stage)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="setup-fieldset">
          <legend>Session timer</legend>
          <div className="timer-options">
            {SESSION_TIMER_OPTIONS.map((option) => (
              <label className={`timer-option${timerSeconds === option ? ' timer-option--selected' : ''}`} key={String(option)}>
                <input
                  checked={timerSeconds === option}
                  name="timer"
                  onChange={() => setTimerSeconds(option)}
                  type="radio"
                  value={String(option)}
                />
                <span>{getTimerLabel(option)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button className="setup-start-button" type="submit">
          {mode === 'practice' ? 'Start Practice' : 'Start Game'}
        </button>
      </form>
    </section>
  )
}
