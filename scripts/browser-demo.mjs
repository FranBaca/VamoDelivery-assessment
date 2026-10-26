import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import process from 'node:process'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { installRecordingPointer, pointTo, clearPointerTarget } from './demo-pointer.mjs'

const baseURL = process.env.DEMO_URL || 'http://127.0.0.1:5173'
const directory = process.env.DEMO_OUTPUT_DIR
  ? resolve(process.env.DEMO_OUTPUT_DIR)
  : fileURLToPath(new URL('../demo-recordings/', import.meta.url))
const speed = Math.max(0.1, Number(process.env.DEMO_SPEED) || 1)
let server
let browser
let context
try {
  let available = false
  try {
    const response = await fetch(baseURL, { signal: AbortSignal.timeout(2000) })
    available = response.ok
  } catch {
    // The default local server can be started below.
  }
  if (!available) {
    if (process.env.DEMO_URL) {
      throw new Error(
        `Cannot reach DEMO_URL (${baseURL}). Start that server before running the demo.`,
      )
    }
    process.stdout.write('Starting the local app at http://127.0.0.1:5173...\n')
    server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: true } })
    await server.listen()
  }
  await mkdir(directory, { recursive: true })
  browser = await chromium.launch({
    headless: process.env.DEMO_HEADLESS === '1',
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    slowMo: 160 * speed,
  })
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: directory, size: { width: 1440, height: 1000 } },
  })
  await installRecordingPointer(context)
} catch (error) {
  await browser?.close()
  await server?.close()
  process.stderr.write(
    `Demo could not start: ${error.message}\nUse the Node version in .nvmrc (nvm use). Install the browser with npx playwright install chromium. On a machine without a desktop, use DEMO_HEADLESS=1 npm run demo:browser.\n`,
  )
  process.exit(1)
}
const page = await context.newPage()
const video = page.video()
const steps = []
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const started = Date.now()

async function pause(milliseconds = 1800) {
  await delay(milliseconds * speed)
}
async function chapter(title, description) {
  steps.push({ title, description, seconds: Math.round((Date.now() - started) / 1000) })
  process.stdout.write(`▶ ${title}\n`)
  await page.evaluate(
    ({ title, description }) => {
      let caption = document.getElementById('automated-demo-caption')
      if (!caption) {
        caption = document.createElement('div')
        caption.id = 'automated-demo-caption'
        caption.style.cssText =
          'position:fixed;bottom:18px;left:248px;max-width:650px;padding:14px 18px;border:1px solid #8ba67a;border-radius:9px;background:#183f34f5;color:#fff;z-index:10000;font:14px/1.55 Arial,sans-serif;box-shadow:0 5px 24px #0003;pointer-events:none'
        document.body.append(caption)
      }
      caption.replaceChildren()
      const label = document.createElement('div')
      label.textContent = `AUTOMATED DEMO · ${title}`
      label.style.cssText =
        'font-size:12px;font-weight:bold;letter-spacing:.3px;color:#d5e8bc;margin-bottom:4px'
      const body = document.createElement('div')
      body.textContent = description
      caption.append(label, body)
    },
    { title, description },
  )
  await pause()
}
async function look(locator) {
  await locator.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  )
  await pause(450)
}
async function click(name) {
  const control = page.getByRole('button', { name, exact: typeof name === 'string' })
  await clickTarget(control, 'CLICK')
}
async function clickTarget(control, label) {
  await look(control)
  await pointTo(page, control, label)
  await pause(650)
  await control.click()
  await pause(750)
  await clearPointerTarget(page)
}
async function enter(label, value) {
  const input = page.getByLabel(label, { exact: true })
  await look(input)
  await pointTo(page, input, `TYPE · ${label}`)
  await pause(500)
  await input.click()
  await input.fill('')
  if (value.length < 220) await input.pressSequentially(value, { delay: 10 * speed })
  else await input.fill(value)
  await pause(300)
  await clearPointerTarget(page)
}
async function select(label, value) {
  const control = page.getByLabel(label, { exact: true })
  await look(control)
  await pointTo(page, control, `SELECT · ${label}`)
  await pause(600)
  await control.selectOption(value)
  await pause(1000)
  await clearPointerTarget(page)
}
async function followUp(value) {
  const input = page.getByLabel('Follow-up time (UTC)', { exact: true })
  await look(input)
  await pointTo(page, input, 'ENTER · UTC follow-up')
  await pause(500)
  await input.fill(value)
  await pause(750)
  await clearPointerTarget(page)
}
async function reset(accept = true) {
  page.once('dialog', (dialog) => (accept ? dialog.accept() : dialog.dismiss()))
  await click('Reset demo')
}

