'use client'

import { useState } from 'react'
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

interface ReplaceModal {
  exerciseId: string
  exerciseName: string
  sectionTitle: string
  stage: 'menu' | 'loading' | 'result'
  suggestion: string
  reason: string
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

export default function TrainingRecordClient({
  clientSlug,
  training: plan,
  calendarStartTime,
  calendarEndTime,
  exerciseHistory,
}: Props) {
  const router = useRouter()

  const [actuals, setActuals] = useState<Record<string, ActualExercise>>(() => {
    const map: Record<string, ActualExercise> = {}
    for (const section of plan.sections) {
      for (const ex of section.exercises) {
        map[ex.id] = { completed: false, sets: '', reps: '', weight: '', notes: '' }
      }
    }
    return map
  })

  const [startTime, setStartTime] = useState(calendarStartTime || plan.startTime || '')
  const [endTime, setEndTime] = useState(calendarEndTime || plan.endTime || '')
  const [trainerNotes, setTrainerNotes] = useState('')
  const [progression, setProgression] = useState('')
  const [renames, setRenames] = useState<Record<string, string>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [replaceModal, setReplaceModal] = useState<ReplaceModal | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

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
      trainerNotes: trainerNotes || plan.trainerNotes,
      progression: progression || plan.progression,
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
    if (!res.ok) throw new Error('Nepodařilo se uložit záznam')
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    try {
      await persistTraining(buildTraining())
      setSaved(true)
      setTimeout(() => router.refresh(), 500)
    } catch (e) {
      setError(String(e))
    } finally {
      setIsSaving(false)
    }
  }

  async function callAiReplacement() {
    if (!replaceModal) return
    setReplaceModal((m) => m ? { ...m, stage: 'loading' } : m)
    try {
      const res = await fetch('/api/ai/nahrad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName: replaceModal.exerciseName,
          sectionTitle: replaceModal.sectionTitle,
          clientSlug,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.name) throw new Error(data.error || 'Chyba')
      setReplaceModal((m) => m ? { ...m, stage: 'result', suggestion: data.name, reason: data.reason || '' } : m)
    } catch {
      setReplaceModal((m) => m ? { ...m, stage: 'menu' } : m)
      setError('Nepodařilo se vygenerovat náhradu')
    }
  }

  async function acceptReplacement() {
    if (!replaceModal) return
    const newRenames = { ...renames, [replaceModal.exerciseId]: replaceModal.suggestion }
    setRenames(newRenames)
    setReplaceModal(null)
    try {
      await persistTraining(buildTraining({ renames: newRenames }))
    } catch (e) {
      setError(String(e))
    }
  }

  async function skipExercise() {
    if (!replaceModal) return
    const newSkipped = new Set(skipped)
    newSkipped.add(replaceModal.exerciseId)
    setSkipped(newSkipped)
    setReplaceModal(null)
    try {
      await persistTraining(buildTraining({ skipped: newSkipped }))
    } catch (e) {
      setError(String(e))
    }
  }

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
      {plan.sections.map((section) => {
        const exercises = section.exercises.filter((e) => e.name)
        if (!exercises.length) return null
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-800 text-sm">{section.title}</h2>
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
                      onClick={() => setReplaceModal({ exerciseId: ex.id, exerciseName: displayName, sectionTitle: section.title, stage: 'menu', suggestion: '', reason: '' })}
                      title="Vyměnit cvik"
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 text-xs shrink-0 font-bold"
                    >
                      ⇄
                    </button>
                  </div>
                )
              })}
            </div>
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
            placeholder={plan.trainerNotes || 'Poznámky pro klienta k tomuto tréninku...'}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Progrese</label>
          <textarea
            value={progression}
            onChange={(e) => setProgression(e.target.value)}
            rows={2}
            placeholder={plan.progression || 'Co trénovat příště, jak navázat...'}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={isSaving || saved}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          {saved ? '✓ Uloženo!' : isSaving ? 'Ukládám...' : '💾 Uložit záznam do Obsidianu'}
        </button>
      </div>

      {/* Replace modal */}
      {replaceModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setReplaceModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 mb-0.5">Vyměnit cvik</h3>
            <p className="text-sm text-slate-500 mb-5">{replaceModal.exerciseName}</p>

            {replaceModal.stage === 'menu' && (
              <div className="space-y-3">
                <button
                  onClick={callAiReplacement}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
                >
                  🤖 Vygenerovat náhradu pomocí AI
                </button>
                <button
                  onClick={skipExercise}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  ⊘ Vynechat cvik
                </button>
              </div>
            )}

            {replaceModal.stage === 'loading' && (
              <div className="text-center py-6">
                <div className="inline-block w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-500">AI hledá náhradu...</p>
              </div>
            )}

            {replaceModal.stage === 'result' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="font-semibold text-slate-800">{replaceModal.suggestion}</p>
                  {replaceModal.reason && (
                    <p className="text-xs text-slate-500 mt-1">{replaceModal.reason}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={acceptReplacement}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                  >
                    ✓ Přijmout
                  </button>
                  <button
                    onClick={callAiReplacement}
                    className="text-sm text-blue-600 hover:text-blue-700 px-3 font-medium"
                  >
                    Zkusit znovu
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setReplaceModal(null)}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600 w-full text-center transition-colors"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
