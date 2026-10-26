import { useState } from 'react'
import { Check, Send, Package } from 'lucide-react'
import type { Delivery, Incident, IncidentCommand } from '../models'
import { formatTime } from '../time'
import { Badge, Button, Field } from '../../../ui/primitives'

export function DeliveryPanel({
  deliveries,
  incident,
  zone,
  now,
  run,
}: {
  deliveries: Delivery[]
  incident: Incident
  zone: string
  now: string
  run: (command: IncidentCommand) => boolean
}) {
  const [message, setMessage] = useState('')
  const [recipient, setRecipient] = useState('pending')
  const pending = deliveries.filter(
    (delivery) => !incident.communications.some((item) => item.deliveryId === delivery.id),
  )
  const recipients =
    recipient === 'pending'
      ? pending.map((item) => item.id)
      : recipient === 'all'
        ? deliveries.map((item) => item.id)
        : [recipient]
  return (
    <section className="panel section-panel" aria-labelledby="deliveries-title">
      <div className="panel-heading">
        <h2 id="deliveries-title">
          <Package size={18} /> Affected deliveries{' '}
          <span className="count">{deliveries.length}</span>
        </h2>
        <Badge tone={pending.length ? 'amber' : 'green'}>{pending.length} awaiting update</Badge>
      </div>
      <div className="panel-intro">
        <p>
          Potential impact from linked reports and unfinished route stops. Delay and final outcomes
          are not yet verified.
        </p>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Affected deliveries table"
      >
        <table>
          <caption className="sr-only">
            Potentially affected deliveries and simulated customer communication status
          </caption>
          <thead>
            <tr>
              <th scope="col">Delivery / customer</th>
              <th scope="col">Business / area</th>
              <th scope="col">Window ends</th>
              <th scope="col">Customer update</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => {
              const updates = incident.communications.filter(
                (item) => item.deliveryId === delivery.id,
              )
              const last = updates.at(-1)
              const windowPassed = Date.parse(delivery.windowEnd) < Date.parse(now)
              return (
                <tr key={delivery.id}>
                  <td>
                    <strong className="mono">{delivery.id}</strong>
                    <span>{delivery.customer}</span>
                  </td>
                  <td>
                    <strong>{delivery.business}</strong>
                    <span>{delivery.address}</span>
                  </td>
                  <td>
                    <time dateTime={delivery.windowEnd}>
                      {formatTime(delivery.windowEnd, zone, true)}
                    </time>
                    {windowPassed && <span className="text-amber">Window passed · verify</span>}
                  </td>
                  <td>
                    {last ? (
                      <>
                        <span className="communication-done">
                          <Check size={13} /> Simulated update
                        </span>
                        <time className="muted small" dateTime={last.at}>
                          {formatTime(last.at, zone)}
                        </time>
                      </>
                    ) : (
                      <Badge tone="amber">Needs update</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={4}>No unfinished deliveries identified from the linked reports.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {incident.status === 'open' && deliveries.length > 0 && (
        <div className="panel-body communication-form">
          <div className="row spread">
            <h3>
              <Send size={16} /> Customer updates
            </h3>
            <span className="eyebrow">SUPPORT · SIMULATION</span>
          </div>
          <p className="muted small">
            Record communication separately from recovery. No external messages are sent.
          </p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault()
              if (
                run({
                  type: 'communicate',
                  incidentId: incident.id,
                  deliveryIds: recipients,
                  message,
                })
              )
                setMessage('')
            }}
          >
            <Field label="Recipients">
              {(id) => (
                <select
                  id={id}
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                >
                  <option value="pending">Customers awaiting an update ({pending.length})</option>
                  <option value="all">All affected customers ({deliveries.length})</option>
                  {deliveries.map((delivery) => (
                    <option key={delivery.id} value={delivery.id}>
                      {delivery.customer} · {delivery.id}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              label="Simulated customer message"
              hint="Describe only what is known. A proposal is still unconfirmed; avoid promising an arrival time."
            >
              {(id, hint) => (
                <textarea
                  id={id}
                  aria-describedby={hint}
                  required
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Your driver has reported a vehicle issue. Our team is coordinating the next steps. We’ll update you when arrangements are confirmed."
                  rows={3}
                />
              )}
            </Field>
            <div className="row spread wrap">
              <span className="small muted">
                {recipients.length} simulated {recipients.length === 1 ? 'recipient' : 'recipients'}
              </span>
              <Button type="submit" disabled={recipients.length === 0}>
                <Send size={15} /> Record simulated update
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
