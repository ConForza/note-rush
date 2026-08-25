import type { GameFeedbackEvent } from './gameEffects'

export type VibrateFunction = (pattern: number | number[]) => boolean

const PATTERNS: Record<GameFeedbackEvent, number | number[]> = {
  correct: 20,
  incorrect: 35,
  miss: [20, 25, 20],
  'level-up': [18, 25, 18],
  'game-over': 45,
  'practice-complete': [15, 20, 15],
  'campaign-complete': [18, 25, 18, 25, 35],
}

const getBrowserVibrate = (): VibrateFunction | null => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return null
  }

  return navigator.vibrate.bind(navigator)
}

export interface HapticsEngine {
  emit(event: GameFeedbackEvent): void
  dispose(): void
}

export const createHapticsEngine = (
  vibrate: VibrateFunction | null = getBrowserVibrate(),
): HapticsEngine => ({
  emit: (event): void => {
    if (vibrate === null) {
      return
    }

    try {
      vibrate(PATTERNS[event])
    } catch {
      // Unsupported or blocked vibration is a silent no-op.
    }
  },
  dispose: (): void => undefined,
})
