import Nav from '@/components/Nav'
import Link from 'next/link'
import { getClients, getAllTrainingInfo } from '@/lib/obsidian'
import { getUpcomingEvents, isCalendarConnected } from '@/lib/calendar'
import type { CalendarEvent } from '@/lib/types'

function formatEventTime(start: string): string {
  if (!start) return ''
  if (start.length === 10) {
    const d = new Date(start + 'T12:00:00')
    return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const d = new Date(start)
  return d.toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isToday(start: string): boolean {
  const today = new Date().toDateString()
  const eventDate = new Date(start.length === 10 ? start + 'T12:00:00' : start).toDateString()
  return today === eventDate
}

function isTomorrow(start: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const eventDate = new Date(start.length === 10 ? start + 'T12:00:00' : start).toDateString()
  return tomorrow.toDateString() === eventDate
}

type Client = { name: string; slug: string; folder: string; trainingCount: number; lastTraining?: string }

function matchClientToEvent(title: string, clients: Client[]): string | null {
  const lc = title.toLowerCase()
  for (const c of clients) {
    const nameLc = c.name.toLowerCase()
    const nameParts = nameLc.split(' ').filter(Boolean)
    if (lc.includes(nameLc) || nameParts.every((w) => lc.includes(w))) {
      return c.slug
    }
  }
  return null
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>
}) {
  const { calendar } = await searchParams
  const [clients, connected, events, trainingInfo] = await Promise.all([
    getClients(),
    isCalendarConnected(),
    isCalendarConnected().then((c) => (c ? getUpcomingEvents(14) : [])),
    getAllTrainingInfo(),
  ])

  const today = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {calendar === 'connected' && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
            Google Calendar byl úspěšně propojen.
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 capitalize">{today}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Nadcházející tréninky</h2>
              {!connected && (
                <a
                  href="/api/auth/google"
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Propojit Google Calendar
                </a>
              )}
            </div>

            {!connected ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-slate-600 font-medium">Google Calendar není propojen</p>
                <p className="text-slate-400 text-sm mt-1 mb-4">
                  Propojte kalendář pro zobrazení nadcházejících tréninků
                </p>
                <a
                  href="/api/auth/google"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Propojit Google Calendar
                </a>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-slate-600 font-medium">Žádné nadcházející události</p>
                <p className="text-slate-400 text-sm mt-1">Příštích 14 dní je volných</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(events as CalendarEvent[]).map((event) => {
                  const today_ = isToday(event.start)
                  const tomorrow_ = isTomorrow(event.start)
                  const eventDate = event.start.split('T')[0]
                  const planClientSlug = trainingInfo.get(eventDate)
                  const hasPlan = !!planClientSlug
                  const matchedSlug = !hasPlan ? matchClientToEvent(event.title, clients) : null

                  const href = hasPlan
                    ? `/klienti/${planClientSlug}/trenink/${eventDate}`
                    : matchedSlug
                    ? `/klienti/${matchedSlug}/trenink/novy?date=${eventDate}`
                    : `/klienti`

                  return (
                    <Link
                      key={event.id}
                      href={href}
                      className={`block bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-all ${
                        today_ ? 'border-orange-200 bg-orange-50 hover:border-orange-300' : 'border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div
                        className={`w-1.5 self-stretch rounded-full mt-0.5 shrink-0 ${
                          today_ ? 'bg-orange-400' : tomorrow_ ? 'bg-blue-400' : 'bg-slate-200'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatEventTime(event.start)}</p>
                        {event.location && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{event.location}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {hasPlan ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            ✓ Plán
                          </span>
                        ) : (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            Bez plánu
                          </span>
                        )}
                        {today_ && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                            Dnes
                          </span>
                        )}
                        {tomorrow_ && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            Zítra
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Clients column */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Klienti</h2>
            <div className="space-y-3">
              {clients.map((client) => (
                <Link
                  key={client.slug}
                  href={`/klienti/${client.slug}`}
                  className="block bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {client.trainingCount} tréninků
                        {client.lastTraining && ` · poslední ${client.lastTraining}`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              <Link
                href="/klienti"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
              >
                Všichni klienti →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