let succeeded = false
try {
  await page.clock.install({ time: new Date() })
  await page.goto(baseURL)
  await expect(page.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
  await chapter(
    '1. Starting point',
    'Two fictional reports. Daniel’s breakdown is selected. All communications are simulated; this browser session is isolated from your saved work.',
  )
  await click('About this prototype')
  await pause(2500)
  await click('Close prototype help')
  await chapter(
    '2. Empty states and keyboard access',
    'There are no incidents yet. Keyboard users can skip navigation and use labelled native controls.',
  )
  await click(/^Incidents/)
  await expect(page.getByRole('heading', { name: 'No incidents yet' })).toBeVisible()
  await click('Review driver report')
  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  await skipLink.focus()
  await pointTo(page, skipLink, 'KEYBOARD · Enter')
  await pause(1200)
  await page.keyboard.press('Enter')
  await clearPointerTarget(page)
  await click(/Avery Johnson/)
  await pause(1500)
  await click(/Daniel Brooks/)
  await chapter(
    '3. Create an incident',
    'The report pre-fills the title and owner. Creating one incident exposes the six unfinished route stops; delivered and unrelated stops are excluded.',
  )
  await click('Create incident')
  await expect(page.getByText('6 potential deliveries')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resolve incident' })).toBeDisabled()
  await look(page.getByRole('heading', { name: /Affected deliveries/ }))
  await pause(2500)
  await chapter(
    '4. Ownership and time zones',
    'Change the incident owner without re-entering context. Austin, Bogotá, Manila, and UTC display the same stored timestamps.',
  )
  await select('Incident owner', 'sam')
  await select('Display time zone', 'Asia/Manila')
  await pause(1200)
  await select('Display time zone', 'America/Bogota')
  await select('Display time zone', 'UTC')
  await select('Display time zone', 'America/Chicago')
  await select('Incident owner', 'lina')
  await chapter(
    '5. Link related reports once',
    'Avery’s call belongs to the same breakdown. Linking it adds context while the impact remains six deliveries.',
  )
  await click('Link report')
  await expect(page.getByText('2 linked reports')).toBeVisible()
  await expect(page.getByText('6 potential deliveries')).toBeVisible()
  await click(/^Reports/)
  await click(/Avery Johnson/)
  await expect(page.getByRole('heading', { name: 'Context connected' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create incident' })).toHaveCount(0)
  await pause(2000)
  await click('Open incident')
  await chapter(
    '6. Proposed recovery is not confirmed',
    'Operations records a plan. Saving or editing a proposal does not complete the recovery action.',
  )
  await select('Acting teammate', 'lina')
  await enter(
    'Proposed recovery',
    'Ask Alex to collect the six orders from Daniel at E 7th & Pleasant Valley. Timing is not agreed yet.',
  )
  await click('Save proposal')
  await expect(page.getByText('Recovery not confirmed')).toBeVisible()
  await click('Edit proposal')
  await enter(
    'Proposed recovery',
    'Ask Alex to collect all six orders at E 7th & Pleasant Valley, with Daniel present to verify the transfer. Awaiting agreement.',
  )
  await click('Save proposal')
  await chapter(
    '7. Record an explicit confirmation',
    'The fictional agreement names who confirmed it. Recovery is now arranged; delivery completion is still unverified.',
  )
  await enter(
    'What was confirmed, and by whom?',
    'Alex and Daniel confirmed by phone: Alex can take all six orders and meet at the breakdown location. Both agreed to the transfer.',
  )
  await click('Confirm arrangement')
  await expect(page.getByText('Recovery arranged')).toBeVisible()
  await chapter(
    '8. Communicate with one affected customer',
    'Support can update a specific customer. Communication status changes independently of operational recovery.',
  )
  await select('Acting teammate', 'maya')
  await select('Recipients', 'ATX-1842')
  await enter(
    'Simulated customer message',
    'A replacement driver has agreed to take over your order. The transfer is being coordinated; arrival timing is not yet verified.',
  )
  await click('Record simulated update')
  await expect(page.getByText('5 awaiting update')).toBeVisible()
  await look(page.getByRole('heading', { name: /Affected deliveries/ }))
  await pause(2300)
  await chapter(
    '9. Continue across shifts',
    'Sam in Manila reads the same local incident history and adds a handoff note. This demonstrates shared context, not real multi-user synchronization.',
  )
  await select('Acting teammate', 'sam')
  await select('Display time zone', 'Asia/Manila')
  await enter(
    'Add a team update',
    'Taking over Support follow-up in Manila. Recovery is confirmed. Avery has a simulated update; five customers are still awaiting one.',
  )
  await click('Add update')
  await look(page.getByRole('heading', { name: 'Shared timeline' }))
  await pause(2500)
  await chapter(
    '10. Update the remaining customers',
    'The pending-recipient selection avoids repeating updates. Every delivery remains visible in the table and the timeline records the simulated message.',
  )
  await select('Recipients', 'pending')
  await enter(
    'Simulated customer message',
    'Your driver reported a vehicle issue. A replacement driver has agreed to take over. We will share further timing information after the transfer is verified.',
  )
  await click('Record simulated update')
  await expect(page.getByText('0 awaiting update')).toBeVisible()
  await select('Recipients', 'all')
  await pause(1000)
  await select('Recipients', 'pending')
  await expect(page.getByRole('button', { name: 'Record simulated update' })).toBeDisabled()
  await chapter(
    '11. Add owned work and validate its follow-up',
    'Create an essential action for a teammate. A past follow-up is rejected; a future UTC follow-up is accepted.',
  )
  const addAction = page.locator('.add-action > summary')
  await look(addAction)
  await clickTarget(addAction, 'CLICK · Add next action')
  await enter('Action description', 'Check delivery timing with Juniper Market')
  await select('Action owner', 'sam')
  const simulationNow = await page.evaluate(() => Date.now())
  await followUp(new Date(simulationNow - 60_000).toISOString().slice(0, 16))
  await click('Add action')
  await expect(page.getByRole('alert')).toContainText('future')
  await look(page.getByRole('alert'))
  await pause(2000)
  await followUp(new Date(simulationNow + 120_000).toISOString().slice(0, 16))
  await click('Add action')
  await clickTarget(addAction, 'CLICK · Collapse action form')
  await chapter(
    '12. Overdue follow-ups · simulated +3 minutes',
    'Only the test browser clock advances. The new follow-up becomes overdue and the incident list surfaces that pending work.',
  )
  await page.clock.fastForward(180_000)
  await expect(page.getByText(/Overdue ·/)).toBeVisible()
  await look(page.getByText(/Overdue ·/))
  await pause(2000)
  await click('All incidents')
  await expect(page.getByText('1 overdue follow-ups', { exact: false }).first()).toBeVisible()
  await pause(2000)
  await click(/Vehicle breakdown · Route ATX-204/)
  await chapter(
    '13. Cancel explicitly, with a reason',
    'Cancelling an action requires a reason. The action and the reason remain in the shared history.',
  )
  await click('Cancel: Check delivery timing with Juniper Market')
  await click('Confirm cancellation')
  await expect(page.getByLabel('Cancellation reason')).toBeVisible()
  await enter(
    'Cancellation reason',
    'The timing check is covered by the existing recovery follow-up. A separate business call is no longer needed in this fictional scenario.',
  )
  await click('Confirm cancellation')
  await expect(page.getByRole('button', { name: 'Resolve incident' })).toBeDisabled()
  await chapter(
    '14. Verify the outcome before resolving',
    'A confirmed arrangement and customer updates are not enough. The remaining driver-verification action requires a completion note.',
  )
  await select('Acting teammate', 'lina')
  await click('Complete: Verify recovery outcome with the driver')
  await enter(
    'Completion / verification note',
    'Daniel and Alex confirmed the cargo transfer is complete and all six orders are accounted for. Alex is continuing the route; final arrival times remain unverified.',
  )
  await click('Save completion')
  await chapter(
    '15. Resolution requires an outcome',
    'Whitespace is rejected. A valid outcome closes the incident and leaves its record read-only, with uncertainty stated explicitly.',
  )
  await enter('Incident outcome', '   ')
  await click('Resolve incident')
  await expect(page.getByRole('alert')).toContainText('outcome')
  await look(page.getByRole('alert'))
  await pause(1600)
  await enter(
    'Incident outcome',
    'Cargo transferred to Alex and all affected customers have simulated updates. Alex is continuing all six stops. Final arrival times remain unverified; no deliveries were automatically marked complete.',
  )
  await click('Resolve incident')
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  await look(page.getByRole('heading', { name: 'Outcome recorded' }))
  await pause(3000)
  await chapter(
    '16. Refresh and retain the record',
    'The outcome, linked reports, cancelled action, and timeline survive a reload through local persistence.',
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  await chapter(
    '17. Inspect retained history',
    'Teammate attribution and time zones make the record useful to the next shift. Resolved incidents remain accessible from the list.',
  )
  await look(page.getByRole('heading', { name: 'Shared timeline' }))
  await pause(2500)
  await click('All incidents')
  await pause(1600)
  await click(/Vehicle breakdown · Route ATX-204/)
  await chapter(
    '18. Safe, repeatable reset',
    'Dismissing reset preserves the current record. Confirming reset restores the two original reports and a fresh scenario.',
  )
  await reset(false)
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  await reset(true)
  await expect(page.getByRole('heading', { name: 'Incoming reports' })).toBeVisible()
  await chapter(
    '19. Alternative path: customer call first',
    'A customer report initially exposes one delivery. Linking the driver report later expands impact to six and reopens customer updates for the five newly exposed deliveries.',
  )
  await click(/Avery Johnson/)
  await click('Create incident')
  await expect(page.getByText('1 potential deliveries')).toBeVisible()
  await enter(
    'Simulated customer message',
    'We are investigating the delivery status and will provide an update when information is confirmed.',
  )
  await click('Record simulated update')
  await expect(page.getByText('0 awaiting update')).toBeVisible()
  await click(/^Reports/)
  await click(/Daniel Brooks/)
  await click('Link report to incident')
  await expect(page.getByText('6 potential deliveries')).toBeVisible()
  await expect(page.getByText('5 awaiting update')).toBeVisible()
  await look(page.getByRole('heading', { name: /Affected deliveries/ }))
  await pause(2500)
  await chapter(
    '20. Alternative outcome: explicit cancellation',
    'If the fictional orders are cancelled, essential actions can each be cancelled with a recorded reason. Resolution still requires an outcome.',
  )
  for (const title of [
    'Confirm a recovery arrangement',
    'Update all affected customers',
    'Verify recovery outcome with the driver',
  ]) {
    await click(`Cancel: ${title}`)
    await enter(
      'Cancellation reason',
      'The businesses cancelled the affected orders in this alternative fictional scenario; this action is no longer required.',
    )
    await click('Confirm cancellation')
  }
  await enter(
    'Incident outcome',
    'The businesses cancelled the six affected orders. All essential actions were explicitly cancelled with reasons. No recovery arrangement or successful delivery is claimed.',
  )
  await click('Resolve incident')
  await expect(page.getByRole('heading', { name: 'Outcome recorded' })).toBeVisible()
  await pause(2500)
  await chapter(
    '21. Failure state: unreadable saved data',
    'Fault injection in this isolated session only: corrupt local storage. A reload opens a fresh scenario with a visible warning instead of crashing.',
  )
  await page.evaluate(() => localStorage.setItem('vamo-incident-desk:v1', '{broken demo data'))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await chapter(
    'Saved-data recovery',
    'The warning explains that the next successful change replaces the invalid saved copy. Your original browser session is untouched.',
  )
  await reset(true)
  await chapter(
    '22. Failure state: browser storage unavailable',
    'Fault injection: block storage writes. Changes still work in memory, and the prototype warns that refresh will lose them.',
  )
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Simulated storage quota failure')
    }
  })
  await click('Create incident')
  await expect(page.getByRole('alert')).toContainText('memory only')
  await look(page.getByRole('alert'))
  await pause(2500)
  await page.reload()
  await reset(true)
  await chapter(
    '23. Narrow layout and keyboard scrolling',
    'The same incident works at phone width. Horizontally scrollable regions are labelled and keyboard-focusable.',
  )
  await click('Create incident')
  await page.evaluate(() => document.getElementById('automated-demo-caption')?.remove())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await pause(2500)
  await look(page.getByRole('heading', { name: /Affected deliveries/ }))
  const table = page.getByRole('region', { name: 'Affected deliveries table' })
  await table.focus()
  await pointTo(page, table, 'KEYBOARD · Right arrow')
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await pause(2200)
  await clearPointerTarget(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await reset(true)
  await chapter(
    'Finished · ready for you to try',
    'The scenario is reset. This recording demonstrated the current prototype; no real communications, deployments, or multi-user changes occurred.',
  )
  await pause(2800)
  expect(errors).toEqual([])
  succeeded = true
} catch (error) {
  process.stderr.write(`${error.stack || error}\n`)
  await page.screenshot({ path: `${directory}/failure.png`, fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await context.close()
  const path = await video.path()
  await rename(path, `${directory}/walkthrough.webm`)
  const report = { succeeded, steps, browserErrors: errors, recordedAt: new Date().toISOString() }
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2))
  const escape = (value) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
  const links = steps
    .map(
      (step) =>
        `<li><button data-time="${step.seconds}">${escape(step.title)}</button><p>${escape(step.description)}</p></li>`,
    )
    .join('')
  await writeFile(
    `${directory}/watch.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vamo · Click-tracked walkthrough</title><style>body{font:15px/1.6 system-ui,sans-serif;background:#f6f7f4;color:#243b34;max-width:1300px;margin:32px auto;padding:0 24px}h1{margin-bottom:5px}video{width:100%;background:#183f34;border-radius:8px;margin-top:20px}ol{columns:2;column-gap:50px;padding-left:22px}li{break-inside:avoid;margin:12px 0 20px}button{font:inherit;color:#225745;font-weight:650;background:none;border:0;text-align:left;padding:0;cursor:pointer;text-decoration:underline}p{margin:5px 0;color:#5e6b62}a{color:#225745}@media(max-width:750px){ol{columns:1}}</style><h1>Incident Desk · Click-tracked walkthrough</h1><p>${succeeded ? 'All demonstrated checks passed.' : 'The simulation stopped at a failed check; see report.json.'} Visible cursor, click rings, and target highlights. Fictional data and simulated communications. No audio.</p><p><a href="${baseURL}">Open the local prototype</a> · <a href="walkthrough.webm" download>Download recording</a> · <a href="report.json">Detailed test record</a></p><video controls src="walkthrough.webm"></video><h2>Jump to a feature</h2><ol>${links}</ol><script>document.querySelectorAll('button[data-time]').forEach(button=>button.addEventListener('click',()=>{const video=document.querySelector('video');video.currentTime=Number(button.dataset.time);video.play();video.scrollIntoView({behavior:'smooth',block:'center'})}));</script></html>`,
  )
  await browser.close()
  await server?.close()
  process.stdout.write(
    `${succeeded ? 'PASS' : 'INCOMPLETE'} · recording: ${directory}/watch.html\n`,
  )
}
