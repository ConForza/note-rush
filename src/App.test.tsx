import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Whack-a-Note application', () => {
  it('renders the game setup identity', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Whack-a-Note' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Choose how you want to play')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Arcade Run/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeInTheDocument()
  })
})
