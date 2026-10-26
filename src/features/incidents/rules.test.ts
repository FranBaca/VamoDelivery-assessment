import { beforeEach, describe, expect, it } from 'vitest'
import { createDemo } from '../../demo/fixtures'
import type { DemoState, IncidentCommand } from './models'
import { affectedDeliveries, applyCommand, isOverdue, outstandingEssential } from './rules'

const now = '2026-10-24T18:00:00.000Z'
let state: DemoState
let sequence: number
function command(input: IncidentCommand) {
  const result = applyCommand(state, input, { actorId: 'maya', now, id: String(++sequence) })
  if (result.ok) state = result.state
  return result
}
function create(reportId = 'RPT-1042') {
  command({ type: 'create', reportId, title: 'Vehicle breakdown', ownerId: 'lina' })
  return state.incidents[0].id
}
function cancelAll(incidentId: string) {
  for (const action of state.incidents[0].actions)
    command({
      type: 'close-action',
      incidentId,
      actionId: action.id,
      status: 'cancelled',
      note: 'Delivery cancelled by the business; recovery no longer required.',
    })
}
beforeEach(() => {
  state = createDemo(new Date(now))
  sequence = 0
})

describe('report linking and impact', () => {
  it('identifies only six unfinished deliveries on the reported driver’s route', () => {
    create()
    const affected = affectedDeliveries(state, state.incidents[0])
    expect(affected).toHaveLength(6)
    expect(affected.map((d) => d.id)).not.toContain('ATX-1841')
    expect(affected.map((d) => d.id)).not.toContain('ATX-1901')
  })
  it('links the customer report without double counting its delivery', () => {
    const incidentId = create()
    expect(command({ type: 'link', incidentId, reportId: 'RPT-1043' }).ok).toBe(true)
    expect(affectedDeliveries(state, state.incidents[0])).toHaveLength(6)
    expect(state.incidents[0].reportIds).toEqual(['RPT-1042', 'RPT-1043'])
  })
  it('does not include another route assigned to the same driver', () => {
    state.deliveries.push({ ...state.deliveries[0], id: 'ATX-OTHER', routeId: 'ATX-206' })
    create()
    expect(affectedDeliveries(state, state.incidents[0]).map((d) => d.id)).not.toContain(
      'ATX-OTHER',
    )
    expect(affectedDeliveries(state, state.incidents[0])).toHaveLength(6)
  })
  it('rejects duplicate linking without changing state or adding timeline entries', () => {
    const incidentId = create()
    command({ type: 'link', incidentId, reportId: 'RPT-1043' })
    const before = structuredClone(state)
    expect(command({ type: 'link', incidentId, reportId: 'RPT-1043' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('already linked'),
    })
    expect(state).toEqual(before)
  })
  it('prevents linking a report that already belongs to a different incident', () => {
    const first = create()
    command({ type: 'create', reportId: 'RPT-1043', title: 'Customer inquiry', ownerId: 'maya' })
    expect(command({ type: 'link', incidentId: first, reportId: 'RPT-1043' }).ok).toBe(false)
    expect(
      command({ type: 'create', reportId: 'RPT-1042', title: 'Duplicate', ownerId: 'lina' }).ok,
    ).toBe(false)
  })
  it('widens impact and reopens customer updates when a driver report is linked later', () => {
    const incidentId = create('RPT-1043')
    expect(affectedDeliveries(state, state.incidents[0])).toHaveLength(1)
    command({
      type: 'communicate',
      incidentId,
      deliveryIds: ['ATX-1842'],
      message: 'We’re investigating.',
    })
    expect(state.incidents[0].actions.find((a) => a.kind === 'communication')?.status).toBe(
      'completed',
    )
    command({ type: 'link', incidentId, reportId: 'RPT-1042' })
    expect(affectedDeliveries(state, state.incidents[0])).toHaveLength(6)
    expect(state.incidents[0].actions.find((a) => a.kind === 'communication')?.status).toBe('open')
    expect(state.incidents[0].communications).toHaveLength(1)
  })
  it('requires recovery and verification again after completed work gains new deliveries', () => {
    const incidentId = create('RPT-1043')
    command({ type: 'propose', incidentId, detail: 'Alex takes Avery’s order.' })
    command({ type: 'confirm', incidentId, confirmation: 'Alex agreed to Avery’s order only.' })
    command({
      type: 'communicate',
      incidentId,
      deliveryIds: ['ATX-1842'],
      message: 'Recovery arranged.',
    })
    const verification = state.incidents[0].actions.find((a) => a.kind === 'manual')!
    command({
      type: 'close-action',
      incidentId,
      actionId: verification.id,
      status: 'completed',
      note: 'Avery’s order transfer verified.',
    })
    expect(outstandingEssential(state.incidents[0])).toHaveLength(0)
    const history = structuredClone(state.incidents[0].timeline)
    command({ type: 'link', incidentId, reportId: 'RPT-1042' })
    expect(outstandingEssential(state.incidents[0])).toHaveLength(3)
    expect(state.incidents[0].actions.every((a) => a.closingNote === undefined)).toBe(true)
    expect(state.incidents[0].recovery).toEqual({
      status: 'proposed',
      detail: 'Alex takes Avery’s order.',
    })
    expect(state.incidents[0].timeline.slice(0, history.length)).toEqual(history)
    command({
      type: 'communicate',
      incidentId,
      deliveryIds: affectedDeliveries(state, state.incidents[0])
        .slice(1)
        .map((d) => d.id),
      message: 'We are investigating the additional deliveries.',
    })
    expect(command({ type: 'resolve', incidentId, outcome: 'Only Avery has recovery.' }).ok).toBe(
      false,
    )
    command({ type: 'propose', incidentId, detail: 'Alex takes all six orders.' })
    command({ type: 'confirm', incidentId, confirmation: 'Alex agreed to all six orders.' })
    expect(command({ type: 'resolve', incidentId, outcome: 'Recovery arranged.' }).ok).toBe(false)
    command({
      type: 'close-action',
      incidentId,
      actionId: verification.id,
      status: 'completed',
      note: 'All six transfers verified with the driver.',
    })
    expect(
      command({ type: 'resolve', incidentId, outcome: 'All six transfers verified.' }).ok,
    ).toBe(true)
  })
  it('reopens cancelled essential work for new deliveries and requires fresh reasons', () => {
    const incidentId = create('RPT-1043')
    cancelAll(incidentId)
    const history = structuredClone(state.incidents[0].timeline)
    command({ type: 'link', incidentId, reportId: 'RPT-1042' })
    expect(outstandingEssential(state.incidents[0])).toHaveLength(3)
    expect(state.incidents[0].timeline.slice(0, history.length)).toEqual(history)
    expect(command({ type: 'resolve', incidentId, outcome: 'Avery cancelled.' }).ok).toBe(false)
    const actionId = state.incidents[0].actions[0].id
    expect(
      command({
        type: 'close-action',
        incidentId,
        actionId,
        status: 'cancelled',
        note: ' ',
      }).ok,
    ).toBe(false)
    cancelAll(incidentId)
    expect(command({ type: 'resolve', incidentId, outcome: 'All six orders cancelled.' }).ok).toBe(
      true,
    )
  })
  it('preserves closed work and confirmed recovery when linking adds no deliveries', () => {
    const incidentId = create()
    command({ type: 'propose', incidentId, detail: 'Alex takes all six orders.' })
    command({ type: 'confirm', incidentId, confirmation: 'Alex agreed to all six orders.' })
    cancelAll(incidentId)
    const before = structuredClone(state.incidents[0])
    command({ type: 'link', incidentId, reportId: 'RPT-1043' })
    expect(state.incidents[0].actions).toEqual(before.actions)
    expect(state.incidents[0].recovery).toEqual(before.recovery)
    expect(state.incidents[0].timeline.slice(before.timeline.length)).toHaveLength(1)
  })
})

describe('proposed and confirmed recovery', () => {
  it('keeps a proposal unconfirmed with its essential action still open', () => {
    const incidentId = create()
    command({ type: 'propose', incidentId, detail: 'Ask Alex to take over the six orders.' })
    expect(state.incidents[0].recovery?.status).toBe('proposed')
    expect(state.incidents[0].actions.find((a) => a.kind === 'recovery')?.status).toBe('open')
    expect(state.incidents[0].timeline.at(-1)?.title).toContain('not confirmed')
  })
  it('requires a proposal and an explicit confirmation record', () => {
    const incidentId = create()
    expect(command({ type: 'confirm', incidentId, confirmation: 'Alex agreed.' }).ok).toBe(false)
    command({ type: 'propose', incidentId, detail: 'Ask Alex to collect the cargo.' })
    expect(command({ type: 'confirm', incidentId, confirmation: '  ' }).ok).toBe(false)
    expect(state.incidents[0].recovery?.status).toBe('proposed')
  })
  it('confirms the arrangement without claiming delivery or customer contact', () => {
    const incidentId = create()
    const deliveriesBefore = structuredClone(state.deliveries)
    command({ type: 'propose', incidentId, detail: 'Alex takes the six orders.' })
    command({
      type: 'confirm',
      incidentId,
      confirmation: 'Alex agreed by phone; transfer at 2 PM CDT.',
    })
    expect(state.incidents[0].recovery?.status).toBe('confirmed')
    expect(state.incidents[0].actions.find((a) => a.kind === 'recovery')?.status).toBe('completed')
    expect(state.incidents[0].communications).toHaveLength(0)
    expect(state.deliveries).toEqual(deliveriesBefore)
    expect(
      command({ type: 'propose', incidentId, detail: 'Silently replace confirmed plan' }).ok,
    ).toBe(false)
  })
  it('does not allow manual completion to bypass recovery confirmation', () => {
    const incidentId = create()
    const action = state.incidents[0].actions.find((a) => a.kind === 'recovery')!
    expect(
      command({
        type: 'close-action',
        incidentId,
        actionId: action.id,
        status: 'completed',
        note: 'Done',
      }).ok,
    ).toBe(false)
  })
})

describe('communication', () => {
  it('only completes customer communication once every affected delivery has an update', () => {
    const incidentId = create()
    command({
      type: 'communicate',
      incidentId,
      deliveryIds: ['ATX-1842', 'ATX-1842'],
      message: 'Investigating the reported breakdown.',
    })
    expect(state.incidents[0].communications).toHaveLength(1)
    expect(state.incidents[0].actions.find((a) => a.kind === 'communication')?.status).toBe('open')
    command({
      type: 'communicate',
      incidentId,
      deliveryIds: affectedDeliveries(state, state.incidents[0])
        .slice(1)
        .map((d) => d.id),
      message: 'Recovery coordination is underway.',
    })
    expect(state.incidents[0].actions.find((a) => a.kind === 'communication')?.status).toBe(
      'completed',
    )
    expect(state.incidents[0].recovery).toBeUndefined()
    expect(
      state.incidents[0].timeline.some((t) => t.body.includes('No external message was sent.')),
    ).toBe(true)
  })
  it('rejects an empty message, no recipients, or unrelated deliveries', () => {
    const incidentId = create()
    for (const [deliveryIds, message] of [
      [['ATX-1842'], ' '],
      [[], 'Update'],
      [['ATX-1901'], 'Update'],
    ] as [string[], string][]) {
      expect(command({ type: 'communicate', incidentId, deliveryIds, message }).ok).toBe(false)
    }
    expect(state.incidents[0].communications).toHaveLength(0)
  })
})

describe('resolution', () => {
  it('requires an outcome and keeps the incident open while essential actions remain', () => {
    const incidentId = create()
    expect(command({ type: 'resolve', incidentId, outcome: 'Recovered' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('essential'),
    })
    expect(state.incidents[0].status).toBe('open')
    cancelAll(incidentId)
    expect(command({ type: 'resolve', incidentId, outcome: '  ' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('outcome'),
    })
    expect(state.incidents[0].status).toBe('open')
  })
  it('does not treat confirmed recovery and customer communication as a verified outcome', () => {
    const incidentId = create()
    command({ type: 'propose', incidentId, detail: 'Alex takes over.' })
    command({ type: 'confirm', incidentId, confirmation: 'Alex agreed on the phone.' })
    command({
      type: 'communicate',
      incidentId,
      deliveryIds: affectedDeliveries(state, state.incidents[0]).map((d) => d.id),
      message: 'A replacement driver has been arranged.',
    })
    expect(outstandingEssential(state.incidents[0]).map((a) => a.title)).toEqual([
      'Verify recovery outcome with the driver',
    ])
    expect(command({ type: 'resolve', incidentId, outcome: 'Transfer arranged' }).ok).toBe(false)
    const action = state.incidents[0].actions.find((a) => a.kind === 'manual')!
    command({
      type: 'close-action',
      incidentId,
      actionId: action.id,
      status: 'completed',
      note: 'Daniel and Alex confirmed transfer complete by phone.',
    })
    expect(
      command({
        type: 'resolve',
        incidentId,
        outcome:
          'Cargo transferred; Alex continuing all six stops. Final delivery timing remains unverified.',
      }).ok,
    ).toBe(true)
    expect(state.incidents[0].status).toBe('resolved')
  })
  it('requires cancellation reasons and retains them in the shared history', () => {
    const incidentId = create()
    const actionId = state.incidents[0].actions[0].id
    expect(
      command({ type: 'close-action', incidentId, actionId, status: 'cancelled', note: ' ' }).ok,
    ).toBe(false)
    expect(state.incidents[0].actions[0].status).toBe('open')
    cancelAll(incidentId)
    expect(
      command({ type: 'resolve', incidentId, outcome: 'Businesses cancelled the affected orders.' })
        .ok,
    ).toBe(true)
    expect(state.incidents[0].timeline.filter((t) => t.title === 'Action cancelled')).toHaveLength(
      3,
    )
    expect(state.incidents[0].actions.every((a) => a.closingNote?.includes('business'))).toBe(true)
  })
  it('rejects further mutation of a resolved incident', () => {
    const incidentId = create()
    cancelAll(incidentId)
    command({ type: 'resolve', incidentId, outcome: 'Orders cancelled.' })
    expect(command({ type: 'note', incidentId, body: 'Edit history after resolution' }).ok).toBe(
      false,
    )
    expect(command({ type: 'link', incidentId, reportId: 'RPT-1043' }).ok).toBe(false)
  })
})

describe('ownership and follow-up', () => {
  it('assigns default actions to teammates from the supplied state, without fixture IDs', () => {
    state.teammates = state.teammates.map((person) => ({ ...person, id: `shift-${person.id}` }))
    const result = applyCommand(
      state,
      { type: 'create', reportId: 'RPT-1042', title: 'Breakdown', ownerId: 'shift-lina' },
      { actorId: 'shift-maya', now, id: 'new-team' },
    )
    if (!result.ok) throw new Error(result.error)
    expect(
      result.state.incidents[0].actions.every((action) =>
        state.teammates.some((person) => person.id === action.ownerId),
      ),
    ).toBe(true)
  })
  it('requires a known owner and a valid future follow-up', () => {
    const incidentId = create()
    for (const dueAt of ['invalid', now])
      expect(
        command({
          type: 'add-action',
          incidentId,
          title: 'Call business',
          ownerId: 'maya',
          dueAt,
          essential: true,
        }).ok,
      ).toBe(false)
    expect(command({ type: 'assign', incidentId, ownerId: 'unknown' }).ok).toBe(false)
    expect(
      command({
        type: 'add-action',
        incidentId,
        title: 'Call business',
        ownerId: 'maya',
        dueAt: '2026-10-24T19:00:00Z',
        essential: true,
      }).ok,
    ).toBe(true)
    const action = state.incidents[0].actions.at(-1)!
    expect(isOverdue(action, '2026-10-24T20:00:00Z')).toBe(true)
    command({
      type: 'close-action',
      incidentId,
      actionId: action.id,
      status: 'completed',
      note: 'Business updated by phone.',
    })
    expect(isOverdue(state.incidents[0].actions.at(-1)!, '2026-10-24T20:00:00Z')).toBe(false)
  })
  it('does not mutate its input state', () => {
    const before = state
    const snapshot = structuredClone(state)
    create()
    expect(before).toEqual(snapshot)
    expect(before.incidents).toEqual([])
    expect(state.incidents).toHaveLength(1)
  })
})
