import { useEffect, useState } from 'react'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import type { Material } from '../types'

export function useMaterialsByRfids(rfidIds: string[]) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const key = rfidIds.join(',')

  useEffect(() => {
    if (rfidIds.length === 0) {
      setMaterials([])
      setLoading(false)
      setError(null)
      return
    }

    if (!hasSupabaseConfig || !supabase) {
      setMaterials([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchAll() {
      const { data, error: fetchError } = await supabase!
        .from('materials')
        .select('*')
        .in('rfid_id', rfidIds)

      if (cancelled) return

      if (fetchError) {
        console.error('Failed to fetch materials', fetchError)
        setError(fetchError.message)
        setMaterials([])
        setLoading(false)
        return
      }

      const byId = new Map((data as Material[]).map((m) => [m.rfid_id, m]))
      // Preserve table order from rfidIds
      setMaterials(rfidIds.map((id) => byId.get(id)).filter(Boolean) as Material[])
      setLoading(false)
    }

    void fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key encodes rfidIds
  }, [key])

  return { materials, loading, error }
}
