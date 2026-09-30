/** Base URL of the bridge (cloud Edge Function or local FastAPI), if configured. */
export const bridgeUrl = (import.meta.env.VITE_BRIDGE_URL as string | undefined)?.replace(
  /\/$/,
  '',
)

/** The cloud bridge (Supabase Edge Function) accepts the public anon key. */
export function bridgeHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return anonKey
    ? {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      }
    : { 'Content-Type': 'application/json' }
}

/** Remove one sample from the presentation table. */
export async function removeScan(rfidId: string): Promise<void> {
  if (!bridgeUrl) throw new Error('Bridge URL not configured')
  const res = await fetch(`${bridgeUrl}/scan/${encodeURIComponent(rfidId)}`, {
    method: 'DELETE',
    headers: bridgeHeaders(),
  })
  if (!res.ok) throw new Error(`Remove failed (${res.status})`)
}

/** Remove every sample from the presentation table. */
export async function clearScans(): Promise<void> {
  if (!bridgeUrl) throw new Error('Bridge URL not configured')
  const res = await fetch(`${bridgeUrl}/scans`, { method: 'DELETE', headers: bridgeHeaders() })
  if (!res.ok) throw new Error(`Clear failed (${res.status})`)
}
