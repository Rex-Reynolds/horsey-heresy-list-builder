import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'
import AppHeader from './components/layout/AppHeader.tsx'
import AppLayout from './components/layout/AppLayout.tsx'
import ToastContainer from './components/common/ToastContainer.tsx'
import { useRosterStore } from './stores/rosterStore.ts'

const UnitBrowser = lazy(() => import('./components/units/UnitBrowser.tsx'))
const RosterPanel = lazy(() => import('./components/roster/RosterPanel.tsx'))

function PanelFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="font-label text-xs tracking-wider text-text-dim uppercase animate-pulse">
        Loading...
      </span>
    </div>
  )
}

function App() {
  const rosterId = useRosterStore((s) => s.rosterId)

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col">
        <AppHeader />
        {rosterId ? (
          <AppLayout
            left={
              <Suspense fallback={<PanelFallback />}>
                <UnitBrowser />
              </Suspense>
            }
            right={
              <Suspense fallback={<PanelFallback />}>
                <RosterPanel />
              </Suspense>
            }
          />
        ) : (
          <div className="setup-bg flex flex-1 items-center justify-center overflow-hidden">
            <Suspense fallback={<PanelFallback />}>
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
