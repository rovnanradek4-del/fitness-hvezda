'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
  clientName: string
  initialProfile: string
}

export default function ClientActions({ slug, clientName, initialProfile }: Props) {
  const router = useRouter()

  // ── Edit profile modal ──────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editOpen) {
      setProfile(initialProfile)
      setSaveError('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editOpen, initialProfile])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/klienti/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileMarkdown: profile }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Uložení selhalo')
      }
      setEditOpen(false)
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete modal ────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [confirmName, setConfirmName] = useState('')

  useEffect(() => {
    if (deleteOpen) {
      setConfirmName('')
      setDeleteError('')
    }
  }, [deleteOpen])

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (confirmName.trim() !== clientName) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/klienti/${slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Smazání selhalo')
      }
      router.push('/klienti')
      router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
      setDeleting(false)
    }
  }

  const inputCls =
    'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors"
        >
          Upravit profil
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="text-sm border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
        >
          Smazat klienta
        </button>
      </div>

      {/* ── Edit profile modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Upravit profil</h2>
                <p className="text-sm text-slate-500">{clientName}</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="p-6">
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Obsah profilu (Markdown)
                </label>
                <textarea
                  ref={textareaRef}
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  rows={18}
                  placeholder={`# ${clientName}\n\n## Cíle\n\n## Zdravotní omezení\n\n## Poznámky`}
                  className={`${inputCls} font-mono text-xs resize-y`}
                  disabled={saving}
                />
                {saveError && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {saveError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {saving ? 'Ukládám...' : 'Uložit profil'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 text-2xl mb-4">
              ⚠
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Smazat klienta</h2>
            <p className="text-sm text-slate-500 mb-1">
              Tato akce je nevratná. Budou smazány:
            </p>
            <ul className="text-sm text-slate-500 list-disc ml-4 mb-4 space-y-0.5">
              <li>profil klienta</li>
              <li>všechny záznamy tréninků</li>
            </ul>

            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Pro potvrzení zadej jméno klienta:{' '}
                  <span className="font-semibold text-slate-700">{clientName}</span>
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => { setConfirmName(e.target.value); setDeleteError('') }}
                  placeholder={clientName}
                  className={inputCls}
                  disabled={deleting}
                  autoFocus
                />
              </div>

              {deleteError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {deleteError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={deleting || confirmName.trim() !== clientName}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {deleting ? 'Mažu...' : 'Smazat klienta'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
