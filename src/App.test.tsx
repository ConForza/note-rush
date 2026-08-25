import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Whack-a-Note application', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('renders the game setup identity', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Whack-a-Note' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Choose how you want to play')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Arcade Run/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeInTheDocument()
  })

  it('restores setup preferences after a fresh app mount without auto-starting', () => {
    const firstRender = render(<App />)

    fireEvent.click(screen.getByRole('radio', { name: /Practice/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Bass Extended/ }))
    fireEvent.click(screen.getByRole('radio', { name: /60 sec/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Sound/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Haptics/ }))
    firstRender.unmount()

    render(<App />)

    expect(screen.getByRole('radio', { name: /Practice/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Bass Extended/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '60 sec' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Sound/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Haptics/ })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Practice' })).toBeInTheDocument()
  })

  it('moves focus between setup and gameplay headings at the session boundary', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))
    expect(screen.getByRole('heading', { name: 'Whack-a-Note' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Change Setup' }))
    expect(screen.getByRole('heading', { name: 'Whack-a-Note' })).toHaveFocus()
  })
})
