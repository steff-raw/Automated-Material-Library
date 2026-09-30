import { useState } from 'react'
import { AddMaterialPage } from './components/AddMaterialPage'
import { DemoBrowser } from './components/DemoBrowser'
import { HomeScreen } from './components/HomeScreen'
import { LinkMaterialsPage } from './components/LinkMaterialsPage'
import { ProjectWorkspace } from './components/ProjectWorkspace'
import { hasSupabaseConfig } from './lib/supabase'

type AppPage = 'home' | 'add' | 'view' | 'link'

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

  return <ProjectWorkspace onHome={() => setPage('home')} />
}
