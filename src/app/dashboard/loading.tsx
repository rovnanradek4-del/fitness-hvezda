import Nav from '@/components/Nav'

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="mb-6">
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-9 w-12 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <Skeleton className="h-5 w-44 mb-4" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-20 mb-3" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
