export const ZONES = [
  { value: 'America/Chicago', label: 'Austin' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'Asia/Manila', label: 'Manila' },
  { value: 'UTC', label: 'UTC' },
]

export function formatTime(iso: string, zone: string, withDate = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(withDate ? ({ month: 'short', day: 'numeric' } as const) : {}),
  }).format(new Date(iso))
}

export function relativeTime(iso: string, now: string) {
  const minutes = Math.floor((Date.parse(now) - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / 1440)}d ago`
}
