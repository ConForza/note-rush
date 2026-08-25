import { createAudioEngine, type AudioEngine, type AudioContextFactory } from './audioEngine'
import { createHapticsEngine, type HapticsEngine, type VibrateFunction } from './haptics'

export type GameFeedbackEvent =
  | 'correct'
  | 'incorrect'
  | 'miss'
  | 'level-up'
  | 'game-over'
  | 'practice-complete'

export interface EffectPreferences {
  readonly soundEnabled: boolean
  readonly hapticsEnabled: boolean
}

export interface GameEffects {
  unlockAudio(): void
  emit(event: GameFeedbackEvent): void
  configure(preferences: EffectPreferences): void
  dispose(): void
}

export interface GameEffectsDependencies {
  readonly audio?: AudioEngine
  readonly haptics?: HapticsEngine
  readonly createAudioContext?: AudioContextFactory
  readonly vibrate?: VibrateFunction | null
}

export const NOOP_GAME_EFFECTS: GameEffects = {
  unlockAudio: (): void => undefined,
  emit: (): void => undefined,
  configure: (): void => undefined,
  dispose: (): void => undefined,
}

export const createGameEffects = (
  initialPreferences: EffectPreferences,
  dependencies: GameEffectsDependencies = {},
): GameEffects => {
  const audio =
    dependencies.audio ?? createAudioEngine(dependencies.createAudioContext)
  const haptics =
    dependencies.haptics ?? createHapticsEngine(dependencies.vibrate)
  let preferences = initialPreferences
  let disposed = false

  return {
    unlockAudio: (): void => {
      if (disposed || !preferences.soundEnabled) {
        return
      }

      try {
        audio.unlock()
      } catch {
        // Audio failures must not block a trusted start gesture.
      }
    },
    emit: (event): void => {
      if (disposed) {
        return
      }

      if (preferences.soundEnabled) {
        try {
          audio.play(event)
        } catch {
          // Audio is optional.
        }
      }

      if (preferences.hapticsEnabled) {
        try {
          haptics.emit(event)
        } catch {
          // Haptics are optional.
        }
      }
    },
    configure: (nextPreferences): void => {
      if (preferences.soundEnabled && !nextPreferences.soundEnabled) {
        try {
          audio.dispose()
        } catch {
          // Silencing optional feedback is best effort.
        }
      }
      preferences = nextPreferences
    },
    dispose: (): void => {
      if (disposed) {
        return
      }

      disposed = true
      try {
        audio.dispose()
      } catch {
        // Disposal is best effort.
      }
      try {
        haptics.dispose()
      } catch {
        // Disposal is best effort.
      }
    },
  }
}
