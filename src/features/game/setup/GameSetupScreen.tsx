import { type ReactElement } from 'react'
import { type EffectPreferences } from '../effects'
import { type GamePreferences } from '../preferences'
import {
  DIFFICULTY_STAGES,
  getStageRangeLabel,
  SESSION_TIMER_OPTIONS,
  type GameSessionConfig,
  type SessionTimerSeconds,
} from '../session'
import { WhackNoteMark } from '../play/WhackNoteMark'

export interface GameSetupScreenProps {
  preferences: GamePreferences
  onPreferencesChange: (preferences: GamePreferences) => void
  onStart: (
    config: GameSessionConfig,
    feedbackPreferences: EffectPreferences,
  ) => void
}

const getTimerLabel = (timerSeconds: SessionTimerSeconds): string =>
  timerSeconds === null ? 'Off' : `${timerSeconds} sec`

export const GameSetupScreen = ({
  preferences,
  onPreferencesChange,
  onStart,
}: GameSetupScreenProps): ReactElement => {
  const mode = preferences.lastMode
  const timerSeconds: SessionTimerSeconds =
    mode === 'practice'
      ? preferences.practiceTimerSeconds
      : preferences.arcadeTimerSeconds
  const stageId = preferences.practiceStageId

  const handleModeChange = (nextMode: 'arcade' | 'practice'): void => {
    onPreferencesChange({ ...preferences, lastMode: nextMode })
  }

  const handleTimerChange = (nextTimer: SessionTimerSeconds): void => {
    onPreferencesChange({
      ...preferences,
      ...(mode === 'practice'
        ? { practiceTimerSeconds: nextTimer }
        : { arcadeTimerSeconds: nextTimer }),
    })
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
          onStart(selectedConfig, {
            soundEnabled: preferences.soundEnabled,
            hapticsEnabled: preferences.hapticsEnabled,
          })
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
                    onChange={() =>
                      onPreferencesChange({
                        ...preferences,
                        practiceStageId: stage.id,
                      })
                    }
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
                  onChange={() => handleTimerChange(option)}
                  type="radio"
                  value={String(option)}
                />
                <span>{getTimerLabel(option)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-fieldset feedback-fieldset">
          <legend>Game feedback</legend>
          <div className="feedback-options">
            <label className="feedback-toggle">
              <input
                checked={preferences.soundEnabled}
                onChange={(event) =>
                  onPreferencesChange({
                    ...preferences,
                    soundEnabled: event.currentTarget.checked,
                  })
                }
                type="checkbox"
              />
              <span>
                <strong>Sound</strong>
                <small>Short outcome cues</small>
              </span>
            </label>
            <label className="feedback-toggle">
              <input
                checked={preferences.hapticsEnabled}
                onChange={(event) =>
                  onPreferencesChange({
                    ...preferences,
                    hapticsEnabled: event.currentTarget.checked,
                  })
                }
                type="checkbox"
              />
              <span>
                <strong>Haptics</strong>
                <small>Subtle vibration</small>
              </span>
            </label>
          </div>
        </fieldset>

        <button className="setup-start-button" type="submit">
          {mode === 'practice' ? 'Start Practice' : 'Start Game'}
        </button>
      </form>
    </section>
  )
}
