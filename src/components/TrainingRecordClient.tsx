'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Training } from '@/lib/types'

type ExerciseHistory = Record<string, { sets: string; reps: string; weight: string }>

interface ActualExercise {
  completed: boolean
  sets: string
  reps: string
  weight: string
  notes: string
}

type ReplacePanel = {
  sectionId: string
  exId: string
  exName: string
  sectionTitle: string
  suggestions: { name: string; reason: string }[]
  loading: boolean
}

interface Props {
  clientSlug: string
  training: Training
  calendarStartTime: string
  calendarEndTime: string
  exerciseHistory: ExerciseHistory
}

function formatLast(h: { sets: string; reps: string; weight: string }): string {
  const parts: string[] = []
  if (h.sets && h.reps) parts.push(`${h.sets}×${h.reps}`)
  else if (h.sets) parts.push(h.sets)
  else if (h.reps) parts.push(h.reps)
  if (h.weight) parts.push(h.weight)
  return parts.join(' / ')
}

function buildActuals(plan: Training): Record<string, ActualExercise> {
  const map: Record<string, ActualExercise> = {}
  for (const section of plan.sections) {
    for (const ex of section.exercises) {
      map[ex.id] = {
        completed: ex.completed,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        notes: ex.notes,
      }
    }
  }
  return map
}

