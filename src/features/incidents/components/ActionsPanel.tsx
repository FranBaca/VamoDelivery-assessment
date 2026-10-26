import { useRef, useState } from 'react'
import { Check, Circle, ListTodo, Plus, X } from 'lucide-react'
import type { DemoState, Incident, IncidentCommand } from '../models'
import { isOverdue, outstandingEssential } from '../rules'
import { formatTime } from '../time'
import { Avatar, Badge, Button, Field } from '../../../ui/primitives'

export function ActionsPanel({
  state,
  incident,
  zone,
  now,
  run,
}: {
  state: DemoState
  incident: Incident
  zone: string
  now: string
  run: (command: IncidentCommand) => boolean
}) {
  const [closing, setClosing] = useState<{ id: string; status: 'completed' | 'cancelled' } | null>(
    null,
  )
  const [note, setNote] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [title, setTitle] = useState('')
  const [ownerId, setOwnerId] = useState('lina')
  const [due, setDue] = useState(new Date(Date.parse(now) + 30 * 60_000).toISOString().slice(0, 16))
  const remaining = outstandingEssential(incident)
  return (
    <section className="panel section-panel" aria-labelledby="actions-title">
      <div className="panel-heading">
        <h2 id="actions-title" tabIndex={-1} ref={headingRef}>
          <ListTodo size={18} /> Next actions
        </h2>
        <span className="small muted">{remaining.length} essential open</span>
      </div>
      <div className="action-list">
        {incident.actions.map((action) => {
          const owner = state.teammates.find((person) => person.id === action.ownerId)!
          const overdue = isOverdue(action, now)
          return (
            <div
              className={`action-item ${action.status !== 'open' ? 'action-closed' : ''}`}
              key={action.id}
            >
              <div className={`action-status status-${action.status}`}>
                {action.status === 'completed' ? (
                  <Check size={15} />
                ) : action.status === 'cancelled' ? (
                  <X size={15} />
                ) : (
                  <Circle size={15} />
                )}
              </div>
              <div className="action-content">
                <h3>{action.title}</h3>
                <div className="action-meta">
                  <Avatar name={owner.name} small />
                  <span>
                    {owner.name} · {owner.team}
                  </span>
                </div>
                {action.status === 'open' ? (
                  <p className={`small ${overdue ? 'text-red' : 'muted'}`}>
                    <time dateTime={action.dueAt}>
                      {overdue ? 'Overdue · ' : 'Follow up · '}
                      {formatTime(action.dueAt, zone, true)}
                    </time>
                    <span className="essential-label">Essential</span>
                  </p>
                ) : (
                  <>
                    <Badge tone={action.status === 'completed' ? 'green' : 'neutral'}>
                      {action.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </Badge>
                    <p className="closing-note">{action.closingNote}</p>
                  </>
                )}
                {incident.status === 'open' && action.status === 'open' && (
                  <>
                    {closing?.id === action.id ? (
                      <form
                        className="form-stack action-close-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          if (
                            run({
                              type: 'close-action',
                              incidentId: incident.id,
                              actionId: action.id,
                              status: closing.status,
                              note,
                            })
                          ) {
                            setClosing(null)
                            setNote('')
                            headingRef.current?.focus()
                          }
                        }}
                      >
                        <Field
                          label={
                            closing.status === 'cancelled'
                              ? 'Cancellation reason'
                              : 'Completion / verification note'
                          }
                        >
                          {(id) => (
                            <textarea
                              id={id}
                              required
                              maxLength={2000}
                              value={note}
                              rows={2}
                              placeholder={
                                closing.status === 'cancelled'
                                  ? 'Why is this action no longer needed?'
                                  : 'What did you verify, and with whom?'
                              }
                              onChange={(event) => setNote(event.target.value)}
                              autoFocus
                            />
                          )}
                        </Field>
                        <div className="row wrap">
                          <Button
                            variant={closing.status === 'cancelled' ? 'danger' : 'primary'}
                            type="submit"
                          >
                            {closing.status === 'cancelled'
                              ? 'Confirm cancellation'
                              : 'Save completion'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setClosing(null)
                              headingRef.current?.focus()
                            }}
                          >
                            Keep open
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="action-buttons">
                        {action.kind === 'manual' ? (
                          <Button
                            variant="secondary"
                            aria-label={`Complete: ${action.title}`}
                            onClick={() => {
                              setClosing({ id: action.id, status: 'completed' })
                              setNote('')
                            }}
                          >
                            Complete
                          </Button>
                        ) : (
                          <span className="small muted">
                            {action.kind === 'recovery'
                              ? 'Completes when recovery is confirmed.'
                              : 'Completes when all customers have an update.'}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          aria-label={`Cancel: ${action.title}`}
                          onClick={() => {
                            setClosing({ id: action.id, status: 'cancelled' })
                            setNote('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {incident.status === 'open' && (
        <details className="add-action">
          <summary>
            <Plus size={15} /> Add next action
          </summary>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault()
              if (
                run({
                  type: 'add-action',
                  incidentId: incident.id,
                  title,
                  ownerId,
                  dueAt: `${due}:00Z`,
                  essential: true,
                })
              )
                setTitle('')
            }}
          >
            <Field label="Action description">
              {(id) => (
                <input
                  id={id}
                  value={title}
                  required
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs to happen next?"
                />
              )}
            </Field>
            <Field label="Action owner">
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
            <Field
              label="Follow-up time (UTC)"
              hint="Enter UTC, regardless of the display time zone. Every action in this MVP is essential to resolution."
            >
              {(id, hint) => (
                <input
                  id={id}
                  aria-describedby={hint}
                  type="datetime-local"
                  required
                  value={due}
                  onChange={(event) => setDue(event.target.value)}
                />
              )}
            </Field>
            <Button type="submit">
              <Plus size={15} /> Add action
            </Button>
          </form>
        </details>
      )}
    </section>
  )
}
