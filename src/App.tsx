import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Inbox,
  LayoutList,
  RotateCcw,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { createDemo } from './demo/fixtures'
import { loadDemo, saveDemo } from './demo/persistence'
import type { IncidentCommand } from './features/incidents/models'
import {
  affectedDeliveries,
  applyCommand,
  isOverdue,
  linkedIncident,
  outstandingEssential,
} from './features/incidents/rules'
import { formatTime, ZONES } from './features/incidents/time'
import { ReportInbox } from './features/incidents/components/ReportInbox'
import { IncidentWorkspace } from './features/incidents/components/IncidentWorkspace'
import { Avatar, Badge, Button } from './ui/primitives'

export default function App() {
  const [loaded] = useState(() => loadDemo())
  const [state, setState] = useState(loaded.state)
  const [storageWarning, setStorageWarning] = useState(loaded.warning)
  const [view, setView] = useState<'inbox' | 'incidents'>(
    loaded.state.incidents.length ? 'incidents' : 'inbox',
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    loaded.state.incidents.find((item) => item.status === 'open')?.id ??
      loaded.state.incidents[0]?.id ??
      null,
  )
  const [actorId, setActorId] = useState('maya')
  const [zone, setZone] = useState('America/Chicago')
  const [now, setNow] = useState(new Date().toISOString())
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [resetCount, setResetCount] = useState(0)
  const contentRef = useRef<HTMLElement>(null)
  const previousView = useRef(`${view}/${selectedId}`)
  const actor = state.teammates.find((person) => person.id === actorId) ?? state.teammates[0]
  const unlinked = state.reports.filter((report) => !linkedIncident(state, report.id)).length
  const active = state.incidents.filter((incident) => incident.status === 'open')
  const overdue = active
    .flatMap((incident) => incident.actions)
    .filter((action) => isOverdue(action, now)).length
  const selected = state.incidents.find((incident) => incident.id === selectedId)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date().toISOString()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  // Move keyboard focus to the new view; in-place actions retain focus and announce feedback.
  useEffect(() => {
    const current = `${view}/${selectedId}`
    if (previousView.current !== current) contentRef.current?.focus()
    previousView.current = current
  }, [view, selectedId])

  function openIncident(id: string) {
    setSelectedId(id)
    setView('incidents')
  }
  function run(command: IncidentCommand) {
    const result = applyCommand(state, command, {
      actorId: actor.id,
      now: new Date().toISOString(),
      id: crypto.randomUUID().slice(0, 8).toUpperCase(),
    })
    if (!result.ok) {
      setError(result.error)
      setFeedback('')
      return false
    }
    setState(result.state)
    setStorageWarning(saveDemo(result.state))
    setFeedback(result.feedback)
    setError('')
    setNow(new Date().toISOString())
    if (command.type === 'create' || command.type === 'link') openIncident(result.incidentId)
    return true
  }
  function resetDemo() {
    if (
      !window.confirm(
        'Reset the demo? This removes all local incident changes and restores the two starting reports.',
      )
    )
      return
    const fresh = createDemo()
    setState(fresh)
    setResetCount((count) => count + 1)
    setStorageWarning(saveDemo(fresh))
    setView('inbox')
    setSelectedId(null)
    setActorId('maya')
    setNow(new Date().toISOString())
    setError('')
    setFeedback('Demo reset. Start with Daniel’s driver report.')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#main-content"
          aria-label="Vamo Incident Desk home"
          onClick={() => {
            setView('inbox')
            setSelectedId(null)
          }}
        >
          vamo<span>↗</span>
        </a>
        <div className="workspace-label">
          <span className="workspace-symbol">
            <Activity size={17} />
          </span>
          <div>
            <strong>Incident desk</strong>
            <span>Support + Operations</span>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          <button
            className={view === 'inbox' ? 'nav-item active' : 'nav-item'}
            aria-current={view === 'inbox' ? 'page' : undefined}
            onClick={() => {
              setView('inbox')
              setSelectedId(null)
            }}
          >
            <Inbox size={18} /> Reports <span className="nav-count">{unlinked}</span>
          </button>
          <button
            className={view === 'incidents' ? 'nav-item active' : 'nav-item'}
            aria-current={view === 'incidents' ? 'page' : undefined}
            onClick={() => {
              setView('incidents')
              setSelectedId(null)
            }}
          >
            <LayoutList size={18} /> Incidents <span className="nav-count">{active.length}</span>
          </button>
        </nav>
        <div className="sidebar-context">
          <div className="row">
            <Users size={15} />
            <strong>One shared response</strong>
          </div>
          <p>Reports, recovery, and communication. Ready for the next shift.</p>
          <div className="team-avatars">
            {state.teammates.map((person) => (
              <Avatar key={person.id} name={person.name} small />
            ))}
            <span>Austin · Bogotá · Manila</span>
          </div>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setShowHelp((value) => !value)}>
            <CircleHelp size={16} /> About this prototype
          </button>
          <button onClick={resetDemo}>
            <RotateCcw size={16} /> Reset demo
          </button>
          <div className="local-status">
            <span /> Local demo · browser only
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Incident desk</strong>
          </div>
          <div className="topbar-controls">
            <label className="timezone-control">
              <span>Display time</span>
              <select
                aria-label="Display time zone"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
              >
                {ZONES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} · {formatTime(now, item.value).split(' ').at(-1)}
                  </option>
                ))}
              </select>
            </label>
            <div className="topbar-divider" />
            <label className="actor-control">
              <Avatar name={actor.name} small />
              <span>
                <span className="actor-caption">Acting as · demo</span>
                <select
                  aria-label="Acting teammate"
                  value={actor.id}
                  onChange={(event) => setActorId(event.target.value)}
                >
                  {state.teammates.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} · {person.team}
                    </option>
                  ))}
                </select>
              </span>
              <ChevronDown size={13} aria-hidden="true" />
            </label>
          </div>
        </header>
        <div className="demo-strip">
          <Shield size={13} />
          <span>PROTOTYPE</span> Fictional data. Communications are simulated. Changes stay in this
          browser; no shared live sync.
        </div>
        <main id="main-content" ref={contentRef} tabIndex={-1}>
          {showHelp && (
            <section className="help-panel panel">
              <div className="row spread">
                <h2>How to try Incident Desk</h2>
                <Button
                  variant="ghost"
                  aria-label="Close prototype help"
                  onClick={() => setShowHelp(false)}
                >
                  <X size={17} />
                </Button>
              </div>
              <p>
                Start in Reports with Daniel’s breakdown. Create an incident, review the six
                potentially affected deliveries, and link Avery’s call. Save a recovery proposal,
                record its confirmation, and record simulated customer updates. Complete the driver
                verification action with a note, then record an outcome and resolve.
              </p>
              <p>
                Use “Acting as” to simulate a teammate continuing the work. This changes attribution
                only; it provides no authentication or permissions. Reset demo restores the starting
                state. All action times are saved as UTC and displayed in your selected zone.
              </p>
            </section>
          )}
          {storageWarning && (
            <div className="alert alert-warning" role="alert">
              {storageWarning}
            </div>
          )}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={feedback ? 'feedback' : 'sr-only'}
          >
            {feedback && (
              <>
                <CheckCircle2 size={16} />
                <span>{feedback}</span>
                <button aria-label="Dismiss feedback" onClick={() => setFeedback('')}>
                  <X size={15} />
                </button>
              </>
            )}
          </div>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
              <Button variant="ghost" onClick={() => setError('')} aria-label="Dismiss error">
                <X size={15} />
              </Button>
            </div>
          )}
          {view === 'inbox' ? (
            <ReportInbox
              key={resetCount}
              state={state}
              now={now}
              zone={zone}
              run={run}
              openIncident={openIncident}
            />
          ) : selected ? (
            <IncidentWorkspace
              key={selected.id}
              state={state}
              incident={selected}
              now={now}
              zone={zone}
              run={run}
              back={() => setSelectedId(null)}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SHARED RESPONSE</p>
                  <h1>Delivery incidents</h1>
                  <p className="muted">See the impact. Know the owner. Keep the next step clear.</p>
                </div>
                <Button variant="secondary" onClick={() => setView('inbox')}>
                  <Inbox size={16} /> Review reports
                </Button>
              </div>
              <div className="incident-counts">
                <span>
                  <i className="dot-amber" />
                  {active.length} open
                </span>
                <span>
                  <CheckCircle2 size={15} />
                  {state.incidents.length - active.length} resolved
                </span>
                <span className={overdue ? 'text-red' : ''}>
                  <Activity size={15} />
                  {overdue} overdue follow-ups
                </span>
              </div>
              {state.incidents.length === 0 ? (
                <section className="panel empty-state">
                  <div className="empty-icon">
                    <LayoutList size={28} />
                  </div>
                  <h2>No incidents yet</h2>
                  <p>
                    A driver has reported a breakdown with six deliveries remaining. Start with that
                    report to coordinate a response.
                  </p>
                  <Button onClick={() => setView('inbox')}>
                    Review driver report <ArrowRight size={16} />
                  </Button>
                </section>
              ) : (
                <div className="incident-cards">
                  {state.incidents.map((incident) => {
                    const owner = state.teammates.find((person) => person.id === incident.ownerId)!
                    const late = incident.actions.filter((action) => isOverdue(action, now)).length
                    return (
                      <button
                        className="panel incident-card"
                        key={incident.id}
                        onClick={() => openIncident(incident.id)}
                      >
                        <div className="row spread">
                          <span className="mono small muted">{incident.id}</span>
                          <Badge tone={incident.status === 'resolved' ? 'green' : 'amber'}>
                            {incident.status === 'resolved' ? 'Resolved' : 'Open'}
                          </Badge>
                        </div>
                        <h2>{incident.title}</h2>
                        <p>
                          {affectedDeliveries(state, incident).length} potentially affected
                          deliveries · {incident.reportIds.length} linked reports
                        </p>
                        <div className="row spread wrap">
                          <div className="row">
                            <Avatar name={owner.name} small />
                            <span>{owner.name}</span>
                          </div>
                          <span className={late ? 'text-red small' : 'muted small'}>
                            {late
                              ? `${late} overdue follow-ups`
                              : `${outstandingEssential(incident).length} essential actions open`}{' '}
                            <ArrowRight size={14} />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              Incident Desk <span className="muted">/</span> Vamo Delivery assessment
            </span>
            <span>Earlier intervention from known reports.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
