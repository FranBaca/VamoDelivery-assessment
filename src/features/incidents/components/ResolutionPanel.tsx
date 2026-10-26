import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, LockKeyhole } from 'lucide-react'
import type { Incident, IncidentCommand } from '../models'
import { outstandingEssential } from '../rules'
import { Button, Field } from '../../../ui/primitives'

export function ResolutionPanel({
  incident,
  run,
}: {
  incident: Incident
  run: (command: IncidentCommand) => boolean
}) {
  const [outcome, setOutcome] = useState('')
  const outcomeRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (incident.status === 'resolved') outcomeRef.current?.focus()
  }, [incident.status])
  const remaining = outstandingEssential(incident)
  if (incident.status === 'resolved')
    return (
      <section className="panel resolved-panel">
        <CheckCircle2 size={24} />
        <div>
          <p className="eyebrow">INCIDENT RESOLVED</p>
          <h2 tabIndex={-1} ref={outcomeRef}>
            Outcome recorded
          </h2>
          <p className="preserve-lines">{incident.outcome}</p>
          <p className="muted small">
            The incident is read-only. Its reports, actions, and timeline remain available for the
            next shift.
          </p>
        </div>
      </section>
    )
  return (
    <section className="panel section-panel" aria-labelledby="resolution-title">
      <div className="panel-heading">
        <h2 id="resolution-title">
          <CheckCircle2 size={18} /> Resolve incident
        </h2>
      </div>
      <div className="panel-body">
        {remaining.length ? (
          <div className="resolution-blocker">
            <LockKeyhole size={17} />
            <div>
              <strong>
                {remaining.length} essential{' '}
                {remaining.length === 1 ? 'action remains' : 'actions remain'}
              </strong>
              <p>Keep this incident open until each is completed or cancelled with a reason.</p>
              <ul>
                {remaining.map((action) => (
                  <li key={action.id}>{action.title}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="ready-message">
            <CheckCircle2 size={17} /> Essential actions are closed. Record the actual outcome.
          </p>
        )}
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            run({ type: 'resolve', incidentId: incident.id, outcome })
          }}
        >
          <Field
            label="Incident outcome"
            hint="What happened in the end? Include any remaining uncertainty. Confirmation of recovery alone does not mean every delivery arrived."
          >
            {(id, hint) => (
              <textarea
                id={id}
                aria-describedby={hint}
                required
                maxLength={3000}
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="Record the verified result and any relevant cancellation decisions…"
                rows={3}
              />
            )}
          </Field>
          <Button type="submit" disabled={remaining.length > 0}>
            Resolve incident <CheckCircle2 size={15} />
          </Button>
        </form>
      </div>
    </section>
  )
}
