import Nav from '@/components/Nav'
import Link from 'next/link'
import TrainingRecordClient from '@/components/TrainingRecordClient'
import TrainingStatusToggle from '@/components/TrainingStatusToggle'
import RegeneratePlanButton from '@/components/RegeneratePlanButton'
import { getClientBySlug, getTrainingMarkdown, getRecentExerciseHistory, getTrainingStatus } from '@/lib/obsidian'
import { parseTraining, formatCzechDate } from '@/lib/markdown'
import { getTrainingTimeForDate } from '@/lib/calendar'
import { notFound } from 'next/navigation'

export default async function TreninkPage({
  params,
}: {
  params: Promise<{ slug: string; date: string }>
}) {
  const { slug, date } = await params
  const client = await getClientBySlug(slug)
  if (!client) notFound()

  const markdown = await getTrainingMarkdown(client.folder, date)
  if (!markdown) notFound()

  const training = parseTraining(markdown, date)
  const [calendarTime, historyMap, trainingStatus] = await Promise.all([
    getTrainingTimeForDate(date),
    getRecentExerciseHistory(client.folder, date),
    getTrainingStatus(client.folder, date),
  ])
  const exerciseHistory = Object.fromEntries(historyMap)

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/klienti" className="hover:text-slate-600">Klienti</Link>
              <span>→</span>
              <Link href={`/klienti/${slug}`} className="hover:text-slate-600">{client.name}</Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{formatCzechDate(date)}</h1>
            {training.focus && (
              <p className="text-slate-500 mt-1">{training.focus}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/klienti/${slug}/trenink/${date}/tisk`}
              target="_blank"
              className="text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors"
            >
              Tisk / PDF
            </Link>
            <RegeneratePlanButton
              clientSlug={slug}
              clientName={client.name}
              date={date}
              currentDuration={training.duration || '60'}
            />
            <Link
              href={`/klienti/${slug}/trenink/novy?date=${date}`}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-xl transition-colors"
            >
              Upravit plán
            </Link>
          </div>
        </div>

        <div className="mb-5">
          <TrainingStatusToggle
            clientSlug={slug}
            date={date}
            initialStatus={trainingStatus}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(training.startTime || training.endTime || calendarTime.startTime) && (
            <span className="bg-orange-50 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
              🕐 {calendarTime.startTime || training.startTime}
              {(calendarTime.endTime || training.endTime)
                ? ` – ${calendarTime.endTime || training.endTime}`
                : ''}
            </span>
          )}
          {training.duration && (
            <span className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
              {training.duration} min
            </span>
          )}
          {training.dayName && (
            <span className="bg-slate-100 text-slate-600 text-sm px-3 py-1 rounded-full capitalize">
              {training.dayName}
            </span>
          )}
        </div>

        <TrainingRecordClient
          clientSlug={slug}
          training={training}
          calendarStartTime={calendarTime.startTime}
          calendarEndTime={calendarTime.endTime}
          exerciseHistory={exerciseHistory}
        />
      </div>
    </div>
  )
}
