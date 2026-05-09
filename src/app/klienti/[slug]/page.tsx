import Nav from '@/components/Nav'
import Link from 'next/link'
import { getClientBySlug, getClientProfile, getClientTrainingDatesWithStatus } from '@/lib/obsidian'
import type { TrainingStatus } from '@/lib/types'
import { formatCzechDate } from '@/lib/markdown'
import { notFound } from 'next/navigation'
import ClientActions from '@/components/ClientActions'

const STATUS_BADGE: Record<TrainingStatus, { label: string; cls: string }> = {
  probehlo: { label: '✅ Proběhl', cls: 'bg-green-100 text-green-700' },
  zruseno:  { label: '❌ Zrušen',  cls: 'bg-red-100 text-red-700' },
  prelozeno: { label: '⏸ Přeložen', cls: 'bg-amber-100 text-amber-700' },
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-slate-800 mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-900 mb-3">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/^---$/gm, '<hr class="border-slate-200 my-4" />')
    .replace(
      /^\|(.+)\|$/gm,
      (line) => {
        const cells = line.split('|').slice(1, -1).map((c) => c.trim())
        const isSep = cells.every((c) => /^[-:]+$/.test(c))
        if (isSep) return ''
        const tag = cells.some((c) => c.startsWith('**')) ? 'th' : 'td'
        return `<tr>${cells.map((c) => `<${tag} class="px-3 py-1.5 text-sm text-slate-700 border border-slate-200">${c.replace(/\*\*/g, '')}</${tag}>`).join('')}</tr>`
      }
    )
    .replace(/(<tr>.*<\/tr>\n?)+/g, (m) => `<table class="border-collapse w-full my-3">${m}</table>`)
    .replace(/^- (.+)$/gm, '<li class="text-sm text-slate-700 ml-4 list-disc">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="space-y-1 my-2">${m}</ul>`)
    .replace(/\n\n/g, '<br/>')
}

export default async function KlientPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) notFound()

  const [profileContent, trainingDates] = await Promise.all([
    getClientProfile(client.folder),
    getClientTrainingDatesWithStatus(client.folder),
  ])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-2xl">
              {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <p className="text-slate-500 mt-0.5">{trainingDates.length} tréninků celkem</p>
              {trainingDates.length > 0 && (() => {
                const done = trainingDates.filter(t => t.status === 'probehlo').length
                const cancelled = trainingDates.filter(t => t.status === 'zruseno').length
                return (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {done > 0 && <span className="text-green-600 font-medium">{done} proběhlo</span>}
                    {done > 0 && cancelled > 0 && <span className="mx-1">·</span>}
                    {cancelled > 0 && <span className="text-red-500 font-medium">{cancelled} zrušeno</span>}
                  </p>
                )
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClientActions
              slug={slug}
              clientName={client.name}
              initialProfile={profileContent}
            />
            <Link
              href={`/klienti/${slug}/trenink/novy?date=${today}`}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              + Nový trénink
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Profile */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Profil klienta</h2>
            {profileContent ? (
              <div
                className="prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(profileContent) }}
              />
            ) : (
              <p className="text-slate-400 text-sm">Profil není k dispozici</p>
            )}
          </div>

          {/* Training history */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Historie tréninků</h2>
              {trainingDates.length === 0 ? (
                <p className="text-slate-400 text-sm">Žádné tréninky zatím</p>
              ) : (
                <div className="space-y-2">
                  {trainingDates.map(({ date, status }) => {
                    const badge = STATUS_BADGE[status]
                    return (
                      <Link
                        key={date}
                        href={`/klienti/${slug}/trenink/${date}`}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                            {date}
                          </p>
                          <p className="text-xs text-slate-400">{formatCzechDate(date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="text-slate-300 group-hover:text-blue-400 transition-colors text-sm">→</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
