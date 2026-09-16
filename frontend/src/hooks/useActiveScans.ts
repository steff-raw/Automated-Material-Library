import { useEffect, useState } from 'react'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import type { ActiveScan } from '../types'

const MAX_ON_TABLE = 5

export function useActiveScans() {
  const [scans, setScans] = useState<ActiveScan[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setReady(true)
      return
    }

    let cancelled = false

    async function loadInitial() {
      const { data, error } = await supabase!
        .from('active_scans')
        .select('rfid_id, scanned_at')
        .order('scanned_at', { ascending: true })

      if (cancelled) return
      if (error) {
        console.error('Failed to load active_scans', error)
      }
      setScans((data as ActiveScan[]) ?? [])
      setReady(true)
    }

    void loadInitial()

    const channel = supabase
      .channel('active_scans_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_scans' },
        () => {
          // Re-fetch full ordered set on any change (simple + correct)
          void supabase!
            .from('active_scans')
            .select('rfid_id, scanned_at')
            .order('scanned_at', { ascending: true })
            .then(({ data, error }) => {
              if (error) {
                console.error('Failed to refresh active_scans', error)
                return
              }
              setScans((data as ActiveScan[]) ?? [])
            })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase!.removeChannel(channel)
    }
  }, [])

  const rfidIds = scans.slice(-MAX_ON_TABLE).map((s) => s.rfid_id)

  return {
    rfidIds,
    scans,
    isIdle: rfidIds.length === 0,
    ready,
  }
}
