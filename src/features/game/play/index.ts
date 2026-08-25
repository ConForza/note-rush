export {
  GameScreen,
  type GamePhase,
  type GameOverReason,
  type GameScreenProps,
} from './GameScreen'
export { GameHud, type GameHudProps } from './GameHud'
export {
  GameOverScreen,
  type GameOverScreenProps,
} from './GameOverScreen'
export {
  DifficultyStatus,
  type DifficultyStatusProps,
} from './DifficultyStatus'
export {
  CORRECT_HITS_TO_ADVANCE,
  DIFFICULTY_STAGES,
  getDifficultyStage,
  type DifficultyStage,
  type DifficultyStageId,
  type StagePromptSpec,
} from './gameDifficulty'
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
  type GameRoundFactory,
  type GameTarget,
} from './gameRound'
export {
  applyHitResult,
  applyRoundResult,
  CORRECT_HIT_BASE_SCORE,
  createInitialGameStats,
  INITIAL_LIVES,
  STREAK_SCORE_BONUS,
  type GameResult,
  type GameStats,
} from './gameStats'
export {
  applyProgressResult,
  createInitialGameProgress,
  type GameProgress,
  type ProgressUpdate,
} from './gameProgress'
export {
  addTimeToDeadline,
  CORRECT_TIME_BONUS_MS,
  createGameDeadline,
  formatRemainingSeconds,
  getRemainingTime,
  HIT_FEEDBACK_MS,
  INITIAL_GAME_TIME_MS,
  TIMER_REFRESH_MS,
  type ClockSource,
} from './gameTimer'
export {
  createTargetEmergenceSchedule,
  type TargetEmergenceSchedule,
} from './targetEmergence'
export {
  Target,
  type TargetProps,
  type TargetVisualState,
} from './Target'
