import Nav from '@/components/Nav'
import Link from 'next/link'
import { getClients, getAllTrainingInfo, getTrainingStats } from '@/lib/obsidian'
import { getUpcomingEvents, isCalendarConnected } from '@/lib/calendar'
import type { CalendarEvent, TrainingStatus } from '@/lib/types'

const STATUS_BADGE: Record<TrainingStatus, { label: string; cls: string }> = {
  probehlo:  { label: '✅ Proběhl',  cls: 'bg-green-100 text-green-700' },
  zruseno:   { label: '❌ Zrušen',   cls: 'bg-red-100 text-red-700' },
  prelozeno: { label: '⏸ Přeložen', cls: 'bg-amber-100 text-amber-700' },
}

const PRAGUE_TZ = 'Europe/Prague'

function pragueDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: PRAGUE_TZ })
}

function formatEventTime(start: string): string {
  if (!start) return ''
  const allDay = start.length === 10
  const d = allDay ? new Date(start + 'T12:00:00Z') : new Date(start)
  return d.toLocaleDateString('cs-CZ', {
    timeZone: PRAGUE_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(allDay ? {} : { hour: '2-digit', minute: '2-digit' }),
  })
}

function isToday(start: string): boolean {
  const today = pragueDate(new Date())
  const eventDate = start.length === 10 ? start : pragueDate(new Date(start))
  return today === eventDate
}

function isTomorrow(start: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = pragueDate(tomorrow)
  const eventDate = start.length === 10 ? start : pragueDate(new Date(start))
  return tomorrowDate === eventDate
}

type Client = { name: string; slug: string; folder: string; trainingCount: number; lastTraining?: string }

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function matchClientToEvent(title: string, clients: Client[]): string | null {
  const normTitle = stripDiacritics(title)
  for (const c of clients) {
    const normName = stripDiacritics(c.name)
    const parts = normName.split(' ').filter(Boolean)
    // Match if title contains full name, or contains every word of the name
    if (normTitle.includes(normName) || parts.every((w) => normTitle.includes(w))) {
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
  const [clients, connected, events, trainingInfo, stats] = await Promise.all([
    getClients(),
    isCalendarConnected(),
    isCalendarConnected().then((c) => (c ? getUpcomingEvents(14) : [])),
    getAllTrainingInfo(),
    getTrainingStats(),
  ])

  const today = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {calendar === 'connected' && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
            Google Calendar byl úspěšně propojen.
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-0.5 capitalize text-sm">{today}</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Klienti</p>
            <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
            <Link href="/klienti" className="text-xs text-blue-500 hover:text-blue-600 mt-1 inline-block">Zobrazit →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Tento týden</p>
            <p className="text-3xl font-bold text-slate-900">{stats.thisWeek}</p>
            <p className="text-xs text-slate-400 mt-1">tréninků proběhlo</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Tento měsíc</p>
            <p className="text-3xl font-bold text-slate-900">{stats.thisMonth}</p>
            <p className="text-xs text-slate-400 mt-1">tréninků proběhlo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Nadcházející tréninky</h2>
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
              <div className="space-y-2">
                {(events as CalendarEvent[]).map((event) => {
                  const today_ = isToday(event.start)
                  const tomorrow_ = isTomorrow(event.start)
                  const eventDate = event.start.split('T')[0]
                  const matchedSlug = matchClientToEvent(event.title, clients)
                  const planInfo = matchedSlug ? trainingInfo.get(`${eventDate}:${matchedSlug}`) : undefined
                  const hasPlan = !!planInfo
                  const planClientSlug = planInfo?.slug
                  const trainingStatus = planInfo?.status

                  const href = hasPlan
                    ? `/klienti/${planClientSlug}/trenink/${eventDate}`
                    : matchedSlug
                    ? `/klienti/${matchedSlug}/trenink/novy?date=${eventDate}`
                    : `/klienti`

                  return (
                    <Link
                      key={event.id}
                      href={href}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 hover:shadow-md transition-all ${
                        today_
                          ? 'border-orange-200 bg-orange-50 hover:border-orange-300'
                          : 'bg-white border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div
                        className={`w-1 self-stretch rounded-full shrink-0 ${
                          today_ ? 'bg-orange-400' : tomorrow_ ? 'bg-blue-400' : 'bg-slate-200'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{event.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatEventTime(event.start)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
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
                        {hasPlan ? (
                          <>
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                              ✓ Plán
                            </span>
                            {trainingStatus && trainingStatus !== 'probehlo' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[trainingStatus].cls}`}>
                                {STATUS_BADGE[trainingStatus].label}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            Bez plánu
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
            <h2 className="text-base font-semibold text-slate-800 mb-3">Klienti</h2>
            <div className="space-y-2">
              {clients.map((client) => (
                <Link
                  key={client.slug}
                  href={`/klienti/${client.slug}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3 hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                    {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {client.trainingCount} tréninků
                      {client.lastTraining && ` · ${client.lastTraining}`}
                    </p>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-400 transition-colors text-sm shrink-0">→</span>
                </Link>
              ))}

              <Link
                href="/klienti"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2 font-medium"
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
