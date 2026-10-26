export type Team = 'Operations' | 'Support'
export interface Teammate {
  id: string
  name: string
  team: Team
  location: string
}
export interface Report {
  id: string
  channel: 'Text' | 'Call note'
  sender: string
  role: 'Driver' | 'Customer'
  summary: string
  body: string
  receivedAt: string
  driverId?: string
  routeId?: string
  deliveryId?: string
}
export interface Delivery {
  id: string
  routeId: string
  driverId: string
  customer: string
  business: string
  address: string
  windowEnd: string
  status: 'In transit' | 'Delivered'
}
export interface NextAction {
  id: string
  title: string
  ownerId: string
  dueAt: string
  essential: boolean
  kind: 'recovery' | 'communication' | 'manual'
  status: 'open' | 'completed' | 'cancelled'
  closingNote?: string
}
export interface Recovery {
  detail: string
  status: 'proposed' | 'confirmed'
  confirmation?: string
}
export interface Communication {
  id: string
  deliveryId: string
  message: string
  authorId: string
  at: string
}
export interface TimelineEntry {
  id: string
  kind: 'report' | 'recovery' | 'communication' | 'action' | 'note' | 'resolved'
  title: string
  body: string
  authorId: string
  at: string
}
export interface Incident {
  id: string
  title: string
  status: 'open' | 'resolved'
  ownerId: string
  reportIds: string[]
  actions: NextAction[]
  communications: Communication[]
  timeline: TimelineEntry[]
  recovery?: Recovery
  outcome?: string
  createdAt: string
}
export interface DemoState {
  version: 1
  reports: Report[]
  deliveries: Delivery[]
  incidents: Incident[]
  teammates: Teammate[]
}
export type IncidentCommand =
  | { type: 'create'; reportId: string; title: string; ownerId: string }
  | { type: 'link'; incidentId: string; reportId: string }
  | { type: 'assign'; incidentId: string; ownerId: string }
  | { type: 'propose'; incidentId: string; detail: string }
  | { type: 'confirm'; incidentId: string; confirmation: string }
  | { type: 'communicate'; incidentId: string; deliveryIds: string[]; message: string }
  | {
      type: 'add-action'
      incidentId: string
      title: string
      ownerId: string
      dueAt: string
      essential: boolean
    }
  | {
      type: 'close-action'
      incidentId: string
      actionId: string
      status: 'completed' | 'cancelled'
      note: string
    }
  | { type: 'note'; incidentId: string; body: string }
  | { type: 'resolve'; incidentId: string; outcome: string }

export interface CommandContext {
  actorId: string
  now: string
  id: string
}
export type CommandResult =
  | { ok: true; state: DemoState; incidentId: string; feedback: string }
  | { ok: false; error: string }
