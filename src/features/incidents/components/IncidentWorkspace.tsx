import { useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  MapPin,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { DemoState, Incident, IncidentCommand } from '../models'
import { affectedDeliveries, linkedIncident, outstandingEssential } from '../rules'
import { formatTime } from '../time'
import { Badge, Button, Field } from '../../../ui/primitives'
import { RecoveryPanel } from './RecoveryPanel'
import { DeliveryPanel } from './DeliveryPanel'
import { ActionsPanel } from './ActionsPanel'
import { TimelinePanel } from './TimelinePanel'
import { ResolutionPanel } from './ResolutionPanel'

export function IncidentWorkspace({
  state,
  incident,
  now,
  zone,
  run,
  back,
}: {
  state: DemoState
  incident: Incident
  now: string
  zone: string
  run: (command: IncidentCommand) => boolean
  back: () => void
}) {
  const deliveries = affectedDeliveries(state, incident)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const unupdated = deliveries.filter(
    (delivery) => !incident.communications.some((item) => item.deliveryId === delivery.id),
  )
  const remaining = outstandingEssential(incident)
  const reports = state.reports.filter((report) => incident.reportIds.includes(report.id))
  const related = state.reports.filter(
    (report) =>
      !linkedIncident(state, report.id) &&
      deliveries.some(
        (delivery) => report.deliveryId === delivery.id || report.driverId === delivery.driverId,
      ),
  )
  const confirmed = incident.recovery?.status === 'confirmed'
  const owner = state.teammates.find((person) => person.id === incident.ownerId)!
  const steps = [
    { label: 'Open incident', done: true },
    { label: 'Connect reports', done: related.length === 0 && reports.length > 1 },
    { label: 'Confirm recovery', done: confirmed },
    { label: 'Update customers', done: unupdated.length === 0 },
    { label: 'Verify & resolve', done: incident.status === 'resolved' },
  ]
  return (
    <>
      <Button variant="ghost" className="back-link" onClick={back}>
        <ArrowLeft size={14} /> All incidents
      </Button>
      <div className="page-heading incident-heading">
        <div>
          <div className="row">
            <span className="mono muted small">{incident.id}</span>
            <Badge tone={incident.status === 'resolved' ? 'green' : 'amber'}>
              <span className="status-dot" />
              {incident.status === 'resolved' ? 'Resolved' : 'Open incident'}
            </Badge>
          </div>
          <h1 tabIndex={-1} ref={headingRef}>
            {incident.title}
          </h1>
          <p className="muted small">
            <MapPin size={13} /> Austin, TX <span>·</span> Opened{' '}
            {formatTime(incident.createdAt, zone, true)} <span>·</span>
            <span>
              {reports.length} linked {reports.length === 1 ? 'report' : 'reports'}
            </span>
          </p>
        </div>
        <div className="incident-owner">
          <Field label="Incident owner">
            {(id) => (
              <select
                id={id}
                disabled={incident.status === 'resolved'}
                value={incident.ownerId}
                onChange={(event) =>
                  run({ type: 'assign', incidentId: incident.id, ownerId: event.target.value })
                }
              >
                {state.teammates.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.team}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </div>
      <nav className="workflow-progress" aria-label="Scenario progress" tabIndex={0}>
        <ol>
          {steps.map((step, index) => (
            <li className={step.done ? 'step-done' : ''} key={step.label}>
              <span>{step.done ? <Check size={13} /> : index + 1}</span>
              {step.label}
            </li>
          ))}
        </ol>
      </nav>
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">WHAT HAPPENED?</span>
          <strong>
            {reports.some((report) => report.driverId) ? 'Vehicle breakdown' : 'Delivery inquiry'}
          </strong>
          <p>
            {reports.some((report) => report.driverId)
              ? 'Driver cannot continue · cargo reported secure'
              : 'Customer has requested an update'}
          </p>
        </div>
        <div className="summary-card">
          <span className="summary-label">
            <Package size={13} /> WHAT IS AFFECTED?
          </span>
          <strong>{deliveries.length} potential deliveries</strong>
          <p>
            {new Set(deliveries.map((delivery) => delivery.business)).size} businesses ·{' '}
            {unupdated.length} customers awaiting update
          </p>
        </div>
        <div className="summary-card">
          <span className="summary-label">
            <ShieldCheck size={13} /> WHAT IS CONFIRMED?
          </span>
          <strong>{confirmed ? 'Recovery arranged' : 'Recovery not confirmed'}</strong>
          <p>
            {confirmed
              ? 'Agreement recorded · completion still needs verification'
              : incident.recovery
                ? 'A proposal is recorded; agreement is pending'
                : 'Driver report only; recovery is not arranged'}
          </p>
        </div>
        <div className="summary-card">
          <span className="summary-label">
            <Users size={13} /> WHO ACTS NEXT?
          </span>
          <strong>{remaining.length} essential actions open</strong>
          <p>{owner.name} owns coordination</p>
        </div>
      </div>
      {incident.status === 'open' &&
        related.map((report) => (
          <section className="related-report" key={report.id}>
            <div className="related-icon">
              <Link2 size={20} />
            </div>
            <div>
              <span className="eyebrow">RELATED CONTEXT · REVIEW BEFORE LINKING</span>
              <h2>
                {report.sender} · {report.channel}
              </h2>
              <p>{report.body}</p>
              <span className="small muted">
                {report.id} · {report.deliveryId ?? 'Same assigned driver'} · received{' '}
                {formatTime(report.receivedAt, zone)}
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (run({ type: 'link', incidentId: incident.id, reportId: report.id }))
                  headingRef.current?.focus()
              }}
            >
              Link report <ArrowRight size={14} />
            </Button>
          </section>
        ))}
      {incident.status === 'resolved' && <ResolutionPanel incident={incident} run={run} />}
      <div className="workspace-columns">
        <div className="workspace-main">
          <RecoveryPanel incident={incident} run={run} />
          <DeliveryPanel
            deliveries={deliveries}
            incident={incident}
            zone={zone}
            now={now}
            run={run}
          />
          <TimelinePanel state={state} incident={incident} zone={zone} run={run} />
        </div>
        <aside className="workspace-aside" aria-label="Ownership, next actions, and resolution">
          <ActionsPanel state={state} incident={incident} zone={zone} now={now} run={run} />
          {incident.status === 'open' && <ResolutionPanel incident={incident} run={run} />}
          <section className="panel source-context">
            <h2>
              <Link2 size={16} /> Linked reports
            </h2>
            {reports.map((report) => (
              <details key={report.id}>
                <summary>
                  {report.sender}
                  <span className="mono small muted">{report.id}</span>
                </summary>
                <p>{report.body}</p>
                <time className="small muted" dateTime={report.receivedAt}>
                  {formatTime(report.receivedAt, zone, true)}
                </time>
              </details>
            ))}
            <p className="footnote">
              Working assumption: Support handles communication; Operations coordinates recovery.
              Responsibilities may overlap.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
