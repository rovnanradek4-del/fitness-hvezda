import Nav from '@/components/Nav'
import Link from 'next/link'
import { getClients } from '@/lib/obsidian'
import NewClientButton from '@/components/NewClientButton'

export default async function KlientiPage() {
  const clients = await getClients()

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Klienti</h1>
            <p className="text-slate-500 mt-1">{clients.length} klientů</p>
          </div>
          <NewClientButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link
              key={client.slug}
              href={`/klienti/${client.slug}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {client.name}
                  </h2>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Tréninky:</span>
                      <span className="text-xs font-medium text-slate-700">{client.trainingCount}</span>
                    </div>
                    {client.lastTraining && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Poslední:</span>
                        <span className="text-xs font-medium text-slate-700">{client.lastTraining}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50">
                <span className="text-xs text-blue-600 font-medium group-hover:text-blue-700">
                  Zobrazit profil →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
