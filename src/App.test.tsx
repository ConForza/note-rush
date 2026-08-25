import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Whack-a-Note application', () => {
  it('renders the playable game identity', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Whack-a-Note' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Find the matching note')).toBeInTheDocument()
  })
})
