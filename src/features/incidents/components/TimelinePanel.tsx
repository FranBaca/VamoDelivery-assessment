import { useState } from 'react'
import { Activity, CheckCircle2, ListTodo, MessageSquare, Route, FileText } from 'lucide-react'
import type { DemoState, Incident, IncidentCommand, TimelineEntry } from '../models'
import { formatTime } from '../time'
import { Button, Field } from '../../../ui/primitives'

const icons = {
  report: FileText,
  recovery: Route,
  communication: MessageSquare,
  action: ListTodo,
  note: FileText,
  resolved: CheckCircle2,
}
function TimelineItem({
  entry,
  state,
  zone,
}: {
  entry: TimelineEntry
  state: DemoState
  zone: string
}) {
  const author = state.teammates.find((person) => person.id === entry.authorId)!
  const Icon = icons[entry.kind]
  return (
    <li className="timeline-item">
      <span className={`timeline-icon timeline-${entry.kind}`}>
        <Icon size={14} />
      </span>
      <div>
        <div className="row spread wrap">
          <h3>{entry.title}</h3>
          <time dateTime={entry.at}>{formatTime(entry.at, zone, true)}</time>
        </div>
        <p className="timeline-author">
          {author.name} · {author.team}
        </p>
        <p className="timeline-body">{entry.body}</p>
      </div>
    </li>
  )
}

export function TimelinePanel({
  state,
  incident,
  zone,
  run,
}: {
  state: DemoState
  incident: Incident
  zone: string
  run: (command: IncidentCommand) => boolean
}) {
  const [body, setBody] = useState('')
  return (
    <section className="panel section-panel" aria-labelledby="timeline-title">
      <div className="panel-heading">
        <h2 id="timeline-title">
          <Activity size={18} /> Shared timeline
        </h2>
        <span className="small muted">Newest first</span>
      </div>
      {incident.status === 'open' && (
        <form
          className="timeline-compose form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            if (run({ type: 'note', incidentId: incident.id, body })) setBody('')
          }}
        >
          <Field
            label="Add a team update"
            hint="Record a fact, decision, or handoff. Include the source of confirmed information."
          >
            {(id, hint) => (
              <textarea
                id={id}
                aria-describedby={hint}
                value={body}
                required
                maxLength={2000}
                placeholder="What should the next teammate know?"
                rows={2}
                onChange={(event) => setBody(event.target.value)}
              />
            )}
          </Field>
          <Button type="submit" variant="secondary">
            Add update
          </Button>
        </form>
      )}
      <ol className="timeline-list">
        {[...incident.timeline].reverse().map((entry) => (
          <TimelineItem key={entry.id} entry={entry} state={state} zone={zone} />
        ))}
      </ol>
    </section>
  )
}
