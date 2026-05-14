'use client'

import { useState } from 'react'
import RegeneratePlanModal from './RegeneratePlanModal'

interface Props {
  clientSlug: string
  clientName: string
  date: string
  currentDuration: string
}

export default function RegeneratePlanButton({ clientSlug, clientName, date, currentDuration }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors"
      >
        🔄 Přegenerovat plán
      </button>
      {open && (
        <RegeneratePlanModal
          clientSlug={clientSlug}
          clientName={clientName}
          date={date}
          currentDuration={currentDuration}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
