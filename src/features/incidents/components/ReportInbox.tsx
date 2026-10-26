import { useState } from 'react'
import { ArrowRight, Check, Inbox, MessageSquare, Phone, Truck } from 'lucide-react'
import type { DemoState, IncidentCommand } from '../models'
import { linkedIncident } from '../rules'
import { formatTime, relativeTime } from '../time'
import { Avatar, Badge, Button, Field } from '../../../ui/primitives'

interface Props {
  state: DemoState
  now: string
  zone: string
  run: (command: IncidentCommand) => boolean
  openIncident: (id: string) => void
}

export function ReportInbox({ state, now, zone, run, openIncident }: Props) {
  const [selectedId, setSelectedId] = useState(state.reports[0]?.id ?? '')
  const report = state.reports.find((item) => item.id === selectedId)
  const [title, setTitle] = useState('Vehicle breakdown · Route ATX-204')
  const [ownerId, setOwnerId] = useState('lina')
  const [targetId, setTargetId] = useState('')
  const unlinked = state.reports.filter((item) => !linkedIncident(state, item.id)).length
  const existing = report && linkedIncident(state, report.id)
  const openIncidents = state.incidents.filter((item) => item.status === 'open')
  const target = targetId || openIncidents[0]?.id || ''

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SUPPORT + OPERATIONS</p>
          <h1>Incoming reports</h1>
          <p className="muted">Start with a report. Bring the whole response together.</p>
        </div>
        <Badge tone={unlinked ? 'amber' : 'green'}>
          {unlinked} unlinked {unlinked === 1 ? 'report' : 'reports'}
        </Badge>
      </div>
      {state.incidents.length === 0 && (
        <section className="scenario-banner" aria-labelledby="scenario-title">
          <div className="scenario-icon">
            <Truck size={26} />
          </div>
          <div>
            <span className="eyebrow">START HERE · FICTIONAL SCENARIO</span>
            <h2 id="scenario-title">A breakdown. Six deliveries. One response.</h2>
            <p>
              Daniel’s van has stopped mid-route. A customer has called, too. Open an incident from
              the driver’s report to see who else may be affected.
            </p>
            <ol className="scenario-steps">
              <li>
                <span>1</span> Review the driver report
              </li>
              <li>
                <span>2</span> Connect the customer call
              </li>
              <li>
                <span>3</span> Coordinate & resolve
              </li>
            </ol>
          </div>
        </section>
      )}
      <div className="inbox-layout">
        <section className="panel report-list" aria-label="Incoming reports">
          <div className="panel-heading">
            <h2>
              Reports <span className="count">{state.reports.length}</span>
            </h2>
            <span className="muted small">Newest context, one place</span>
          </div>
          {state.reports.length === 0 && (
            <div className="empty-small">
              <Inbox />
              <p>No incoming reports.</p>
            </div>
          )}
          {state.reports.map((item) => {
            const linked = linkedIncident(state, item.id)
            return (
              <button
                key={item.id}
                className={`report-item ${selectedId === item.id ? 'selected' : ''}`}
                aria-pressed={selectedId === item.id}
                onClick={() => {
                  setSelectedId(item.id)
                  setTitle(
                    item.driverId
                      ? 'Vehicle breakdown · Route ATX-204'
                      : `Delivery inquiry · ${item.deliveryId}`,
                  )
                }}
              >
                <div className="row spread">
                  <span className="channel-label">
                    {item.channel === 'Text' ? <MessageSquare size={14} /> : <Phone size={14} />}
                    {item.role} · {item.channel}
                  </span>
                  <span className="small muted">{relativeTime(item.receivedAt, now)}</span>
                </div>
                <h3>{item.sender}</h3>
                <p>{item.summary}</p>
                <div className="row spread">
                  <span className="mono small">{item.id}</span>
                  <Badge tone={linked ? 'green' : 'amber'}>
                    {linked ? (
                      <>
                        <Check size={11} /> Linked
                      </>
                    ) : (
                      'Unlinked'
                    )}
                  </Badge>
                </div>
              </button>
            )
          })}
          <div className="list-footnote">
            Reports are fictional. Calls are represented by teammate notes.
          </div>
        </section>
        {report ? (
          <section className="panel report-detail" aria-label="Selected report">
            <div className="row spread">
              <span className="eyebrow">REPORT DETAILS</span>
              <Badge>
                {report.channel === 'Text' ? <MessageSquare size={12} /> : <Phone size={12} />}
                {report.channel}
              </Badge>
            </div>
            <div className="sender">
              <Avatar name={report.sender} />
              <div>
                <h2>{report.sender}</h2>
                <p className="muted small">
                  {report.role} · {report.id}
                </p>
              </div>
            </div>
            <div className="message-bubble">
              <p>{report.body}</p>
              <time dateTime={report.receivedAt}>{formatTime(report.receivedAt, zone, true)}</time>
            </div>
            <div className="context-strip">
              <Truck size={17} />
              <div>
                <strong>
                  {report.driverId
                    ? 'Route ATX-204 · Daniel Brooks'
                    : `Delivery ${report.deliveryId}`}
                </strong>
                <p>
                  {report.driverId
                    ? 'Assigned route available · 6 unfinished stops'
                    : 'Assigned to Daniel Brooks · Route ATX-204'}
                </p>
              </div>
            </div>
            {existing ? (
              <div className="linked-box">
                <Check size={19} />
                <div>
                  <h3>Context connected</h3>
                  <p>This report belongs to {existing.id}.</p>
                  <Button variant="secondary" onClick={() => openIncident(existing.id)}>
                    Open incident <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="section-divider" />
                <h3>Give this report a shared home</h3>
                <p className="muted small">Keep the impact, decisions, and next steps together.</p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    run({ type: 'create', reportId: report.id, title, ownerId })
                  }}
                  className="form-stack"
                >
                  <Field label="Incident title">
                    {(id) => (
                      <input
                        id={id}
                        value={title}
                        maxLength={160}
                        required
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Incident owner">
                    {(id) => (
                      <select
                        id={id}
                        value={ownerId}
                        onChange={(event) => setOwnerId(event.target.value)}
                      >
                        {state.teammates.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} · {person.team}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Button type="submit">
                    Create incident <ArrowRight size={16} />
                  </Button>
                </form>
                {openIncidents.length > 0 && (
                  <form
                    className="link-existing"
                    onSubmit={(event) => {
                      event.preventDefault()
                      run({ type: 'link', incidentId: target, reportId: report.id })
                    }}
                  >
                    <span className="muted small">Or add context to an existing incident</span>
                    <Field label="Existing incident">
                      {(id) => (
                        <select
                          id={id}
                          value={target}
                          onChange={(event) => setTargetId(event.target.value)}
                        >
                          {openIncidents.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.id} · {item.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <Button type="submit" variant="secondary">
                      Link report to incident
                    </Button>
                  </form>
                )}
              </>
            )}
          </section>
        ) : (
          <section className="panel empty-state">
            <Inbox size={32} />
            <h2>No report selected</h2>
            <p>Choose an incoming report to review its details.</p>
          </section>
        )}
      </div>
    </>
  )
}
