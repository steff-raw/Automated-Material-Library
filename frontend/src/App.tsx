import { useState } from 'react'
import { AddMaterialPage } from './components/AddMaterialPage'
import { DemoBrowser } from './components/DemoBrowser'
import { HomeScreen } from './components/HomeScreen'
import { IdleScreen } from './components/IdleScreen'
import { MaterialWall } from './components/MaterialWall'
import { useActiveScans } from './hooks/useActiveScans'
import { useMaterialsByRfids } from './hooks/useMaterialsByRfids'

type AppPage = 'home' | 'add' | 'view'

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-paper">
      <p className="text-sm tracking-[0.25em] text-mist uppercase animate-pulse-soft">
        {label}
      </p>
    </div>
  )
}

function useDemoMode(): boolean {
  // Force mockup in View Material Assets for now (tap samples to place on table).
  // Re-enable env / ?demo= detection when wiring live RFID again.
  return true
}

export default function App() {
  const demo = useDemoMode()
  const [page, setPage] = useState<AppPage>('home')
  const [catalogVersion, setCatalogVersion] = useState(0)

  if (page === 'home') {
    return (
      <HomeScreen
        onAdd={() => setPage('add')}
        onView={() => setPage('view')}
      />
    )
  }

  if (page === 'add') {
    return (
      <AddMaterialPage
        onBack={() => setPage('home')}
        onSaved={() => setCatalogVersion((v) => v + 1)}
      />
    )
  }

  // View Material Assets
  if (demo) {
    return (
      <DemoBrowser
        onHome={() => setPage('home')}
        catalogVersion={catalogVersion}
      />
    )
  }

  return <LiveApp onHome={() => setPage('home')} />
}

function LiveApp({ onHome }: { onHome: () => void }) {
  const { rfidIds, isIdle, ready } = useActiveScans()
  const { materials, loading, error } = useMaterialsByRfids(rfidIds)

  if (!ready) {
    return <LoadingState label="Connecting" />
  }

  return (
    <div className="relative flex h-full min-h-full flex-col">
      <div className="absolute top-4 left-4 z-40">
        <button
          type="button"
          onClick={onHome}
          className="rounded-sm border border-ink/15 bg-paper/90 px-3 py-2 text-xs font-medium tracking-[0.18em] text-ink uppercase shadow-sm backdrop-blur-md transition-all hover:bg-paper"
        >
          ← Home
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {isIdle || rfidIds.length === 0 ? (
          <IdleScreen />
        ) : loading && materials.length === 0 ? (
          <LoadingState label="Loading materials" />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center bg-paper px-8 text-center">
            <h1 className="font-display text-3xl text-ink">Something went wrong</h1>
            <p className="mt-3 max-w-md text-stone">{error}</p>
          </div>
        ) : (
          <MaterialWall
            slots={rfidIds.map((rfidId) => {
              const material = materials.find((m) => m.rfid_id === rfidId)
              if (material) return { kind: 'material' as const, material }
              return { kind: 'unknown' as const, rfidId }
            })}
          />
        )}
      </div>
    </div>
  )
}
