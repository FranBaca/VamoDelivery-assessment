import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => localStorage.clear())

describe('main operator workflow', () => {
  it('guides a new reviewer from reports to a persistent resolved incident', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    expect(
      screen.getByRole('heading', { name: 'A breakdown. Six deliveries. One response.' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Create incident/ }))
    expect(screen.getByRole('heading', { name: 'Vehicle breakdown · Route ATX-204' })).toBeVisible()
    expect(screen.getByText('6 potential deliveries')).toBeVisible()
    expect(screen.getByRole('button', { name: /Resolve incident/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Link report/ }))
    expect(screen.getByText(/Affected deliveries are counted once/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /^Link report/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(7)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Acting teammate' }), 'lina')
    await user.type(
      screen.getByLabelText('Proposed recovery'),
      'Ask Alex to collect all six orders at E 7th & Pleasant Valley.',
    )
    await user.click(screen.getByRole('button', { name: 'Save proposal' }))
    expect(screen.getByText('Recovery not confirmed')).toBeVisible()
    await user.type(
      screen.getByLabelText('What was confirmed, and by whom?'),
      'Alex agreed by phone to collect all six orders. Transfer time confirmed with Daniel.',
    )
    await user.click(screen.getByRole('button', { name: /Confirm arrangement/ }))
    expect(screen.getByText('Recovery arranged')).toBeVisible()
    expect(screen.getByRole('button', { name: /Resolve incident/ })).toBeDisabled()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Acting teammate' }), 'maya')
    await user.type(
      screen.getByLabelText('Simulated customer message'),
      'A replacement driver has been arranged. We will confirm arrival timing once the transfer is complete.',
    )
    await user.click(screen.getByRole('button', { name: /Record simulated update/ }))
    expect(screen.getAllByText('Simulated update', { exact: true })).toHaveLength(6)
    expect(screen.getByText('0 awaiting update')).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Complete: Verify recovery outcome with the driver' }),
    )
    await user.type(
      screen.getByLabelText('Completion / verification note'),
      'Daniel and Alex confirmed the cargo transfer is complete.',
    )
    await user.click(screen.getByRole('button', { name: 'Save completion' }))
    expect(screen.getByRole('heading', { name: /Next actions/ })).toHaveFocus()
    await user.type(
      screen.getByLabelText('Incident outcome'),
      'Cargo transferred and customers updated. Alex is continuing the six deliveries; final arrival times remain unverified.',
    )
    await user.click(screen.getByRole('button', { name: /Resolve incident/ }))
    expect(screen.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Outcome recorded' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: /Resolve incident/ })).not.toBeInTheDocument()
    const timeline = screen.getByRole('heading', { name: 'Shared timeline' }).closest('section')!
    expect(
      within(timeline).getAllByText('Lina Torres · Operations', { exact: true })[0],
    ).toBeVisible()
    unmount()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
    expect(screen.getByText('2 linked reports')).toBeVisible()
  })

  it('requires a cancellation reason and keeps unfinished essential actions visible', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Create incident/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel: Confirm a recovery arrangement' }))
    expect(screen.getByLabelText('Cancellation reason')).toBeRequired()
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    expect(screen.getByText('3 essential actions remain')).toBeVisible()
    await user.type(
      screen.getByLabelText('Cancellation reason'),
      'Business cancelled the affected orders; transfer is no longer required.',
    )
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    expect(screen.getByText('2 essential actions remain')).toBeVisible()
    expect(screen.getByRole('button', { name: /Resolve incident/ })).toBeDisabled()
  })

  it('allows keyboard access, displays selected time zones, and resets with confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Display time zone' }), 'UTC')
    expect(screen.getByRole('combobox', { name: 'Display time zone' })).toHaveValue('UTC')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: /Create incident/ }))
    await user.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(screen.getByRole('heading', { name: 'Vehicle breakdown · Route ATX-204' })).toBeVisible()
    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(screen.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'A breakdown. Six deliveries. One response.' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Avery Johnson/ }))
    await user.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(screen.getByRole('button', { name: /Daniel Brooks/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    confirm.mockRestore()
  })
})
