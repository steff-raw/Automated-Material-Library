import { useEffect, useMemo, useState } from 'react'
import { bridgeHeaders, bridgeUrl } from '../lib/bridge'
import { supabase } from '../lib/supabase'

type LinkMaterialsPageProps = {
  onBack: () => void
}

type CatalogItem = {
  id: string
  name: string
  supplier: string | null
  rfid_id: string | null
  image_url: string | null
}

type ScanRow = { rfid_id: string; scanned_at: string }

/**
 * Test tool: place a tag on the reader, the ESP32 posts the UID to the bridge,
 * this page picks it up from active_scans (Realtime) and links it to a material.
 */
export function LinkMaterialsPage({ onBack }: LinkMaterialsPageProps) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linked, setLinked] = useState<string | null>(null)

  async function loadCatalog() {
    if (!supabase) return
    const { data, error: fetchError } = await supabase
      .from('materials')
      .select('id, name, supplier, rfid_id, image_url')
      .order('name')
    if (fetchError) {
      setCatalogError(fetchError.message)
      return
    }
    setCatalog((data as CatalogItem[]) ?? [])
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  // Only scans that arrive while this page is open count
  useEffect(() => {
    if (!supabase) return
    const openedAt = Date.now()
    const channel = supabase
      .channel('link_materials_scans')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_scans' },
        (payload) => {
          const row = payload.new as Partial<ScanRow>
          if (!row?.rfid_id || !row.scanned_at) return
          if (new Date(row.scanned_at).getTime() < openedAt) return
          setUid(row.rfid_id)
          setLinked(null)
          setError(null)
        },
      )
      .subscribe()
    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [])

  const currentMaterial = uid ? catalog.find((m) => m.rfid_id === uid) : undefined

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || (m.supplier ?? '').toLowerCase().includes(q),
    )
  }, [catalog, query])

  async function link() {
    if (!uid || !selectedId || !bridgeUrl) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${bridgeUrl}/link`, {
        method: 'POST',
        headers: bridgeHeaders(),
        body: JSON.stringify({ rfid_id: uid, material_id: selectedId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.detail ?? `Link failed (${res.status})`)
      const name = catalog.find((m) => m.id === selectedId)?.name ?? 'material'
      setLinked(`${uid} → ${name}`)
      setUid(null)
      setSelectedId(null)
      setQuery('')
      await loadCatalog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-full overflow-auto bg-paper">
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-12">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium tracking-[0.2em] text-mist uppercase transition-colors hover:text-ink"
        >
          ← Home
        </button>

        <p className="mt-6 text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
          Test tool
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Link Materials
        </h1>
        <p className="mt-2 max-w-xl text-sm text-stone sm:text-base">
          Place an NFC tag on the reader, then choose the material it belongs to.
        </p>

        {!supabase || !bridgeUrl ? (
          <p className="mt-8 text-sm text-red-700">
            Supabase and the bridge URL must be configured to link tags.
          </p>
        ) : null}

        {linked && (
          <p className="mt-8 border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            Linked {linked}. Place the next tag.
          </p>
        )}

        <section className="mt-8 border border-ink/10 bg-paper/70 px-6 py-6 shadow-sm">
          <span className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
            1 · Tag
          </span>
          {uid ? (
            <>
              <p className="mt-2 font-display text-2xl text-ink">{uid}</p>
              <p className="mt-1 text-sm text-stone">
                {currentMaterial
                  ? `Currently linked to ${currentMaterial.name}`
                  : 'Not linked to any material yet'}
              </p>
            </>
          ) : (
            <p className="mt-2 font-display text-2xl text-mist animate-pulse-soft">
              Waiting for a tag…
            </p>
          )}
        </section>

        <section className="mt-6 border border-ink/10 bg-paper/70 px-6 py-6 shadow-sm">
          <span className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
            2 · Material
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or supplier"
            className="mt-3 w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
          />
          {catalogError && <p className="mt-3 text-sm text-red-700">{catalogError}</p>}
          <ul className="mt-3 max-h-80 divide-y divide-ink/10 overflow-auto border border-ink/10">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                    selectedId === m.id ? 'bg-ink text-paper' : 'hover:bg-ink/5'
                  }`}
                >
                  {m.image_url ? (
                    <img src={m.image_url} alt="" className="h-10 w-10 shrink-0 object-cover" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 bg-ash" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.name}</span>
                    <span
                      className={`block truncate text-xs ${
                        selectedId === m.id ? 'text-ash' : 'text-mist'
                      }`}
                    >
                      {m.supplier ?? '—'} · {m.rfid_id ?? 'no tag'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-mist">No materials found.</li>
            )}
          </ul>
        </section>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          onClick={() => void link()}
          disabled={!uid || !selectedId || saving || !bridgeUrl}
          className="mt-6 w-full bg-ink px-6 py-4 text-sm font-medium tracking-[0.18em] text-paper uppercase transition-opacity disabled:opacity-30"
        >
          {saving ? 'Linking…' : 'Link tag to material'}
        </button>
      </div>
    </div>
  )
}
