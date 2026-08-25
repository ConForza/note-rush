import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MusicStaff } from './MusicStaff'
import type { NotePrompt } from '../domain'

const prompt = (
  note: NotePrompt['pitch']['note'],
  octave: number,
  clef: NotePrompt['clef'],
): NotePrompt => ({
  pitch: { note, octave },
  clef,
})

const countRenderedSvgs = (container: HTMLElement): number =>
  container.querySelectorAll('svg').length

const getRenderedNoteX = (container: HTMLElement): number => {
  const noteHead = container.querySelector('.vf-notehead text')
  const noteX = Number(noteHead?.getAttribute('x'))

  if (!Number.isFinite(noteX)) {
    throw new Error('Expected the rendered note head to expose an SVG x position')
  }

  return noteX
}

const getRenderedStaveSpan = (container: HTMLElement): { start: number; end: number } => {
  const linePath = [...container.querySelectorAll('.vf-stave path')]
    .map((path) => path.getAttribute('d'))
    .find((path) => path?.includes('L'))
  const lineCoordinates = linePath?.match(/^M\s*([\d.-]+)\s*[\d.-]+L\s*([\d.-]+)/)

  if (!lineCoordinates) {
    throw new Error('Expected the rendered stave to expose horizontal line coordinates')
  }

  return {
    start: Number(lineCoordinates[1]),
    end: Number(lineCoordinates[2]),
  }
}

const getRenderedStaveVerticalCenter = (container: HTMLElement): number => {
  const lineYs = [...container.querySelectorAll('.vf-stave path')]
    .map((path) => path.getAttribute('d'))
    .map((path) => path?.match(/^M\s*[\d.-]+\s*([\d.-]+)L\s*[\d.-]+\s*([\d.-]+)/))
    .flatMap((coordinates) => (coordinates ? [Number(coordinates[1])] : []))

  if (lineYs.length === 0) {
    throw new Error('Expected the rendered stave to expose horizontal line coordinates')
  }

  return (lineYs[0] + lineYs.at(-1)!) / 2
}

const getRenderedNoteY = (container: HTMLElement): number => {
  const noteHead = container.querySelector('.vf-notehead text')
  const noteY = Number(noteHead?.getAttribute('y'))

  if (!Number.isFinite(noteY)) {
    throw new Error('Expected the rendered note head to expose an SVG y position')
  }

  return noteY
}

const getRenderedLedgerLineYs = (container: HTMLElement): number[] =>
  [...container.querySelectorAll('.vf-stavenote path')]
    .map((path) => path.getAttribute('d')?.match(/^M\s*[\d.-]+\s*([\d.-]+)/))
    .flatMap((coordinates) => (coordinates ? [Number(coordinates[1])] : []))

