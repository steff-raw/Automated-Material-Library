import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

type ScanRow = { rfid_id: string; scanned_at: string }

/** Calls `onScan` for every tag the ESP32 reports after mount (active_scans Realtime). */
export function useScanEvents(onScan: (rfidId: string) => void) {
  const callback = useRef(onScan)
  useEffect(() => {
    callback.current = onScan
  })

  useEffect(() => {
    if (!supabase) return
    const mountedAt = Date.now()
    const channel = supabase
      .channel(`scan_events_${mountedAt}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_scans' },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          const row = payload.new as Partial<ScanRow>
          if (!row?.rfid_id || !row.scanned_at) return
          if (new Date(row.scanned_at).getTime() < mountedAt) return
          callback.current(row.rfid_id)
        },
      )
      .subscribe()
    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [])
}
