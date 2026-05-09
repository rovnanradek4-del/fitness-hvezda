'use client'

import { useState } from 'react'
import type { TrainingStatus } from '@/lib/types'

const OPTIONS: { value: TrainingStatus; label: string; icon: string; active: string; inactive: string }[] = [
  {
    value: 'probehlo',
    label: 'Proběhl',
    icon: '✅',
    active: 'bg-green-600 text-white border-green-600',
    inactive: 'border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-600',
  },
  {
    value: 'zruseno',
    label: 'Zrušen',
    icon: '❌',
    active: 'bg-red-600 text-white border-red-600',
    inactive: 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600',
  },
  {
    value: 'prelozeno',
    label: 'Přeložen',
    icon: '⏸',
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600',
  },
]

interface Props {
  clientSlug: string
  date: string
  initialStatus: TrainingStatus
}

export default function TrainingStatusToggle({ clientSlug, date, initialStatus }: Props) {
  const [status, setStatus] = useState<TrainingStatus>(initialStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function changeStatus(next: TrainingStatus) {
    if (next === status || saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/klienti/${clientSlug}/treninky`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status: next }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Uložení selhalo')
      }
      setStatus(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Stav tréninku</p>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => changeStatus(opt.value)}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
              status === opt.value ? opt.active : opt.inactive
            }`}
          >
            <span className="text-xs leading-none">{opt.icon}</span>
            {opt.label}
            {saving && status !== opt.value && opt.value === status && (
              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
