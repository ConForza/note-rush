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
})
