import { useState } from 'react'
import { AddMaterialPage } from './components/AddMaterialPage'
import { DemoBrowser } from './components/DemoBrowser'
import { HomeScreen } from './components/HomeScreen'
import { IdleScreen } from './components/IdleScreen'
import { LinkMaterialsPage } from './components/LinkMaterialsPage'
import { MaterialWall } from './components/MaterialWall'
import { ScanModeToggle, type ScanMode } from './components/ScanModeToggle'
import { useActiveScans } from './hooks/useActiveScans'
import { useMaterialsByRfids } from './hooks/useMaterialsByRfids'
import { useScanEvents } from './hooks/useScanEvents'
import { clearScans, removeScan } from './lib/bridge'
import { hasSupabaseConfig } from './lib/supabase'

type AppPage = 'home' | 'add' | 'view' | 'link'

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
  // Live RFID table when Supabase is configured; ?demo forces the tap-to-place mockup.
  return !hasSupabaseConfig || new URLSearchParams(window.location.search).has('demo')
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
        onLink={() => setPage('link')}
      />
    )
  }

  if (page === 'link') {
    return <LinkMaterialsPage onBack={() => setPage('home')} />
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
  const { scans, ready } = useActiveScans()
  const rfidIds = scans.map((s) => s.rfid_id)
  const { materials, loading, error } = useMaterialsByRfids(rfidIds)
  // + adds scanned tags to the wall (the bridge already did); − removes them again
  const [mode, setMode] = useState<ScanMode>('add')
  const [actionError, setActionError] = useState<string | null>(null)

  async function remove(rfidId: string) {
    setActionError(null)
    try {
      await removeScan(rfidId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Remove failed')
    }
  }

  async function clearAll() {
    setActionError(null)
    try {
      await clearScans()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Clear failed')
    }
  }

  useScanEvents((rfidId) => {
    if (mode === 'remove') void remove(rfidId)
  })

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
        {rfidIds.length === 0 ? (
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
            onRemove={(rfidId) => void remove(rfidId)}
          />
        )}
      </div>

      <div className="z-50 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ash/40 bg-ink/90 px-4 py-3 text-paper backdrop-blur-sm">
        <p className="min-w-[12rem] text-[0.65rem] font-medium tracking-[0.2em] text-ash uppercase">
          {mode === 'add' ? 'Scan a tag to add it' : 'Scan a tag to remove it'}
          {actionError && <span className="ml-3 normal-case tracking-normal text-red-300">{actionError}</span>}
        </p>
        <ScanModeToggle mode={mode} onChange={setMode} />
        <div className="flex min-w-[12rem] justify-end">
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={rfidIds.length === 0}
            className="rounded border border-ash/40 px-3 py-1.5 text-xs tracking-wide hover:bg-paper/10 disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  )
}