export default function TrainingRecordClient({
  clientSlug,
  training: plan,
  calendarStartTime,
  calendarEndTime,
  exerciseHistory,
}: Props) {
  const router = useRouter()

  // Pre-fill from saved plan values so data is visible on page reload
  const [actuals, setActuals] = useState<Record<string, ActualExercise>>(() => buildActuals(plan))

  const [startTime, setStartTime] = useState(calendarStartTime || plan.startTime || '')
  const [endTime, setEndTime] = useState(calendarEndTime || plan.endTime || '')
  const [trainerNotes, setTrainerNotes] = useState(plan.trainerNotes || '')
  const [progression, setProgression] = useState(plan.progression || '')
  const [renames, setRenames] = useState<Record<string, string>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [replacePanel, setReplacePanel] = useState<ReplacePanel | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // After router.refresh(), the plan prop gets new exercise IDs (uid() is called again
  // in parseTraining). Re-sync actuals with the new IDs so inputs stay populated.
  useEffect(() => {
    setActuals(buildActuals(plan))
    setRenames({})
    setSkipped(new Set())
    setStartTime(calendarStartTime || plan.startTime || '')
    setEndTime(calendarEndTime || plan.endTime || '')
    setTrainerNotes(plan.trainerNotes || '')
    setProgression(plan.progression || '')
  }, [plan, calendarStartTime, calendarEndTime])

  function updateActual(exId: string, field: keyof ActualExercise, value: string | boolean) {
    setActuals((prev) => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }))
  }

  function openYouTube(name: string) {
    if (!name.trim()) return
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise')}`, '_blank')
  }

  function buildTraining(opts: { renames?: Record<string, string>; skipped?: Set<string> } = {}): Training {
    const r = opts.renames ?? renames
    const s = opts.skipped ?? skipped
    return {
      ...plan,
      startTime,
      endTime,
      trainerNotes,
      progression,
      sections: plan.sections.map((section) => ({
        ...section,
        exercises: section.exercises
          .filter((ex) => !s.has(ex.id))
          .map((ex) => {
            const actual = actuals[ex.id] || { completed: false, sets: '', reps: '', weight: '', notes: '' }
            return {
              ...ex,
              name: r[ex.id] || ex.name,
              completed: actual.completed,
              sets: actual.sets || ex.sets,
              reps: actual.reps || ex.reps,
              weight: actual.weight || ex.weight,
              notes: actual.notes || ex.notes,
            }
          }),
      })),
    }
  }

  async function persistTraining(t: Training): Promise<void> {
    const res = await fetch(`/api/klienti/${clientSlug}/treninky`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training: t }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Nepodařilo se uložit záznam')
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    setSaved(false)
    try {
      await persistTraining(buildTraining())
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(String(e))
    } finally {
      setIsSaving(false)
    }
  }

  async function fetchAlternatives(panel: Omit<ReplacePanel, 'suggestions' | 'loading'>) {
    setReplacePanel({ ...panel, suggestions: [], loading: true })
    try {
      const res = await fetch('/api/ai/nahrad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName: panel.exName, sectionTitle: panel.sectionTitle, clientSlug }),
      })
      const data = await res.json()
      if (!res.ok || !data.suggestions) throw new Error(data.error || 'Chyba')
      setReplacePanel((p) => p ? { ...p, suggestions: data.suggestions, loading: false } : p)
    } catch {
      setError('Nepodařilo se načíst alternativy')
      setReplacePanel(null)
    }
  }

  function openReplacePanel(sectionId: string, exId: string, exName: string, sectionTitle: string) {
    if (replacePanel?.exId === exId) { setReplacePanel(null); return }
    fetchAlternatives({ sectionId, exId, exName, sectionTitle })
  }

  async function selectAlternative(exId: string, name: string) {
    const newRenames = { ...renames, [exId]: name }
    setRenames(newRenames)
    setReplacePanel(null)
    try {
      await persistTraining(buildTraining({ renames: newRenames }))
    } catch (e) {
      setError(String(e))
    }
  }

  async function skipExercise(exId: string) {
    const newSkipped = new Set(skipped)
    newSkipped.add(exId)
    setSkipped(newSkipped)
    setReplacePanel(null)
    try {
      await persistTraining(buildTraining({ skipped: newSkipped }))
    } catch (e) {
      setError(String(e))
    }
  }

  const SECTION_COLORS = [
    { bg: 'bg-blue-50',    header: 'bg-blue-100',   border: 'border-blue-200',   text: 'text-blue-800'   },
    { bg: 'bg-emerald-50', header: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-800' },
    { bg: 'bg-violet-50',  header: 'bg-violet-100',  border: 'border-violet-200',  text: 'text-violet-800'  },
    { bg: 'bg-amber-50',   header: 'bg-amber-100',   border: 'border-amber-200',   text: 'text-amber-800'   },
    { bg: 'bg-rose-50',    header: 'bg-rose-100',    border: 'border-rose-200',    text: 'text-rose-800'    },
    { bg: 'bg-cyan-50',    header: 'bg-cyan-100',    border: 'border-cyan-200',    text: 'text-cyan-800'    },
  ]

  const inputCls =
    'border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400 bg-white w-full'

  const gridCols = '28px 1fr 52px 52px 72px 1fr 90px 28px 28px'

  return (
    <div className="space-y-4">
      {/* Time fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Od</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Do</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Exercise sections */}
      {plan.sections.map((section, sIdx) => {
        const exercises = section.exercises.filter((e) => e.name)
        if (!exercises.length) return null
        const color = SECTION_COLORS[sIdx % SECTION_COLORS.length]
        return (
          <div key={section.id} className={`rounded-2xl border ${color.border} shadow-sm overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${color.border} ${color.header}`}>
              <h2 className={`font-semibold text-sm ${color.text}`}>{section.title}</h2>
            </div>

            <div className="p-4 overflow-x-auto">
              <div className="grid gap-1.5 mb-1 min-w-max" style={{ gridTemplateColumns: gridCols }}>
                {['', 'Exercise', 'Sets', 'Reps', 'Weight', 'Notes', 'Poslední', '', ''].map((h, i) => (
                  <div key={i} className="text-xs font-medium text-slate-400 px-1">{h}</div>
                ))}
              </div>

              {exercises.map((ex) => {
                const actual = actuals[ex.id] || { completed: false, sets: '', reps: '', weight: '', notes: '' }
                const displayName = renames[ex.id] || ex.name
                const isSkipped = skipped.has(ex.id)
                const hist = exerciseHistory[displayName.trim().toLowerCase()]
                const lastStr = hist ? formatLast(hist) : '-'

                return (
                  <div
                    key={ex.id}
                    className={`grid gap-1.5 mb-1.5 items-center rounded-lg px-1 py-1 transition-colors min-w-max ${
                      isSkipped ? 'opacity-40 bg-slate-50' : actual.completed ? 'bg-green-50' : 'hover:bg-slate-50'
                    }`}
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <input
                      type="checkbox"
                      checked={actual.completed}
                      disabled={isSkipped}
                      onChange={(e) => updateActual(ex.id, 'completed', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer mx-auto disabled:cursor-not-allowed"
                    />
                    <div className={`text-sm font-medium px-2 py-1.5 truncate ${
                      isSkipped || actual.completed ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}>
                      {displayName}
                      {isSkipped && <span className="ml-1 text-xs font-normal no-underline">(vynecháno)</span>}
                    </div>
                    <input
                      value={actual.sets}
                      disabled={isSkipped}
                      onChange={(e) => updateActual(ex.id, 'sets', e.target.value)}
                      className={inputCls}
                    />
                    <input
                      value={actual.reps}
                      disabled={isSkipped}
                      onChange={(e) => updateActual(ex.id, 'reps', e.target.value)}
                      className={inputCls}
                    />
                    <input
                      value={actual.weight}
                      disabled={isSkipped}
                      onChange={(e) => updateActual(ex.id, 'weight', e.target.value)}
                      className={inputCls}
                    />
                    <input
                      value={actual.notes}
                      disabled={isSkipped}
                      onChange={(e) => updateActual(ex.id, 'notes', e.target.value)}
                      className={inputCls}
                    />
                    <div className="text-xs text-slate-400 px-1 truncate" title={lastStr}>{lastStr}</div>
                    <button
                      onClick={() => openYouTube(displayName)}
                      title="Hledat na YouTube"
                      disabled={isSkipped}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-30 transition-colors text-red-600 text-xs font-bold shrink-0"
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => openReplacePanel(section.id, ex.id, displayName, section.title)}
                      title="Alternativy pomocí AI"
                      disabled={isSkipped}
                      className={`flex items-center justify-center w-7 h-7 rounded-lg disabled:opacity-30 transition-colors text-xs shrink-0 font-bold ${
                        replacePanel?.exId === ex.id
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                      }`}
                    >
                      ⇄
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Inline replace panel */}
            {replacePanel?.sectionId === section.id && (
              <div className="px-4 pb-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      Alternativy pro „{replacePanel.exName}"
                    </p>
                    <div className="flex items-center gap-3">
                      {!replacePanel.loading && (
                        <>
                          <button
                            onClick={() => fetchAlternatives({ sectionId: replacePanel.sectionId, exId: replacePanel.exId, exName: replacePanel.exName, sectionTitle: replacePanel.sectionTitle })}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            🔄 Dalších 5
                          </button>
                          <button
                            onClick={() => skipExercise(replacePanel.exId)}
                            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                          >
                            ⊘ Vynechat
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setReplacePanel(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>

                  {replacePanel.loading ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-blue-500">
                      <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin shrink-0" />
                      Hledám alternativy…
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {replacePanel.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => selectAlternative(replacePanel.exId, s.name)}
                          className="text-left bg-white border border-blue-100 hover:border-blue-400 hover:shadow-sm rounded-lg p-2.5 transition-all group"
                        >
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 leading-tight">{s.name}</p>
                          {s.reason && <p className="text-xs text-slate-400 mt-1 leading-tight">{s.reason}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Trenérské poznámky</label>
          <textarea
            value={trainerNotes}
            onChange={(e) => setTrainerNotes(e.target.value)}
            rows={3}
            placeholder="Poznámky pro klienta k tomuto tréninku..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Progrese</label>
          <textarea
            value={progression}
            onChange={(e) => setProgression(e.target.value)}
            rows={2}
            placeholder="Co trénovat příště, jak navázat..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <span className="shrink-0 font-bold">✕</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-8">
        {saved ? (
          <span className="text-green-600 text-sm font-medium flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold">✓</span>
            Záznam uložen do Supabase
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          {isSaving ? 'Ukládám...' : '💾 Uložit záznam'}
        </button>
      </div>

    </div>
  )
}
