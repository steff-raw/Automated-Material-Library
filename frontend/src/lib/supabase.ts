import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(url && anonKey)

/** Null when env is missing — demo mode does not need a client. */
export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(url!, anonKey!)
  : null
