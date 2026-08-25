import { useLayoutEffect, useRef, type ReactElement } from 'react'
import {
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from 'vexflow'
import {
  formatPitch,
  type NotePrompt,
} from '../domain'
import { toVexFlowKey } from './vexflowAdapter'

const LOGICAL_WIDTH = 360
const LOGICAL_HEIGHT = 180
const STAVE_X = 85
const STAVE_Y = 48
const STAVE_WIDTH = 190
const NOTE_AFTER_CLEF_SHIFT = 8

export interface MusicStaffProps {
  prompt: NotePrompt
  ariaLabel?: string
  className?: string
}

export const MusicStaff = ({
  prompt,
  ariaLabel,
  className,
}: MusicStaffProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null)
  const accessibleLabel =
    ariaLabel ?? `${formatPitch(prompt.pitch)} on ${prompt.clef} clef`

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    container.replaceChildren()

    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(LOGICAL_WIDTH, LOGICAL_HEIGHT)

    const svg = container.querySelector('svg')

    if (!svg) {
      throw new Error('VexFlow did not create an SVG renderer output.')
    }

    svg.style.width = '100%'
    svg.style.height = '100%'

    const context = renderer.getContext()
    const stave = new Stave(STAVE_X, STAVE_Y, STAVE_WIDTH)
      .addClef(prompt.clef)
      .setContext(context)
    const note = new StaveNote({
      clef: prompt.clef,
      keys: [toVexFlowKey(prompt.pitch)],
      duration: 'w',
    })
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickable(note)

    new Formatter().joinVoices([voice]).formatToStave([voice], stave)
    note.setXShift(NOTE_AFTER_CLEF_SHIFT)
    stave.draw()
    voice.draw(context, stave)

    return () => {
      container.replaceChildren()
    }
  }, [prompt])

  return (
    <div
      ref={containerRef}
      className={className ? `music-staff ${className}` : 'music-staff'}
      role="img"
      aria-label={accessibleLabel}
    />
  )
}
