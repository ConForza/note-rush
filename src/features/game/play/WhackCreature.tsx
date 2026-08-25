import { type ReactElement } from 'react'
import { type GameTarget } from './gameRound'

export interface WhackCreatureProps {
  note: GameTarget['note']
}

export const WhackCreature = ({ note }: WhackCreatureProps): ReactElement => (
  <span className="target-art" aria-hidden="true">
    <svg
      className="target-svg"
      viewBox="0 0 128 116"
      focusable="false"
      aria-hidden="true"
    >
      <path
        className="target-svg-ear target-svg-ear--left"
        d="M27 35C17 33 12 25 17 18c8-2 16 3 20 13l-1 7-9-3Z"
      />
      <path
        className="target-svg-ear target-svg-ear--right"
        d="M101 35c10-2 15-10 10-17-8-2-16 3-20 13l1 7 9-3Z"
      />
      <path
        className="target-svg-crest"
        d="M56 24c-2-8 2-14 9-17 1 7 5 10 11 12-4 7-10 10-18 9l-2-4Z"
      />
      <path
        className="target-svg-body"
        d="M27 50c0-19 15-31 37-31s37 12 37 31v43c0 10-8 16-18 16H45c-10 0-18-6-18-16V50Z"
      />
      <path
        className="target-svg-belly"
        d="M37 80c3-14 13-22 27-22s24 8 27 22v17c0 6-5 10-11 10H48c-6 0-11-4-11-10V80Z"
      />
      <ellipse className="target-svg-eye" cx="48" cy="54" rx="8" ry="10" />
      <ellipse className="target-svg-eye" cx="80" cy="54" rx="8" ry="10" />
      <circle className="target-svg-pupil" cx="50" cy="56" r="3.5" />
      <circle className="target-svg-pupil" cx="78" cy="56" r="3.5" />
      <path className="target-svg-smile" d="M57 66c4 5 10 5 14 0" />
      <circle className="target-svg-badge" cx="64" cy="83" r="19" />
      <text className="target-svg-letter" x="64" y="94" textAnchor="middle">
        {note}
      </text>
      <path
        className="target-svg-note"
        d="M91 72V57h4v13c4-2 8 0 8 4 0 4-4 7-8 7-3 0-5-2-5-5V72Z"
      />
    </svg>
  </span>
)
