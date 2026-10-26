import { useRef, useState } from 'react'
import { CheckCircle2, Route } from 'lucide-react'
import type { Incident, IncidentCommand } from '../models'
import { Badge, Button, Field } from '../../../ui/primitives'

export function RecoveryPanel({
  incident,
  run,
}: {
  incident: Incident
  run: (command: IncidentCommand) => boolean
}) {
  const [detail, setDetail] = useState(incident.recovery?.detail ?? '')
  const [confirmation, setConfirmation] = useState('')
  const [editing, setEditing] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const recovery = incident.recovery
  const resolved = incident.status === 'resolved'
  return (
    <section className="panel section-panel" aria-labelledby="recovery-title">
      <div className="panel-heading">
        <h2 id="recovery-title" tabIndex={-1} ref={headingRef}>
          <Route size={18} /> Recovery
        </h2>
        <Badge tone={recovery?.status === 'confirmed' ? 'green' : 'amber'}>
          {recovery?.status === 'confirmed' ? 'Confirmed' : recovery ? 'Proposed' : 'Not arranged'}
        </Badge>
      </div>
      <div className="panel-body">
        <p className="muted small">
          Operations coordinates recovery. A proposal is not an agreement.
        </p>
        {recovery && (
          <div className={`recovery-record ${recovery.status}`}>
            <span className="eyebrow">
              {recovery.status === 'confirmed'
                ? 'CONFIRMED ARRANGEMENT'
                : 'PROPOSAL · AWAITING CONFIRMATION'}
            </span>
            <p>{recovery.detail}</p>
            {recovery.confirmation && (
              <div className="confirmation">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Confirmation recorded</strong>
                  <p>{recovery.confirmation}</p>
                </div>
              </div>
            )}
          </div>
        )}
        {!resolved && recovery?.status !== 'confirmed' && (
          <>
            {!recovery || editing ? (
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (run({ type: 'propose', incidentId: incident.id, detail })) {
                    setEditing(false)
                    headingRef.current?.focus()
                  }
                }}
              >
                <Field
                  label="Proposed recovery"
                  hint="Include the person, transfer location, and proposed timing. No messages are sent."
                >
                  {(id, hint) => (
                    <textarea
                      id={id}
                      aria-describedby={hint}
                      value={detail}
                      required
                      maxLength={2000}
                      placeholder="e.g. Ask Alex to collect the six orders at E 7th & Pleasant Valley. Timing still to be agreed."
                      onChange={(event) => setDetail(event.target.value)}
                      rows={3}
                    />
                  )}
                </Field>
                <div className="row">
                  <Button type="submit">Save proposal</Button>
                  {editing && (
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      Cancel edit
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <>
                <Button variant="ghost" className="edit-link" onClick={() => setEditing(true)}>
                  Edit proposal
                </Button>
                <form
                  className="form-stack confirmation-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (run({ type: 'confirm', incidentId: incident.id, confirmation })) {
                      setConfirmation('')
                      headingRef.current?.focus()
                    }
                  }}
                >
                  <Field
                    label="What was confirmed, and by whom?"
                    hint="Record a confirmed agreement from this fictional scenario. Saving a proposal alone does not confirm it."
                  >
                    {(id, hint) => (
                      <textarea
                        id={id}
                        aria-describedby={hint}
                        value={confirmation}
                        required
                        maxLength={2000}
                        placeholder="e.g. Alex confirmed by phone: available for all six orders, transfer at 2:30 PM CDT."
                        rows={3}
                        onChange={(event) => setConfirmation(event.target.value)}
                      />
                    )}
                  </Field>
                  <Button type="submit">
                    Confirm arrangement <CheckCircle2 size={15} />
                  </Button>
                </form>
              </>
            )}
          </>
        )}
        {recovery?.status === 'confirmed' && (
          <p className="footnote">
            Arrangement confirmed; delivery completion still needs verification.
          </p>
        )}
        {resolved && !recovery && (
          <p className="footnote">
            No recovery arrangement recorded. See the outcome and cancelled actions for context.
          </p>
        )}
      </div>
    </section>
  )
}
