'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Training, TrainingSection } from '@/lib/types'

interface Props {
  clientSlug: string
  clientName: string
  date: string
  currentDuration: string
  onClose: () => void
}

const SECTION_COLORS = [
  { border: 'border-blue-200',   header: 'bg-blue-50',    text: 'text-blue-800'    },
  { border: 'border-emerald-200', header: 'bg-emerald-50', text: 'text-emerald-800' },
  { border: 'border-violet-200', header: 'bg-violet-50',  text: 'text-violet-800'  },
  { border: 'border-amber-200',  header: 'bg-amber-50',   text: 'text-amber-800'   },
  { border: 'border-rose-200',   header: 'bg-rose-50',    text: 'text-rose-800'    },
  { border: 'border-cyan-200',   header: 'bg-cyan-50',    text: 'text-cyan-800'    },
]

export default function RegeneratePlanModal({
  clientSlug,
  clientName,
  date,
  currentDuration,
  onClose,
}: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [stage, setStage] = useState<'input' | 'loading' | 'preview'>('input')
  const [preview, setPreview] = useState<Training | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setStage('loading')
    setError('')
    try {
      const res = await fetch('/api/ai/generuj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSlug,
          trainingDate: date,
          customPrompt: notes,
          duration: currentDuration,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chyba AI')
      setPreview({ ...data.training, date, status: undefined })
      setStage('preview')
    } catch (e) {
      setError(String(e))
      setStage('input')
    }
  }

  async function handleSave() {
    if (!preview) return
    setIsSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/klienti/${clientSlug}/treninky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training: { ...preview, date } }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Chyba při ukládání')
      }
      router.refresh()
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setIsSaving(false)
    }
  }

  const totalExercises = preview?.sections.reduce(
    (sum, s) => sum + s.exercises.filter((e) => e.name).length,
    0
  ) ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Přegenerovat plán</h2>
            <p className="text-sm text-slate-400 mt-0.5">{clientName} · {date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stage === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                AI vygeneruje nový tréninkový plán na základě profilu klienta a předchozích tréninků.
                Stávající plán bude přepsán.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Poznámky pro AI
                  <span className="font-normal text-slate-400 ml-1">(volitelné)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder={'Příklady:\n• Trénink je na 2 hodiny, přidej více cviků\n• Zaměř se více na horní část těla\n• Vynech cviky na kolena'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">AI generuje nový plán…</p>
            </div>
          )}

          {stage === 'preview' && preview && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-4 text-sm">
                <span className="text-slate-600 font-medium">{preview.focus || 'Bez zaměření'}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{preview.sections.length} sekcí</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{totalExercises} cviků</span>
                {preview.duration && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{preview.duration} min</span>
                  </>
                )}
              </div>

              {/* Sections */}
              {(preview.sections as TrainingSection[]).map((section, sIdx) => {
                const color = SECTION_COLORS[sIdx % SECTION_COLORS.length]
                const exercises = section.exercises.filter((e) => e.name)
                return (
                  <div key={sIdx} className={`rounded-xl border ${color.border} overflow-hidden`}>
                    <div className={`px-4 py-2 ${color.header}`}>
                      <p className={`font-semibold text-sm ${color.text}`}>{section.title}</p>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {exercises.map((ex, eIdx) => (
                        <div key={eIdx} className="px-4 py-2 flex items-baseline gap-3">
                          <span className="text-xs text-slate-300 w-4 shrink-0">{eIdx + 1}.</span>
                          <span className="text-sm text-slate-800 flex-1 font-medium">{ex.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">
                            {[ex.sets && `${ex.sets} sérií`, ex.reps, ex.weight].filter(Boolean).join(' × ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {preview.trainerNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Trenérské poznámky</p>
                  <p className="text-sm text-amber-900">{preview.trainerNotes}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 gap-3">
          {stage === 'preview' ? (
            <>
              <button
                onClick={() => setStage('input')}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Upravit instrukce
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl transition-colors"
                >
                  {isSaving ? 'Ukládám…' : '💾 Uložit nový plán'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={handleGenerate}
                disabled={stage === 'loading'}
                className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-2"
              >
                {stage === 'loading' ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generuji…
                  </>
                ) : '🤖 Přegenerovat'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
