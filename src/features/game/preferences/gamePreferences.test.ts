import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_GAME_PREFERENCES,
  GAME_PREFERENCES_STORAGE_KEY,
  loadGamePreferences,
  saveGamePreferences,
  type GamePreferences,
  type PreferenceStorage,
} from './gamePreferences'

const createStorage = (initialValue: string | null = null): PreferenceStorage & {
  value: string | null
} => {
  let value = initialValue

  return {
    get value() {
      return value
    },
    set value(nextValue: string | null) {
      value = nextValue
    },
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue
    }),
  }
}

const storedPreferences: GamePreferences = {
  version: 1,
  lastMode: 'practice',
  arcadeTimerSeconds: 60,
  practiceTimerSeconds: 120,
  practiceStageId: 'bass-extended',
  soundEnabled: false,
  hapticsEnabled: true,
}

describe('game preferences', () => {
  it('uses safe defaults when storage is empty', () => {
    expect(loadGamePreferences(createStorage())).toEqual(DEFAULT_GAME_PREFERENCES)
  })

  it('round-trips the versioned preference object under one key', () => {
    const storage = createStorage()

    saveGamePreferences(storedPreferences, storage)

    expect(storage.setItem).toHaveBeenCalledWith(
      GAME_PREFERENCES_STORAGE_KEY,
      JSON.stringify(storedPreferences),
    )
    expect(loadGamePreferences(storage)).toEqual(storedPreferences)
  })

  it.each([
    '{broken-json',
    JSON.stringify({ ...storedPreferences, version: 2 }),
    JSON.stringify({ ...storedPreferences, lastMode: 'unknown' }),
    JSON.stringify({ ...storedPreferences, arcadeTimerSeconds: 45 }),
    JSON.stringify({ ...storedPreferences, practiceStageId: 'unknown' }),
    JSON.stringify({ ...storedPreferences, soundEnabled: 'yes' }),
  ])('falls back to defaults for unsafe stored data: %s', (value) => {
    expect(loadGamePreferences(createStorage(value))).toEqual(
      DEFAULT_GAME_PREFERENCES,
    )
  })

  it('survives storage read and write failures', () => {
    const failingStorage: PreferenceStorage = {
      getItem: () => {
        throw new Error('read blocked')
      },
      setItem: () => {
        throw new Error('write blocked')
      },
    }

    expect(loadGamePreferences(failingStorage)).toEqual(DEFAULT_GAME_PREFERENCES)
    expect(() => saveGamePreferences(storedPreferences, failingStorage)).not.toThrow()
  })
})
