'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/klienti', label: 'Klienti' },
  ]

  return (
    <nav className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight">
            <span className="text-white">Fitness</span>
            <span style={{ color: '#E30613' }}> Hvězda</span>
          </Link>
          <div className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(l.href)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Odhlásit
        </button>
      </div>
    </nav>
  )
}
