import type {
  CommandContext,
  CommandResult,
  DemoState,
  Incident,
  IncidentCommand,
  NextAction,
} from './models'

export function linkedIncident(state: DemoState, reportId: string) {
  return state.incidents.find((incident) => incident.reportIds.includes(reportId))
}

// A driver report exposes their unfinished route; a customer report exposes one delivery.
// Derive this union from source records so linking a second report never doubles impact.
export function affectedDeliveries(state: DemoState, incident: Incident) {
  const reports = state.reports.filter((report) => incident.reportIds.includes(report.id))
  return state.deliveries.filter(
    (delivery) =>
      delivery.status !== 'Delivered' &&
      reports.some(
        (report) =>
          (report.driverId === delivery.driverId &&
            (!report.routeId || report.routeId === delivery.routeId)) ||
          report.deliveryId === delivery.id,
      ),
  )
}

export function outstandingEssential(incident: Incident) {
  return incident.actions.filter((action) => action.essential && action.status === 'open')
}

export function isOverdue(action: NextAction, now: string) {
  return action.status === 'open' && Date.parse(action.dueAt) < Date.parse(now)
}

export function applyCommand(
  state: DemoState,
  command: IncidentCommand,
  context: CommandContext,
): CommandResult {
  const fail = (error: string): CommandResult => ({ ok: false, error })
  const { actorId, now, id } = context
  if (!state.teammates.some((person) => person.id === actorId) || !Number.isFinite(Date.parse(now)))
    return fail('Choose a valid teammate and time.')
  const ownerExists = (ownerId: string) => state.teammates.some((person) => person.id === ownerId)
  const next = structuredClone(state)
  let incident: Incident
  if (command.type === 'create') {
    if (!state.reports.some((report) => report.id === command.reportId))
      return fail('This report no longer exists.')
    if (linkedIncident(state, command.reportId))
      return fail('This report is already linked to an incident. Open that incident instead.')
    if (!command.title.trim() || command.title.trim().length > 160)
      return fail('Enter an incident title of 1–160 characters.')
    if (!ownerExists(command.ownerId)) return fail('Choose an incident owner.')
    const dueAt = new Date(Date.parse(now) + 15 * 60_000).toISOString()
    const operationsOwner =
      state.teammates.find((person) => person.team === 'Operations')?.id ?? command.ownerId
    const supportOwner =
      state.teammates.find((person) => person.team === 'Support')?.id ?? command.ownerId
    incident = {
      id: `INC-${id}`,
      title: command.title.trim(),
      status: 'open',
      ownerId: command.ownerId,
      reportIds: [command.reportId],
      createdAt: now,
      communications: [],
      timeline: [],
      actions: [
        {
          id: `${id}-recovery`,
          title: 'Confirm a recovery arrangement',
          ownerId: operationsOwner,
          dueAt,
          essential: true,
          kind: 'recovery',
          status: 'open',
        },
        {
          id: `${id}-comms`,
          title: 'Update all affected customers',
          ownerId: supportOwner,
          dueAt,
          essential: true,
          kind: 'communication',
          status: 'open',
        },
        {
          id: `${id}-verify`,
          title: 'Verify recovery outcome with the driver',
          ownerId: operationsOwner,
          dueAt: new Date(Date.parse(now) + 45 * 60_000).toISOString(),
          essential: true,
          kind: 'manual',
          status: 'open',
        },
      ],
    }
    next.incidents.push(incident)
  } else {
    const found = next.incidents.find((item) => item.id === command.incidentId)
    if (!found) return fail('This incident no longer exists.')
    if (found.status === 'resolved')
      return fail('This incident is resolved. Its record is read-only.')
    incident = found
  }
  const record = (kind: Incident['timeline'][number]['kind'], title: string, body: string) => {
    incident.timeline.push({
      id: `${id}-${incident.timeline.length}`,
      kind,
      title,
      body,
      at: now,
      authorId: actorId,
    })
  }
  const completeKind = (kind: NextAction['kind'], note: string) => {
    for (const action of incident.actions) {
      if (action.kind === kind && action.status === 'open') {
        action.status = 'completed'
        action.closingNote = note
        record('action', 'Essential action completed', `${action.title}. ${note}`)
      }
    }
  }
  let feedback = 'Incident updated.'
  switch (command.type) {
    case 'create': {
      const report = next.reports.find((item) => item.id === command.reportId)!
      record(
        'report',
        `Incident opened from ${report.role.toLowerCase()} report`,
        `${report.id} · ${report.sender}: ${report.body}`,
      )
      feedback = 'Incident created. Review the affected deliveries and any related reports.'
      break
    }
    case 'link': {
      const report = next.reports.find((item) => item.id === command.reportId)
      if (!report) return fail('This report no longer exists.')
      if (linkedIncident(state, report.id))
        return fail('This report is already linked to an incident. It cannot be linked twice.')
      const previousDeliveryIds = new Set(affectedDeliveries(next, incident).map((d) => d.id))
      incident.reportIds.push(report.id)
      const addedDeliveries = affectedDeliveries(next, incident).filter(
        (delivery) => !previousDeliveryIds.has(delivery.id),
      )
      if (addedDeliveries.length) {
        // Prior completion and cancellation only covered the earlier impact.
        // Keep those records in the timeline, but require review for the wider scope.
        for (const action of incident.actions) {
          if (action.essential && action.status !== 'open') {
            action.status = 'open'
            delete action.closingNote
            record(
              'action',
              'Essential action reopened',
              `${action.title}. A linked report added deliveries: ${addedDeliveries.map((d) => d.id).join(', ')}. Review this work for the expanded impact.`,
            )
          }
        }
        if (incident.recovery?.status === 'confirmed') {
          incident.recovery = { status: 'proposed', detail: incident.recovery.detail }
          record(
            'recovery',
            'Recovery needs confirmation for expanded impact',
            'The previous agreement remains in the timeline. Review the proposal and confirm coverage for all affected deliveries.',
          )
        }
      }
      record('report', 'Report linked', `${report.id} · ${report.sender}: ${report.body}`)
      feedback = addedDeliveries.length
        ? 'Report linked. Additional deliveries were identified. Review essential actions and recovery for the expanded impact.'
        : 'Report linked. Affected deliveries are counted once.'
      break
    }
    case 'assign':
      if (!ownerExists(command.ownerId)) return fail('Choose an incident owner.')
      incident.ownerId = command.ownerId
      record(
        'action',
        'Incident owner changed',
        next.teammates.find((person) => person.id === command.ownerId)!.name,
      )
      feedback = 'Incident owner updated.'
      break
    case 'propose':
      if (incident.recovery?.status === 'confirmed')
        return fail('The recovery arrangement is already confirmed.')
      if (!command.detail.trim()) return fail('Describe the proposed recovery arrangement.')
      incident.recovery = { status: 'proposed', detail: command.detail.trim() }
      record('recovery', 'Recovery proposed · not confirmed', command.detail.trim())
      feedback = 'Proposal saved. No recovery arrangement is confirmed yet.'
      break
    case 'confirm':
      if (!incident.recovery || incident.recovery.status !== 'proposed')
        return fail('Save a recovery proposal before confirming it.')
      if (!command.confirmation.trim())
        return fail('Record who confirmed the arrangement and what was agreed.')
      incident.recovery.status = 'confirmed'
      incident.recovery.confirmation = command.confirmation.trim()
      record(
        'recovery',
        'Recovery arrangement confirmed',
        `${incident.recovery.detail}\nConfirmation: ${command.confirmation.trim()}`,
      )
      completeKind('recovery', command.confirmation.trim())
      feedback = 'Recovery arrangement confirmed. Delivery completion has not been assumed.'
      break
    case 'communicate': {
      if (!command.message.trim()) return fail('Enter the simulated customer update.')
      const affected = affectedDeliveries(next, incident)
      const ids = [...new Set(command.deliveryIds)]
      if (
        !ids.length ||
        ids.some((deliveryId) => !affected.some((delivery) => delivery.id === deliveryId))
      )
        return fail('Choose at least one affected delivery.')
      for (const deliveryId of ids)
        incident.communications.push({
          id: `${id}-${deliveryId}`,
          deliveryId,
          message: command.message.trim(),
          authorId: actorId,
          at: now,
        })
      record(
        'communication',
        `Simulated customer update · ${ids.length} ${ids.length === 1 ? 'delivery' : 'deliveries'}`,
        `${ids.join(', ')}\n${command.message.trim()}\nDemo only. No external message was sent.`,
      )
      if (
        affected.every((delivery) =>
          incident.communications.some((item) => item.deliveryId === delivery.id),
        )
      )
        completeKind('communication', 'A simulated update is recorded for every affected delivery.')
      feedback = `Simulated update recorded for ${ids.length} ${ids.length === 1 ? 'customer' : 'customers'}. No message was sent.`
      break
    }
    case 'add-action':
      if (!command.title.trim()) return fail('Describe the next action.')
      if (!ownerExists(command.ownerId)) return fail('Choose an action owner.')
      if (
        !Number.isFinite(Date.parse(command.dueAt)) ||
        Date.parse(command.dueAt) <= Date.parse(now)
      )
        return fail('Choose a follow-up time in the future.')
      incident.actions.push({
        id: `ACT-${id}`,
        title: command.title.trim(),
        ownerId: command.ownerId,
        dueAt: new Date(command.dueAt).toISOString(),
        essential: command.essential,
        kind: 'manual',
        status: 'open',
      })
      record(
        'action',
        'Next action added',
        `${command.title.trim()} · ${next.teammates.find((person) => person.id === command.ownerId)!.name} · follow up ${command.dueAt}${command.essential ? ' · essential' : ''}`,
      )
      feedback = 'Next action added with an owner and follow-up time.'
      break
    case 'close-action': {
      const action = incident.actions.find((item) => item.id === command.actionId)
      if (!action || action.status !== 'open') return fail('This action is no longer open.')
      if (!command.note.trim())
        return fail(
          command.status === 'cancelled'
            ? 'A cancellation reason is required.'
            : 'Record what was completed or verified.',
        )
      if (command.status === 'completed' && action.kind !== 'manual')
        return fail(
          'Complete this action in Recovery or Customer updates, or cancel it with a reason.',
        )
      action.status = command.status
      action.closingNote = command.note.trim()
      record('action', `Action ${command.status}`, `${action.title}\n${command.note.trim()}`)
      feedback = `Action ${command.status}.`
      break
    }
    case 'note':
      if (!command.body.trim()) return fail('Enter an update before saving.')
      record('note', 'Team update', command.body.trim())
      feedback = 'Update added to the shared timeline.'
      break
    case 'resolve':
      if (!command.outcome.trim()) return fail('Record an outcome before resolving this incident.')
      if (outstandingEssential(incident).length)
        return fail(
          'Complete or explicitly cancel every unfinished essential action before resolving.',
        )
      incident.status = 'resolved'
      incident.outcome = command.outcome.trim()
      record('resolved', 'Incident resolved', command.outcome.trim())
      feedback = 'Incident resolved. The outcome and full history remain available.'
      break
  }
  return { ok: true, state: next, incidentId: incident.id, feedback }
}
