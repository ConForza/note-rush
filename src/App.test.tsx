import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Note Rush application', () => {
  it('renders the playable game identity', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Note Rush' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Music note-reading game')).toBeInTheDocument()
  })
})
