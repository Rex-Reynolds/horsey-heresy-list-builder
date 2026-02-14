import { useState } from 'react'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'
import AppHeader from './components/layout/AppHeader.tsx'
import AppLayout from './components/layout/AppLayout.tsx'
import UnitBrowser from './components/units/UnitBrowser.tsx'
import RosterPanel from './components/roster/RosterPanel.tsx'

function App() {
  const [rosterVisible, setRosterVisible] = useState(false)

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col">
        <AppHeader
          onToggleRoster={() => setRosterVisible((v) => !v)}
          rosterVisible={rosterVisible}
        />
        <AppLayout
          left={<UnitBrowser />}
          right={<RosterPanel />}
          rosterVisible={rosterVisible}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App
