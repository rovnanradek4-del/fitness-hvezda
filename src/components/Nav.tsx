'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/klienti', label: 'Klienti', icon: '👥' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="bg-slate-900 text-white hidden lg:block">
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

      {/* Mobile top bar */}
      <nav className="bg-slate-900 text-white lg:hidden">
        <div className="px-4 flex items-center justify-between h-12">
          <Link href="/dashboard" className="font-bold tracking-tight">
            <span className="text-white">Fitness</span>
            <span style={{ color: '#E30613' }}> Hvězda</span>
          </Link>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Odhlásit
          </button>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 lg:hidden">
        <div className="flex">
          {links.map((l) => {
            const active = pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                  active ? 'text-orange-600' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <span className="text-lg leading-none">{l.icon}</span>
                <span className="text-xs font-medium">{l.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
