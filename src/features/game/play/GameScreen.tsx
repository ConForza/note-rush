import { useEffect, useRef, useState, type ReactElement } from 'react'
import {
  NATURAL_NOTE_NAMES,
  type NoteName,
  type NotePrompt,
} from '../domain'
import { MusicStaff } from '../notation'
import { createGamePrompt, isCorrectAnswer } from './gameRound'

const ANSWER_FEEDBACK_MS = 400

type AnswerFeedback = {
  selected: NoteName
  correct: boolean
} | null

type AnswerButtonState = 'correct' | 'incorrect' | 'correct-answer' | null

export interface GameScreenProps {
  createPrompt?: () => NotePrompt
}

const getAnswerButtonState = (
  note: NoteName,
  prompt: NotePrompt,
  feedback: AnswerFeedback,
): AnswerButtonState => {
  if (!feedback) {
    return null
  }

  if (feedback.correct && note === feedback.selected) {
    return 'correct'
  }

  if (!feedback.correct && note === feedback.selected) {
    return 'incorrect'
  }

  if (!feedback.correct && note === prompt.pitch.note) {
    return 'correct-answer'
  }

  return null
}

const getAnswerButtonLabel = (
  note: NoteName,
  state: AnswerButtonState,
): string => {
  if (state === 'correct') {
    return `${note}, correct`
  }

  if (state === 'incorrect') {
    return `${note}, incorrect`
  }

  if (state === 'correct-answer') {
    return `${note}, correct answer`
  }

  return note
}

export const GameScreen = ({
  createPrompt = createGamePrompt,
}: GameScreenProps): ReactElement => {
  const [prompt, setPrompt] = useState<NotePrompt>(() => createPrompt())
  const [feedback, setFeedback] = useState<AnswerFeedback>(null)
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    },
    [],
  )

  const handleAnswer = (answer: NoteName): void => {
    if (feedback !== null || transitionTimeoutRef.current !== null) {
      return
    }

    const correct = isCorrectAnswer(prompt, answer)
    setFeedback({ selected: answer, correct })

    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null
      setPrompt(createPrompt())
      setFeedback(null)
    }, ANSWER_FEEDBACK_MS)
  }

  const feedbackMessage = feedback
    ? feedback.correct
      ? 'Correct'
      : `Incorrect — ${prompt.pitch.note}`
    : ''

  return (
    <section className="game-card" aria-labelledby="game-title">
      <header className="game-header">
        <p className="eyebrow">Note identification</p>
        <h1 id="game-title">Note Rush</h1>
        <p className="subtitle">Music note-reading game</p>
      </header>

      <div className="game-prompt">
        <MusicStaff
          prompt={prompt}
          ariaLabel="Note to identify on treble clef"
        />
      </div>

      <p className="prompt-instruction">Choose the note</p>

      <div className="answer-grid" aria-label="Note name answers">
        {NATURAL_NOTE_NAMES.map((note) => {
          const state = getAnswerButtonState(note, prompt, feedback)

          return (
            <button
              key={note}
              type="button"
              className={
                state ? `answer-button answer-button--${state}` : 'answer-button'
              }
              disabled={feedback !== null}
              aria-label={getAnswerButtonLabel(note, state)}
              onClick={() => handleAnswer(note)}
            >
              <span>{note}</span>
              {state && (
                <span className="answer-marker" aria-hidden="true">
                  {state === 'incorrect' ? '×' : '✓'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p
        className={`game-feedback${feedback ? ` game-feedback--${feedback.correct ? 'correct' : 'incorrect'}` : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedbackMessage}
      </p>
    </section>
  )
}
