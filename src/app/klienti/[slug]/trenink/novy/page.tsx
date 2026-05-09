import Nav from '@/components/Nav'
import TrainingFormClient from '@/components/TrainingFormClient'
import { getClientBySlug, getRecentExerciseHistory } from '@/lib/obsidian'
import { getDefaultSections } from '@/lib/markdown'
import { getTrainingTimeForDate } from '@/lib/calendar'
import { notFound } from 'next/navigation'

export default async function NovyTreninkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { slug } = await params
  const { date } = await searchParams

  const client = await getClientBySlug(slug)
  if (!client) notFound()

  const today = date || new Date().toISOString().split('T')[0]
  const d = new Date(today + 'T12:00:00')
  const DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']
  const dayName = DAYS[d.getDay()]

  const [calendarTime, historyMap] = await Promise.all([
    getTrainingTimeForDate(today),
    getRecentExerciseHistory(client.folder, today),
  ])

  const exerciseHistory = Object.fromEntries(historyMap)

  function calcDuration(start: string, end: string): string {
    if (!start || !end) return '60'
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const mins = eh * 60 + em - (sh * 60 + sm)
    return mins > 0 ? String(mins) : '60'
  }

  const initialTraining = {
    date: today,
    dayName,
    focus: '',
    duration: calcDuration(calendarTime.startTime, calendarTime.endTime),
    startTime: calendarTime.startTime,
    endTime: calendarTime.endTime,
    sections: getDefaultSections(),
    trainerNotes: '',
    progression: '',
  }

  const timeStr = calendarTime.startTime
    ? `${calendarTime.startTime}${calendarTime.endTime ? ` – ${calendarTime.endTime}` : ''}`
    : ''

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Nový trénink</h1>
          <p className="text-slate-500 mt-1">{client.name}</p>
          {timeStr && (
            <span className="inline-block mt-2 bg-orange-50 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
              🕐 {timeStr}
            </span>
          )}
        </div>
        <TrainingFormClient
          clientSlug={slug}
          clientName={client.name}
          initialTraining={initialTraining}
          isNew={true}
          exerciseHistory={exerciseHistory}
        />
      </div>
    </div>
  )
}
