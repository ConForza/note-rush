import {
  DEFAULT_ARCADE_CONFIG,
  DEFAULT_PRACTICE_CONFIG,
  DIFFICULTY_STAGES,
  type DifficultyStageId,
  type GameMode,
  type SessionTimerSeconds,
} from '../session'

export const GAME_PREFERENCES_STORAGE_KEY = 'whack-a-note.preferences.v1'

export interface GamePreferences {
  readonly version: 1
  readonly lastMode: GameMode
  readonly arcadeTimerSeconds: SessionTimerSeconds
  readonly practiceTimerSeconds: SessionTimerSeconds
  readonly practiceStageId: DifficultyStageId
  readonly soundEnabled: boolean
  readonly hapticsEnabled: boolean
}

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  version: 1,
  lastMode: DEFAULT_ARCADE_CONFIG.mode,
  arcadeTimerSeconds: DEFAULT_ARCADE_CONFIG.timerSeconds,
  practiceTimerSeconds: DEFAULT_PRACTICE_CONFIG.timerSeconds,
  practiceStageId: DEFAULT_PRACTICE_CONFIG.stageId,
  soundEnabled: true,
  hapticsEnabled: true,
}

export interface PreferenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const getBrowserStorage = (): PreferenceStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

const isMode = (value: unknown): value is GameMode =>
  value === 'arcade' || value === 'practice'

const isTimer = (value: unknown): value is SessionTimerSeconds =>
  value === null || value === 30 || value === 60 || value === 120

const isStageId = (value: unknown): value is DifficultyStageId =>
  typeof value === 'string' &&
  DIFFICULTY_STAGES.some((stage) => stage.id === value)

export const isGamePreferences = (value: unknown): value is GamePreferences => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.version === 1 &&
    isMode(candidate.lastMode) &&
    isTimer(candidate.arcadeTimerSeconds) &&
    isTimer(candidate.practiceTimerSeconds) &&
    isStageId(candidate.practiceStageId) &&
    typeof candidate.soundEnabled === 'boolean' &&
    typeof candidate.hapticsEnabled === 'boolean'
  )
}

export const loadGamePreferences = (
  storage: PreferenceStorage | null = getBrowserStorage(),
): GamePreferences => {
  if (storage === null) {
    return DEFAULT_GAME_PREFERENCES
  }

  try {
    const raw = storage.getItem(GAME_PREFERENCES_STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_GAME_PREFERENCES
    }

    const parsed: unknown = JSON.parse(raw)
    return isGamePreferences(parsed) ? parsed : DEFAULT_GAME_PREFERENCES
  } catch {
    return DEFAULT_GAME_PREFERENCES
  }
}

export const saveGamePreferences = (
  preferences: GamePreferences,
  storage: PreferenceStorage | null = getBrowserStorage(),
): void => {
  if (storage === null || !isGamePreferences(preferences)) {
    return
  }

  try {
    storage.setItem(
      GAME_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    )
  } catch {
    // Persistence is optional and must never block the game.
  }
}
