import { describe, expect, it, vi } from 'vitest'
import {
  createGameEffects,
  type GameEffectsDependencies,
} from './gameEffects'
import { createHapticsEngine } from './haptics'
import { createAudioEngine, type AudioContextLike } from './audioEngine'

const preferences = { soundEnabled: true, hapticsEnabled: true }

const createFakeAudio = (): NonNullable<GameEffectsDependencies['audio']> => ({
  unlock: vi.fn(),
  play: vi.fn(),
  dispose: vi.fn(),
})

const createFakeHaptics = (): NonNullable<GameEffectsDependencies['haptics']> => ({
  emit: vi.fn(),
  dispose: vi.fn(),
})

const createFakeParam = () => ({
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
})

const createFakeContext = (): AudioContextLike => {
  const destination = { connect: vi.fn(), disconnect: vi.fn() }
  const createGain = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: createFakeParam(),
  }))
  const createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: 'sine',
    frequency: createFakeParam(),
    start: vi.fn(),
    stop: vi.fn(),
  }))

  return {
    currentTime: 0,
    destination,
    state: 'running',
    createGain,
    createOscillator,
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  }
}

describe('game effects', () => {
  it('maps one semantic event to both enabled feedback channels', () => {
    const audio = createFakeAudio()
    const haptics = createFakeHaptics()
    const effects = createGameEffects(preferences, { audio, haptics })

    effects.unlockAudio()
    effects.emit('correct')

    expect(audio.unlock).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledWith('correct')
    expect(haptics.emit).toHaveBeenCalledWith('correct')
  })

  it('maps campaign completion to one dedicated success event', () => {
    const audio = createFakeAudio()
    const haptics = createFakeHaptics()
    const effects = createGameEffects(preferences, { audio, haptics })

    effects.emit('campaign-complete')

    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledWith('campaign-complete')
    expect(haptics.emit).toHaveBeenCalledTimes(1)
    expect(haptics.emit).toHaveBeenCalledWith('campaign-complete')
  })

  it('does not create or call sound feedback when Sound is Off', () => {
    const audio = createFakeAudio()
    const haptics = createFakeHaptics()
    const effects = createGameEffects(
      { soundEnabled: false, hapticsEnabled: true },
      { audio, haptics },
    )

    effects.unlockAudio()
    effects.emit('incorrect')

    expect(audio.unlock).not.toHaveBeenCalled()
    expect(audio.play).not.toHaveBeenCalled()
    expect(haptics.emit).toHaveBeenCalledWith('incorrect')
  })

  it('does not create an AudioContext for a sound-off session', () => {
    const createContext = vi.fn(() => createFakeContext())
    const effects = createGameEffects(
      { soundEnabled: false, hapticsEnabled: false },
      { createAudioContext: createContext },
    )

    effects.unlockAudio()
    effects.emit('correct')

    expect(createContext).not.toHaveBeenCalled()
  })

  it('does not call vibration when Haptics is Off', () => {
    const audio = createFakeAudio()
    const haptics = createFakeHaptics()
    const effects = createGameEffects(
      { soundEnabled: true, hapticsEnabled: false },
      { audio, haptics },
    )

    effects.emit('miss')

    expect(audio.play).toHaveBeenCalledWith('miss')
    expect(haptics.emit).not.toHaveBeenCalled()
  })

  it('reuses one AudioContext and safely disposes repeatedly', () => {
    const context = createFakeContext()
    const createContext = vi.fn(() => context)
    const audio = createAudioEngine(createContext)

    expect(createContext).not.toHaveBeenCalled()
    audio.play('correct')
    audio.play('incorrect')
    audio.dispose()
    audio.dispose()

    expect(createContext).toHaveBeenCalledTimes(1)
    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('no-ops when AudioContext is unavailable', () => {
    const audio = createAudioEngine(() => null)

    expect(() => {
      audio.unlock()
      audio.play('game-over')
      audio.dispose()
    }).not.toThrow()
  })

  it('uses conservative haptic patterns and ignores unsupported vibration', () => {
    const vibrate = vi.fn(() => true)
    const haptics = createHapticsEngine(vibrate)

    haptics.emit('miss')

    expect(vibrate).toHaveBeenCalledWith([20, 25, 20])
    expect(() => createHapticsEngine(null).emit('correct')).not.toThrow()
  })
})
