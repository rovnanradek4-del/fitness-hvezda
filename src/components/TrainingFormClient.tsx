'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Training, TrainingSection, Exercise } from '@/lib/types'

type ExerciseHistory = Record<string, { sets: string; reps: string; weight: string }>

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function emptyExercise(): Exercise {
  return { id: uid(), name: '', sets: '', reps: '', weight: '', notes: '', youtubeUrl: '', completed: false }
}

function formatLast(h: { sets: string; reps: string; weight: string }): string {
  const parts: string[] = []
  if (h.sets && h.reps) parts.push(`${h.sets}×${h.reps}`)
  else if (h.sets) parts.push(h.sets)
  else if (h.reps) parts.push(h.reps)
  if (h.weight) parts.push(h.weight)
  return parts.join(' / ')
}

interface Props {
  clientSlug: string
  clientName: string
  initialTraining: Training
  isNew: boolean
  exerciseHistory: ExerciseHistory
}

export default function TrainingFormClient({ clientSlug, clientName, initialTraining, isNew, exerciseHistory }: Props) {
  const router = useRouter()
  const [training, setTraining] = useState<Training>(initialTraining)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function updateField<K extends keyof Training>(field: K, value: Training[K]) {
    setTraining((t) => ({ ...t, [field]: value }))
  }

  function updateSection(sectionId: string, title: string) {
    setTraining((t) => ({
      ...t,
      sections: t.sections.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    }))
  }

  function addSection() {
    const newSection: TrainingSection = {
      id: uid(),
      title: 'Nová sekce',
      exercises: [emptyExercise()],
    }
    setTraining((t) => ({ ...t, sections: [...t.sections, newSection] }))
  }

  function removeSection(sectionId: string) {
    setTraining((t) => ({ ...t, sections: t.sections.filter((s) => s.id !== sectionId) }))
  }

  function addExercise(sectionId: string) {
    setTraining((t) => ({
      ...t,
      sections: t.sections.map((s) =>
        s.id === sectionId ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s
      ),
    }))
  }

  function removeExercise(sectionId: string, exerciseId: string) {
    setTraining((t) => ({
      ...t,
      sections: t.sections.map((s) =>
        s.id === sectionId
          ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
          : s
      ),
    }))
  }

  function updateExercise(sectionId: string, exerciseId: string, field: keyof Exercise, value: string | boolean) {
    setTraining((t) => ({
      ...t,
      sections: t.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              exercises: s.exercises.map((e) =>
                e.id === exerciseId ? { ...e, [field]: value } : e
              ),
            }
          : s
      ),
    }))
  }

  function openYouTube(name: string) {
    if (!name.trim()) return
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise')}`, '_blank')
  }

  async function generateAI() {
    setIsGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai/generuj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSlug, trainingDate: training.date, customPrompt: aiPrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chyba serveru')
      setTraining((t) => ({
        ...t,
        focus: data.training.focus || t.focus,
        duration: data.training.duration || t.duration,
        sections: data.training.sections,
        trainerNotes: data.training.trainerNotes || t.trainerNotes,
        progression: data.training.progression || t.progression,
      }))
      setShowAiPanel(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/klienti/${clientSlug}/treninky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training }),
      })
      if (!res.ok) throw new Error('Nepodařilo se uložit trénink')
      setSaved(true)
      setTimeout(() => router.push(`/klienti/${clientSlug}/trenink/${training.date}`), 800)
    } catch (e) {
      setError(String(e))
    } finally {
      setIsSaving(false)
    }
  }

  const inputCls =
    'border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400 bg-white w-full'

  const gridCols = '28px 1fr 52px 52px 64px 1fr 90px 28px 28px'

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Datum</label>
            <input type="date" value={training.date} onChange={(e) => updateField('date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Délka (min)</label>
            <input type="number" value={training.duration} onChange={(e) => updateField('duration', e.target.value)} className={inputCls} placeholder="60" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Od</label>
            <input type="time" value={training.startTime} onChange={(e) => updateField('startTime', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Do</label>
            <input type="time" value={training.endTime} onChange={(e) => updateField('endTime', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-500 mb-1">Zaměření</label>
          <input type="text" value={training.focus} onChange={(e) => updateField('focus', e.target.value)} className={inputCls} placeholder="Upper body strength, conditioning..." />
        </div>
      </div>

      {/* Sections */}
      {training.sections.map((section) => (
        <div key={section.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <input
              type="text"
              value={section.title}
              onChange={(e) => updateSection(section.id, e.target.value)}
              className="font-semibold text-slate-800 bg-transparent border-none outline-none focus:ring-0 text-sm w-full"
              placeholder="Název sekce..."
            />
            <button onClick={() => removeSection(section.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-3 text-sm shrink-0" title="Odstranit sekci">✕</button>
          </div>

          <div className="p-4 overflow-x-auto">
            <div className="grid gap-1.5 mb-1 min-w-max" style={{ gridTemplateColumns: gridCols }}>
              {['', 'Exercise', 'Sets', 'Reps', 'Weight', 'Notes', 'Poslední', '', ''].map((h, i) => (
                <div key={i} className="text-xs font-medium text-slate-400 px-1">{h}</div>
              ))}
            </div>

            {section.exercises.map((ex) => {
              const hist = exerciseHistory[ex.name.trim().toLowerCase()]
              const lastStr = hist ? formatLast(hist) : '-'
              return (
                <div
                  key={ex.id}
                  className={`grid gap-1.5 mb-1.5 items-center transition-colors rounded-lg px-1 py-1 min-w-max ${ex.completed ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <input
                    type="checkbox"
                    checked={ex.completed}
                    onChange={(e) => updateExercise(section.id, ex.id, 'completed', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer mx-auto"
                  />
                  <input
                    value={ex.name}
                    onChange={(e) => updateExercise(section.id, ex.id, 'name', e.target.value)}
                    placeholder="Exercise name..."
                    className={`${inputCls} ${ex.completed ? 'line-through text-slate-400' : ''}`}
                  />
                  <input
                    value={ex.sets}
                    onChange={(e) => updateExercise(section.id, ex.id, 'sets', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    value={ex.reps}
                    onChange={(e) => updateExercise(section.id, ex.id, 'reps', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    value={ex.weight}
                    onChange={(e) => updateExercise(section.id, ex.id, 'weight', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    value={ex.notes}
                    onChange={(e) => updateExercise(section.id, ex.id, 'notes', e.target.value)}
                    placeholder="Notes..."
                    className={inputCls}
                  />
                  <div className="text-xs text-slate-400 px-1 truncate" title={lastStr}>{lastStr}</div>
                  <button
                    onClick={() => openYouTube(ex.name)}
                    title="Hledat na YouTube"
                    disabled={!ex.name.trim()}
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-red-600 text-xs font-bold shrink-0"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => removeExercise(section.id, ex.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-200 hover:text-red-400 hover:bg-red-50 transition-colors text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )
            })}

            <button onClick={() => addExercise(section.id)} className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-1">
              + Add exercise
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-3 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
      >
        + Přidat sekci
      </button>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Trenérské poznámky</label>
          <textarea
            value={training.trainerNotes}
            onChange={(e) => updateField('trainerNotes', e.target.value)}
            rows={3}
            placeholder="Poznámky pro klienta k tomuto tréninku..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Progrese</label>
          <textarea
            value={training.progression}
            onChange={(e) => updateField('progression', e.target.value)}
            rows={2}
            placeholder="Co trénovat příště, jak navázat..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* AI Panel */}
      {showAiPanel && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">AI generování tréninku</h3>
          <p className="text-sm text-slate-500 mb-3">
            AI vygeneruje trénink na základě profilu {clientName} a posledních tréninků.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            placeholder="Speciální požadavky (volitelné): focus on upper body, lighter session..."
            className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
          />
          <div className="flex gap-3">
            <button
              onClick={generateAI}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generuji...</>
              ) : '🤖 Generovat'}
            </button>
            <button onClick={() => setShowAiPanel(false)} className="text-sm text-slate-500 hover:text-slate-700 px-3">Zrušit</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pb-8">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← Zpět
        </button>
        <div className="flex gap-3">
          {!showAiPanel && (
            <button
              onClick={() => setShowAiPanel(true)}
              className="flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              🤖 Generovat AI
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || saved}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            {saved ? '✓ Uloženo!' : isSaving ? 'Ukládám...' : '💾 Uložit záznam do Obsidianu'}
          </button>
        </div>
      </div>
    </div>
  )
}
