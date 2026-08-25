export {
  GameScreen,
  type GamePhase,
  type GameScreenProps,
} from './GameScreen'
export { GameHud, type GameHudProps } from './GameHud'
export {
  GameOverScreen,
  type GameOverScreenProps,
} from './GameOverScreen'
export {
  ACTIVE_TARGET_COUNT,
  createGamePrompt,
  createGameRound,
  createGameTargets,
  GAME_BOARD_SLOTS,
  isCorrectAnswer,
  isCorrectTarget,
  sampleWithoutReplacement,
  type GameRound,
  type GameTarget,
} from './gameRound'
export {
  applyHitResult,
  CORRECT_HIT_BASE_SCORE,
  createInitialGameStats,
  INITIAL_LIVES,
  STREAK_SCORE_BONUS,
  type GameStats,
} from './gameStats'
export {
  Target,
  type TargetProps,
  type TargetVisualState,
} from './Target'
