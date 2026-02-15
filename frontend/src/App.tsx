import { lazy, Suspense, useEffect, useState } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'
import AppHeader from './components/layout/AppHeader.tsx'
import AppLayout from './components/layout/AppLayout.tsx'
import ToastContainer from './components/common/ToastContainer.tsx'
import { useRosterStore } from './stores/rosterStore.ts'
import client from './api/client.ts'

const UnitBrowser = lazy(() => import('./components/units/UnitBrowser.tsx'))
const RosterPanel = lazy(() => import('./components/roster/RosterPanel.tsx'))

function SkeletonCard({ width = 'w-full' }: { width?: string }) {
  return <div className={`${width} h-12 animate-pulse rounded-sm bg-plate-800/40`} />
}

function BrowserSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 xl:max-w-5xl">
      <div className="h-6 w-48 animate-pulse rounded-sm bg-plate-800/40" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-20 animate-pulse rounded-sm bg-plate-800/30" />)}
      </div>
      <div className="h-9 animate-pulse rounded-sm bg-plate-800/30" />
      <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
        {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

function RosterSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-5 w-40 animate-pulse rounded-sm bg-plate-800/40" />
      <div className="h-10 animate-pulse rounded-sm bg-plate-800/30" />
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="h-7 w-24 animate-pulse rounded-sm bg-plate-800/30" />)}
      </div>
      <div className="h-32 animate-pulse rounded-sm bg-plate-800/20" />
    </div>
  )
}

function App() {
  const rosterId = useRosterStore((s) => s.rosterId)
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse)
  const [restoring, setRestoring] = useState(true)

  // Restore roster from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('sa_roster_id');
    if (savedId && !rosterId) {
      client.get(`/api/rosters/${savedId}`)
        .then(({ data }) => { syncFromResponse(data); })
        .catch(() => { localStorage.removeItem('sa_roster_id'); })
        .finally(() => setRestoring(false));
    } else {
      setRestoring(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (restoring) {
    return (
      <div className="flex h-screen flex-col">
        <AppHeader />
        <AppLayout
          left={<BrowserSkeleton />}
          right={<RosterSkeleton />}
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col">
        <AppHeader />
        {rosterId ? (
          <AppLayout
            left={
              <Suspense fallback={<BrowserSkeleton />}>
                <UnitBrowser />
              </Suspense>
            }
            right={
              <Suspense fallback={<RosterSkeleton />}>
                <RosterPanel />
              </Suspense>
            }
          />
        ) : (
          <div className="setup-bg flex flex-1 items-center justify-center overflow-hidden">
            <Suspense fallback={<RosterSkeleton />}>
              <RosterPanel />
            </Suspense>
          </div>
        )}
      </div>
      <ToastContainer />
    </ErrorBoundary>
  )
}

export default App
