import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type ScanRow = { rfid_id: string; scanned_at: string }

/**
 * Latest tag the ESP32 reports (via active_scans Realtime) after the page opened
 * or after `reset()`. Used to capture a tag's UID without typing it.
 */
export function useTagScan() {
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const openedAt = Date.now()
    const channel = supabase
      .channel(`tag_scan_${openedAt}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_scans' },
        (payload) => {
          const row = payload.new as Partial<ScanRow>
          if (!row?.rfid_id || !row.scanned_at) return
          if (new Date(row.scanned_at).getTime() < openedAt) return
          setUid(row.rfid_id)
        },
      )
      .subscribe()
    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [])

  return { uid, reset: () => setUid(null), listening: Boolean(supabase) }
}
