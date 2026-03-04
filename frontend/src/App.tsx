import { lazy, Suspense, useEffect, useState } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'
import AppHeader from './components/layout/AppHeader.tsx'
import AppLayout from './components/layout/AppLayout.tsx'
import ToastContainer from './components/common/ToastContainer.tsx'
import KeyboardShortcuts from './components/common/KeyboardShortcuts.tsx'
import GuidedTour from './components/common/GuidedTour.tsx'
import RosterDrawer from './components/roster/RosterDrawer.tsx'
import UpgradePanel from './components/roster/UpgradePanel.tsx'
import CommandPalette from './components/common/CommandPalette.tsx'
import RosterTabs from './components/roster/RosterTabs.tsx'
import { useRosterStore } from './stores/rosterStore.ts'
import { useUndoRedo } from './hooks/useUndoRedo.ts'
import { useAmbientBackground } from './hooks/useAmbientBackground.ts'
import client from './api/client.ts'

// Apply saved theme on module load (before first render)
(() => {
  try {
    const saved = localStorage.getItem('sa_theme');
    if (saved === 'parchment') document.documentElement.setAttribute('data-theme', 'parchment');
  } catch { /* noop */ }
})()

const UnitBrowser = lazy(() => import('./components/units/UnitBrowser.tsx'))
const RosterPanel = lazy(() => import('./components/roster/RosterPanel.tsx'))

function SkeletonCard({ width = 'w-full' }: { width?: string }) {
  return <div className={`${width} h-12 animate-pulse rounded-sm bg-plate-800/40`} />
}

function BrowserSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 md:max-w-5xl">
      <div className="h-6 w-48 animate-pulse rounded-sm bg-plate-800/40" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-20 animate-pulse rounded-sm bg-plate-800/30" />)}
      </div>
      <div className="h-9 animate-pulse rounded-sm bg-plate-800/30" />
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
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
  useUndoRedo()
  useAmbientBackground()
  // Start restoring only if there's actually a saved roster to fetch
  const [restoring, setRestoring] = useState(() => !!localStorage.getItem('sa_roster_id'))

  // Restore roster from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('sa_roster_id');
    if (savedId && !rosterId) {
      client.get(`/api/rosters/${savedId}`)
        .then(({ data }) => { syncFromResponse(data); })
        .catch(() => { localStorage.removeItem('sa_roster_id'); })
        .finally(() => setRestoring(false));
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
        {rosterId && <RosterTabs />}
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
      <KeyboardShortcuts />
      <GuidedTour />
      <RosterDrawer />
      <UpgradePanel />
      <CommandPalette />
    </ErrorBoundary>
  )
}

export default App
