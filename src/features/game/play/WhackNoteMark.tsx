import { type ReactElement } from 'react'

export const WhackNoteMark = (): ReactElement => (
  <svg
    className="brand-mark"
    viewBox="0 0 48 48"
    focusable="false"
    aria-hidden="true"
  >
    <path
      className="brand-mark-burst"
      d="m24 2 4 7 8-3-1 8 8 2-6 6 6 6-8 2 1 8-8-3-4 7-4-7-8 3 1-8-8-2 6-6-6-6 8-2-1-8 8 3 4-7Z"
    />
    <path
      className="brand-mark-note"
      d="M27 12v18c-2-2-6-2-8 1-2 3 0 6 4 6 4 0 7-3 7-7V18l8-2v-5l-11 1Z"
    />
  </svg>
)
