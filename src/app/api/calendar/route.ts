import { getUpcomingEvents, isCalendarConnected } from '@/lib/calendar'

export async function GET() {
  const connected = await isCalendarConnected()
  if (!connected) {
    return Response.json({ connected: false, events: [] })
  }

  try {
    const events = await getUpcomingEvents(14)
    return Response.json({ connected: true, events })
  } catch (err) {
    return Response.json({ connected: false, events: [], error: String(err) })
  }
}
