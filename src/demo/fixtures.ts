import type { Delivery, DemoState } from '../features/incidents/models'

// Relative seed times keep the walkthrough useful whenever a reviewer opens it.
export function createDemo(now = new Date()): DemoState {
  const time = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString()
  return {
    version: 1,
    teammates: [
      { id: 'maya', name: 'Maya Chen', team: 'Support', location: 'Austin' },
      { id: 'lina', name: 'Lina Torres', team: 'Operations', location: 'Bogotá' },
      { id: 'sam', name: 'Sam Reyes', team: 'Support', location: 'Manila' },
    ],
    reports: [
      {
        id: 'RPT-1042',
        channel: 'Text',
        sender: 'Daniel Brooks',
        role: 'Driver',
        summary: 'Van broke down. Six deliveries remaining.',
        body: 'My van stalled on E 7th near Pleasant Valley. I’m safely pulled over. Six stops left on ATX-204. Cargo is secure, but I can’t continue. Can someone arrange a transfer?',
        receivedAt: time(-12),
        driverId: 'DRV-28',
        routeId: 'ATX-204',
      },
      {
        id: 'RPT-1043',
        channel: 'Call note',
        sender: 'Avery Johnson',
        role: 'Customer',
        summary: 'Calling for an update on delivery ATX-1842.',
        body: 'Customer called to ask whether their order will arrive within the delivery window. Tracking hasn’t changed. They’re available at the delivery address and would like an update.',
        receivedAt: time(-4),
        deliveryId: 'ATX-1842',
      },
    ],
    deliveries: [
      {
        id: 'ATX-1842',
        customer: 'Avery Johnson',
        business: 'Juniper Market',
        address: 'East Cesar Chavez',
        windowEnd: time(8),
      },
      {
        id: 'ATX-1843',
        customer: 'Noah Williams',
        business: 'Juniper Market',
        address: 'Holly',
        windowEnd: time(18),
      },
      {
        id: 'ATX-1844',
        customer: 'Sofia Martinez',
        business: 'Juniper Market',
        address: 'Govalle',
        windowEnd: time(28),
      },
      {
        id: 'ATX-1845',
        customer: 'Ethan Kim',
        business: 'Local Table',
        address: 'Mueller',
        windowEnd: time(38),
      },
      {
        id: 'ATX-1846',
        customer: 'Isabella Davis',
        business: 'Local Table',
        address: 'Cherrywood',
        windowEnd: time(48),
      },
      {
        id: 'ATX-1847',
        customer: 'Leo Garcia',
        business: 'Local Table',
        address: 'Windsor Park',
        windowEnd: time(58),
      },
    ]
      .map<Delivery>((delivery) => ({
        ...delivery,
        routeId: 'ATX-204',
        driverId: 'DRV-28',
        status: 'In transit',
      }))
      .concat([
        {
          id: 'ATX-1841',
          customer: 'Mia Wilson',
          business: 'Juniper Market',
          address: 'Downtown',
          windowEnd: time(-30),
          routeId: 'ATX-204',
          driverId: 'DRV-28',
          status: 'Delivered',
        },
        {
          id: 'ATX-1901',
          customer: 'Oliver Lee',
          business: 'Local Table',
          address: 'Zilker',
          windowEnd: time(45),
          routeId: 'ATX-205',
          driverId: 'DRV-31',
          status: 'In transit',
        },
      ]),
    incidents: [],
  }
}
