# Loom walkthrough — target 3–5 minutes

Reset the demo before recording. Prepare short example text so typing does not dominate the recording. Use actual displayed time zones rather than inventing an arrival promise.

**0:00–0:35 — Problem and decision**

“Reports arrive as texts and calls. I focused on bringing those reports into one shared incident, so the first report helps the team see the wider impact and coordinate a response.” Point out the local demo and simulation label. Explain the Support/Operations assumption.

**0:35–1:15 — From one report to wider impact**

Show Daniel’s selected breakdown report and create the incident. Point to six potentially affected deliveries. Explain that these are unfinished deliveries from known route data; the prototype does not claim prediction or confirmed delay. Read Avery’s related call note and link it. The delivery count stays six.

**1:15–2:10 — Recovery without false certainty**

Switch **Acting as** to Lina in Operations. Save this example proposal:

> Ask Alex to collect the six orders from Daniel at E 7th & Pleasant Valley. Transfer timing is still to be agreed.

Point out that the proposal is unconfirmed. Record a fictional confirmation:

> Alex and Daniel confirmed by phone: Alex can take all six orders and meet at the reported breakdown location. Both agreed to the transfer arrangement.

Confirm the arrangement. Explain that this closes the arrangement action, not the whole incident, and does not mark deliveries complete.

**2:10–2:50 — Communication and continuity**

Switch to Maya in Support. Record a simulated customer update:

> Your driver reported a vehicle issue. A replacement driver has agreed to take over your order. We will share updated arrival timing after the transfer is verified.

Show the six communication statuses changing independently of recovery. Show the timeline’s teammate attribution and time zones. Optionally switch to Sam to illustrate how the next shift can read the same local demo context; explicitly acknowledge there is no real multi-user sync.

**2:50–3:40 — Close the loop**

Show that resolution remains blocked by driver verification. Complete the remaining action with a fictional verification note:

> Daniel and Alex confirmed by phone that the cargo transfer is complete and all six orders are accounted for. Alex is continuing the route.

Record an outcome:

> Cargo transferred to Alex and affected customers updated. Alex is continuing the route. Final delivery arrival times remain unverified; no delivery has been automatically marked complete.

Resolve the incident. Show the retained outcome and history. Mention that cancellation requires a reason; keep this as a brief explanation rather than adding a second full scenario.

**3:40–4:20 — Engineering and next steps**

Briefly explain pure business rules, explicit types, isolated mock persistence, and tests for linking, impact, confirmation, and resolution. Mention browser-local state as a deliberate prototype tradeoff. With another week, validate the workflow with operators before building shared state and real integrations. Do not claim measured results.
