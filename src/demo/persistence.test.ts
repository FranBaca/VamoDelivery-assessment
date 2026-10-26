import { describe, expect, it } from 'vitest'
import { createDemo } from './fixtures'
import { isDemoState, loadDemo, saveDemo, STORAGE_KEY } from './persistence'
import { applyCommand } from '../features/incidents/rules'

describe('local persistence', () => {
  it('round trips a valid incident and its source records', () => {
    const result = applyCommand(
      createDemo(),
      { type: 'create', reportId: 'RPT-1042', title: 'Breakdown', ownerId: 'lina' },
      { actorId: 'maya', id: '1', now: new Date().toISOString() },
    )
    if (!result.ok) throw new Error(result.error)
    expect(saveDemo(result.state)).toBe('')
    expect(loadDemo().state).toEqual(result.state)
    expect(isDemoState(result.state)).toBe(true)
  })
  it('recovers from malformed or incompatible stored data with a visible warning', () => {
    for (const raw of ['{broken', '{"version":2}', '{"version":1,"reports":[]}']) {
      localStorage.setItem(STORAGE_KEY, raw)
      const loaded = loadDemo()
      expect(loaded.warning).toContain('could not be loaded')
      expect(loaded.state.incidents).toEqual([])
      expect(loaded.state.reports).toHaveLength(2)
    }
  })
  it('rejects broken references and an invalid saved confirmation', () => {
    const result = applyCommand(
      createDemo(),
      { type: 'create', reportId: 'RPT-1042', title: 'Breakdown', ownerId: 'lina' },
      { actorId: 'maya', id: '1', now: new Date().toISOString() },
    )
    if (!result.ok) throw new Error(result.error)
    result.state.incidents[0].ownerId = 'missing'
    expect(isDemoState(result.state)).toBe(false)
    result.state.incidents[0].ownerId = 'lina'
    result.state.incidents[0].recovery = { detail: 'Alex takes over', status: 'confirmed' }
    expect(isDemoState(result.state)).toBe(false)
  })
  it.each(['proposed', 'confirmed'] as const)(
    'rejects malformed confirmation values in %s recovery before loading',
    (status) => {
      const result = applyCommand(
        createDemo(),
        { type: 'create', reportId: 'RPT-1042', title: 'Breakdown', ownerId: 'lina' },
        { actorId: 'maya', id: '1', now: new Date().toISOString() },
      )
      if (!result.ok) throw new Error(result.error)
      const saved = result.state
      for (const confirmation of [{ unexpected: 'object' }, ['text'], 42, true, null]) {
        const malformed = {
          ...saved,
          incidents: saved.incidents.map((incident) => ({
            ...incident,
            recovery: { status, detail: 'Alex takes over', confirmation },
          })),
        }
        expect(isDemoState(malformed)).toBe(false)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(malformed))
        const loaded = loadDemo()
        expect(loaded.warning).toContain('could not be loaded')
        expect(loaded.state.incidents).toEqual([])
      }
      saved.incidents[0].recovery = {
        status,
        detail: 'Alex takes over',
        confirmation: 'Alex agreed.',
      }
      expect(saveDemo(saved)).toBe('')
      expect(loadDemo()).toEqual({ state: saved, warning: '' })
      saved.incidents[0].recovery = { status: 'proposed', detail: 'Alex takes over' }
      expect(isDemoState(saved)).toBe(true)
    },
  )
  it('reports storage failures while leaving in-memory work available', () => {
    const blocked = {
      getItem() {
        throw new Error('Blocked')
      },
      setItem() {
        throw new Error('Quota')
      },
    }
    expect(loadDemo(blocked).warning).toBeTruthy()
    expect(saveDemo(createDemo(), blocked)).toContain('memory only')
  })
})
