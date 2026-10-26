import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([])
}

test('complete response, accessibility, and refresh persistence in a real browser', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.screenshot({ path: testInfo.outputPath('reports.png'), fullPage: true })
  await checkAccessibility(page)
  await page.getByRole('button', { name: /Create incident/ }).click()
  await expect(page.getByText('6 potential deliveries')).toBeVisible()
  await expect(page.getByRole('button', { name: /Resolve incident/ })).toBeDisabled()
  await page.getByRole('button', { name: /^Link report/ }).click()
  await expect(page.getByRole('row')).toHaveCount(7)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('incident.png'), fullPage: true })
  await checkAccessibility(page)
  await page.getByLabel('Acting teammate').selectOption('lina')
  await page
    .getByLabel('Proposed recovery', { exact: true })
    .fill('Ask Alex to collect all six orders at the reported breakdown location.')
  await page.getByRole('button', { name: 'Save proposal' }).click()
  await expect(page.getByText('Recovery not confirmed')).toBeVisible()
  await page
    .getByLabel('What was confirmed, and by whom?')
    .fill('Alex and Daniel agreed by phone to transfer all six orders at E 7th & Pleasant Valley.')
  await page.getByRole('button', { name: /Confirm arrangement/ }).click()
  await expect(page.getByText('Recovery arranged')).toBeVisible()
  await page.getByLabel('Acting teammate').selectOption('maya')
  await page
    .getByLabel('Simulated customer message')
    .fill(
      'A replacement driver has agreed to take over. Arrival times remain unverified; we will share a further update.',
    )
  await page.getByRole('button', { name: /Record simulated update/ }).click()
  await expect(page.getByText('Simulated update', { exact: true })).toHaveCount(6)
  await page
    .getByRole('button', { name: 'Complete: Verify recovery outcome with the driver' })
    .click()
  await page
    .getByLabel('Completion / verification note')
    .fill(
      'Daniel and Alex confirmed the transfer was completed and all six orders are accounted for.',
    )
  await page.getByRole('button', { name: 'Save completion' }).click()
  await page
    .getByLabel('Incident outcome')
    .fill(
      'Cargo transferred and affected customers updated. Alex is continuing the route. Final delivery times are unverified.',
    )
  await page.getByRole('button', { name: /Resolve incident/ }).click()
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  await checkAccessibility(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  await expect(page.getByText('2 linked reports')).toBeVisible()
  expect(errors).toEqual([])
})

test('narrow-screen workflow and cancellation leave no hidden essential work', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('mobile-reports.png'), fullPage: true })
  await checkAccessibility(page)
  await page.getByRole('button', { name: /Create incident/ }).click()
  await expect(page.getByText('3 essential actions remain')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('mobile-incident.png'), fullPage: true })
  await checkAccessibility(page)
  const deliveryTable = page.getByRole('region', { name: 'Affected deliveries table' })
  await deliveryTable.focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => deliveryTable.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0)
  for (const title of [
    'Confirm a recovery arrangement',
    'Update all affected customers',
    'Verify recovery outcome with the driver',
  ]) {
    await page.getByRole('button', { name: `Cancel: ${title}` }).click()
    await page
      .getByLabel('Cancellation reason')
      .fill('Business cancelled the affected orders; this action is no longer required.')
    await page.getByRole('button', { name: 'Confirm cancellation' }).click()
  }
  await page
    .getByLabel('Incident outcome')
    .fill(
      'The businesses cancelled the six orders. All essential actions were explicitly cancelled with reasons.',
    )
  await page.getByRole('button', { name: /Resolve incident/ }).click()
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
})
