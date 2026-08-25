import type { GameFeedbackEvent } from './gameEffects'

export interface AudioParamLike {
  setValueAtTime(value: number, startTime: number): void
  linearRampToValueAtTime(value: number, endTime: number): void
  exponentialRampToValueAtTime(value: number, endTime: number): void
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike): void
  disconnect(): void
}

export interface OscillatorNodeLike extends AudioNodeLike {
  type: string
  frequency: AudioParamLike
  start(when?: number): void
  stop(when?: number): void
}

export interface GainNodeLike extends AudioNodeLike {
  gain: AudioParamLike
}

export interface AudioContextLike {
  readonly currentTime: number
  readonly destination: AudioNodeLike
  readonly state?: string
  createGain(): GainNodeLike
  createOscillator(): OscillatorNodeLike
  resume(): Promise<void>
  close?(): Promise<void>
}

export type AudioContextFactory = () => AudioContextLike | null

interface ToneCue {
  readonly frequency: number
  readonly durationMs: number
  readonly delayMs: number
  readonly peakGain: number
  readonly oscillatorType: string
}

const MASTER_GAIN = 0.7
const ATTACK_MS = 7
const RELEASE_EPSILON = 0.0001

const CUES: Record<GameFeedbackEvent, readonly ToneCue[]> = {
  correct: [
    { frequency: 660, durationMs: 72, delayMs: 0, peakGain: 0.12, oscillatorType: 'sine' },
    { frequency: 880, durationMs: 92, delayMs: 65, peakGain: 0.1, oscillatorType: 'sine' },
  ],
  incorrect: [
    { frequency: 240, durationMs: 165, delayMs: 0, peakGain: 0.1, oscillatorType: 'triangle' },
  ],
  miss: [
    { frequency: 260, durationMs: 85, delayMs: 0, peakGain: 0.09, oscillatorType: 'sine' },
    { frequency: 175, durationMs: 115, delayMs: 70, peakGain: 0.08, oscillatorType: 'sine' },
  ],
  'level-up': [
    { frequency: 523, durationMs: 65, delayMs: 0, peakGain: 0.09, oscillatorType: 'sine' },
    { frequency: 659, durationMs: 65, delayMs: 55, peakGain: 0.09, oscillatorType: 'sine' },
    { frequency: 784, durationMs: 95, delayMs: 110, peakGain: 0.1, oscillatorType: 'sine' },
  ],
  'game-over': [
    { frequency: 185, durationMs: 190, delayMs: 0, peakGain: 0.1, oscillatorType: 'triangle' },
  ],
  'practice-complete': [
    { frequency: 440, durationMs: 70, delayMs: 0, peakGain: 0.08, oscillatorType: 'sine' },
    { frequency: 660, durationMs: 95, delayMs: 65, peakGain: 0.09, oscillatorType: 'sine' },
  ],
}

const getBrowserAudioContext = (): AudioContextLike | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const browserWindow = window as Window & {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const AudioContextConstructor =
    browserWindow.AudioContext ?? browserWindow.webkitAudioContext

  return AudioContextConstructor
    ? new AudioContextConstructor() as unknown as AudioContextLike
    : null
}

const playTone = (
  context: AudioContextLike,
  masterGain: GainNodeLike,
  cue: ToneCue,
): void => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const startTime = context.currentTime + cue.delayMs / 1_000
  const attackTime = startTime + ATTACK_MS / 1_000
  const stopTime = startTime + cue.durationMs / 1_000

  oscillator.type = cue.oscillatorType
  oscillator.frequency.setValueAtTime(cue.frequency, startTime)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.linearRampToValueAtTime(cue.peakGain, attackTime)
  gain.gain.exponentialRampToValueAtTime(RELEASE_EPSILON, stopTime)
  oscillator.connect(gain)
  gain.connect(masterGain)
  oscillator.start(startTime)
  oscillator.stop(stopTime + 0.01)
}

export interface AudioEngine {
  unlock(): void
  play(event: GameFeedbackEvent): void
  dispose(): void
}

export const createAudioEngine = (
  createContext: AudioContextFactory = getBrowserAudioContext,
): AudioEngine => {
  let context: AudioContextLike | null = null
  let masterGain: GainNodeLike | null = null

  const ensureContext = (): AudioContextLike | null => {
    if (context !== null) {
      return context
    }

    try {
      context = createContext()
      if (context === null) {
        return null
      }

      masterGain = context.createGain()
      masterGain.gain.setValueAtTime(MASTER_GAIN, context.currentTime)
      masterGain.connect(context.destination)
      return context
    } catch {
      context = null
      masterGain = null
      return null
    }
  }

  const resumeIfNeeded = (activeContext: AudioContextLike): void => {
    if (activeContext.state !== 'suspended') {
      return
    }

    try {
      void activeContext.resume().catch(() => undefined)
    } catch {
      // Audio is an optional enhancement.
    }
  }

  return {
    unlock: (): void => {
      const activeContext = ensureContext()
      if (activeContext !== null) {
        resumeIfNeeded(activeContext)
      }
    },
    play: (event): void => {
      const activeContext = ensureContext()
      if (activeContext === null || masterGain === null) {
        return
      }

      resumeIfNeeded(activeContext)

      try {
        CUES[event].forEach((cue) => playTone(activeContext, masterGain!, cue))
      } catch {
        // A partial Web Audio implementation must never affect gameplay.
      }
    },
    dispose: (): void => {
      const oldContext = context

      try {
        masterGain?.disconnect()
      } catch {
        // Disposal should remain idempotent across browser implementations.
      }

      context = null
      masterGain = null

      if (oldContext?.close) {
        try {
          void oldContext.close()?.catch(() => undefined)
        } catch {
          // The context may already be closed.
        }
      }
    },
  }
}