describe('MusicStaff', () => {
  it('renders a treble prompt as SVG', () => {
    const { container } = render(
      <MusicStaff prompt={prompt('C', 4, 'treble')} />,
    )

    expect(countRenderedSvgs(container)).toBe(1)
  })

  it('renders a bass prompt as SVG', () => {
    const { container } = render(
      <MusicStaff prompt={prompt('C', 4, 'bass')} />,
    )

    expect(countRenderedSvgs(container)).toBe(1)
  })

  it('hides the generated notation SVG behind its accessible staff label', () => {
    const { container } = render(
      <MusicStaff prompt={prompt('C', 4, 'treble')} />,
    )

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false')
  })

  it('exposes an accessible prompt label for treble', () => {
    render(<MusicStaff prompt={prompt('C', 4, 'treble')} />)

    expect(
      screen.getByRole('img', { name: 'C4 on treble clef' }),
    ).toBeInTheDocument()
  })

  it('exposes an accessible prompt label for bass', () => {
    render(<MusicStaff prompt={prompt('C', 4, 'bass')} />)

    expect(
      screen.getByRole('img', { name: 'C4 on bass clef' }),
    ).toBeInTheDocument()
  })

  it('uses an explicit accessible label override when supplied', () => {
    render(
      <MusicStaff
        prompt={prompt('C', 4, 'treble')}
        ariaLabel="Note to identify on treble clef"
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Note to identify on treble clef' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'C4 on treble clef' }),
    ).not.toBeInTheDocument()
  })

  it('replaces the previous SVG when the pitch changes', () => {
    const { container, rerender } = render(
      <MusicStaff prompt={prompt('C', 4, 'treble')} />,
    )

    rerender(<MusicStaff prompt={prompt('D', 4, 'treble')} />)

    expect(countRenderedSvgs(container)).toBe(1)
    expect(
      screen.getByRole('img', { name: 'D4 on treble clef' }),
    ).toBeInTheDocument()
  })

  it('replaces the previous SVG when the clef changes', () => {
    const { container, rerender } = render(
      <MusicStaff prompt={prompt('C', 4, 'treble')} />,
    )

    rerender(<MusicStaff prompt={prompt('C', 4, 'bass')} />)

    expect(countRenderedSvgs(container)).toBe(1)
    expect(
      screen.getByRole('img', { name: 'C4 on bass clef' }),
    ).toBeInTheDocument()
  })

  it('does not duplicate SVG output in Strict Mode', () => {
    const { container } = render(
      <StrictMode>
        <MusicStaff prompt={prompt('C', 4, 'treble')} />
      </StrictMode>,
    )

    expect(countRenderedSvgs(container)).toBe(1)
  })

  it.each([
    ['treble', prompt('C', 4, 'treble')],
    ['bass', prompt('C', 4, 'bass')],
    ['high treble', prompt('A', 5, 'treble')],
    ['low bass', prompt('E', 2, 'bass')],
  ])('renders the representative %s prompt', (_, representativePrompt) => {
    expect(() => render(<MusicStaff prompt={representativePrompt} />)).not.toThrow()
  })

  it.each([
    ['treble E4', prompt('E', 4, 'treble')],
    ['treble A5', prompt('A', 5, 'treble')],
    ['bass E2', prompt('E', 2, 'bass')],
    ['bass C4', prompt('C', 4, 'bass')],
  ])('keeps %s after the clef instead of centering the stave', (_, representativePrompt) => {
    const { container } = render(<MusicStaff prompt={representativePrompt} />)
    const noteX = getRenderedNoteX(container)
    const stave = getRenderedStaveSpan(container)

    expect(noteX).toBeGreaterThan(stave.start + 20)
    expect(noteX).toBeLessThan(stave.end - 30)
  })

  it('centers a compact stave inside the logical canvas', () => {
    const { container } = render(
      <MusicStaff prompt={prompt('C', 4, 'treble')} />,
    )
    const stave = getRenderedStaveSpan(container)
    const staveWidth = stave.end - stave.start
    const staveCenter = (stave.start + stave.end) / 2

    expect(staveWidth).toBeLessThan(220)
    expect(stave.start).toBeGreaterThan(50)
    expect(stave.end).toBeLessThan(270)
    expect(staveCenter).toBeGreaterThan(145)
    expect(staveCenter).toBeLessThan(175)
    expect(getRenderedStaveVerticalCenter(container)).toBeCloseTo(60.5, 1)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 320 96')
  })

  it.each([
    ['treble C4', prompt('C', 4, 'treble')],
    ['treble A5', prompt('A', 5, 'treble')],
    ['bass E2', prompt('E', 2, 'bass')],
    ['bass C4', prompt('C', 4, 'bass')],
  ])('keeps %s notation inside the short logical canvas', (_, representativePrompt) => {
    const { container } = render(<MusicStaff prompt={representativePrompt} />)
    const ledgerLineYs = getRenderedLedgerLineYs(container)
    const clefY = Number(
      container.querySelector('.vf-clef text')?.getAttribute('y'),
    )

    expect(getRenderedNoteY(container)).toBeGreaterThan(0)
    expect(getRenderedNoteY(container)).toBeLessThan(96)
    expect(clefY).toBeGreaterThan(0)
    expect(clefY).toBeLessThan(96)
    expect(ledgerLineYs.length).toBeGreaterThan(0)
    expect(ledgerLineYs.every((y) => y > 0 && y < 96)).toBe(true)
  })
})
