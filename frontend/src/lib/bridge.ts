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
