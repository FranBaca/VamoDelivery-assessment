import type { DemoState } from '../features/incidents/models'
import { createDemo } from './fixtures'

export const STORAGE_KEY = 'vamo-incident-desk:v1'
type Row = Record<string, unknown>
const object = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: Row, keys: string[]) => keys.every((key) => typeof value[key] === 'string')
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const oneOf = (value: unknown, values: unknown[]) => values.includes(value)
const rows = (value: unknown, valid: (row: Row) => boolean) =>
  Array.isArray(value) && value.every((row) => object(row) && valid(row))

// Validate the saved graph before rendering, including references used by business rules.
export function isDemoState(value: unknown): value is DemoState {
  if (!object(value) || value.version !== 1) return false
  if (
    !rows(
      value.teammates,
      (p) => strings(p, ['id', 'name', 'location']) && oneOf(p.team, ['Support', 'Operations']),
    )
  )
    return false
  if (
    !rows(
      value.reports,
      (r) =>
        strings(r, ['id', 'sender', 'summary', 'body']) &&
        date(r.receivedAt) &&
        oneOf(r.channel, ['Text', 'Call note']) &&
        oneOf(r.role, ['Driver', 'Customer']) &&
        (r.driverId === undefined || typeof r.driverId === 'string') &&
        (r.routeId === undefined || typeof r.routeId === 'string') &&
        (r.deliveryId === undefined || typeof r.deliveryId === 'string'),
    )
  )
    return false
  if (
    !rows(
      value.deliveries,
      (d) =>
        strings(d, ['id', 'routeId', 'driverId', 'customer', 'business', 'address']) &&
        date(d.windowEnd) &&
        oneOf(d.status, ['In transit', 'Delivered']),
    )
  )
    return false
  if (
    !rows(
      value.incidents,
      (i) =>
        strings(i, ['id', 'title', 'ownerId']) &&
        date(i.createdAt) &&
        oneOf(i.status, ['open', 'resolved']) &&
        Array.isArray(i.reportIds) &&
        i.reportIds.every((id) => typeof id === 'string') &&
        (i.outcome === undefined || typeof i.outcome === 'string') &&
        (i.recovery === undefined ||
          (object(i.recovery) &&
            strings(i.recovery, ['detail']) &&
            oneOf(i.recovery.status, ['proposed', 'confirmed']) &&
            (i.recovery.confirmation === undefined ||
              typeof i.recovery.confirmation === 'string') &&
            (i.recovery.status !== 'confirmed' || typeof i.recovery.confirmation === 'string'))) &&
        rows(
          i.actions,
          (a) =>
            strings(a, ['id', 'title', 'ownerId']) &&
            date(a.dueAt) &&
            typeof a.essential === 'boolean' &&
            oneOf(a.kind, ['recovery', 'communication', 'manual']) &&
            oneOf(a.status, ['open', 'completed', 'cancelled']) &&
            (a.status === 'open' || typeof a.closingNote === 'string'),
        ) &&
        rows(
          i.communications,
          (c) => strings(c, ['id', 'deliveryId', 'message', 'authorId']) && date(c.at),
        ) &&
        rows(
          i.timeline,
          (t) =>
            strings(t, ['id', 'title', 'body', 'authorId']) &&
            date(t.at) &&
            oneOf(t.kind, ['report', 'recovery', 'communication', 'action', 'note', 'resolved']),
        ),
    )
  )
    return false
  // The shape is checked above; this assertion lets reference validation stay readable.
  const state = value as unknown as DemoState
  const teammate = (id: string) => state.teammates.some((p) => p.id === id)
  const allReportIds = state.incidents.flatMap((i) => i.reportIds)
  if (new Set(allReportIds).size !== allReportIds.length) return false
  for (const records of [state.reports, state.deliveries, state.incidents, state.teammates]) {
    if (new Set(records.map((r) => r.id)).size !== records.length) return false
  }
  return (
    state.teammates.length > 0 &&
    state.incidents.every(
      (i) =>
        teammate(i.ownerId) &&
        i.reportIds.length > 0 &&
        i.reportIds.every((id) => state.reports.some((r) => r.id === id)) &&
        i.actions.every((a) => teammate(a.ownerId)) &&
        i.timeline.every((t) => teammate(t.authorId)) &&
        i.communications.every(
          (c) => teammate(c.authorId) && state.deliveries.some((d) => d.id === c.deliveryId),
        ) &&
        (i.status !== 'resolved' ||
          (Boolean(i.outcome?.trim()) &&
            !i.actions.some((a) => a.essential && a.status === 'open'))),
    )
  )
}

export function loadDemo(storage?: Pick<Storage, 'getItem'>): {
  state: DemoState
  warning: string
} {
  try {
    const raw = (storage ?? window.localStorage).getItem(STORAGE_KEY)
    if (!raw) return { state: createDemo(), warning: '' }
    const value: unknown = JSON.parse(raw)
    if (!isDemoState(value)) throw new Error('Invalid saved demo')
    return { state: value, warning: '' }
  } catch {
    return {
      state: createDemo(),
      warning:
        'Saved demo could not be loaded. A fresh scenario is open. Your next change will replace the saved copy.',
    }
  }
}

export function saveDemo(state: DemoState, storage?: Pick<Storage, 'setItem'>): string {
  try {
    ;(storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(state))
    return ''
  } catch {
    return 'Browser storage is unavailable. Changes are kept in memory only and will be lost on refresh.'
  }
}
