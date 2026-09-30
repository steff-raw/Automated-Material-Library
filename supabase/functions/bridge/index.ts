// Cloud bridge: replaces bridge/main.py so no local server is needed.
//
//   POST   /bridge/scan            {"rfid_id": "..."}   device token
//   DELETE /bridge/scan/:rfid_id                        device token or anon key
//   DELETE /bridge/scans                                device token or anon key
//   POST   /bridge/materials       MaterialPayload      public anon key
//   POST   /bridge/link            {rfid_id, material_id} public anon key
//
// Deployed with verify_jwt = false: the ESP32 authenticates with the
// x-device-token header (checked against public.bridge_devices), the web app
// with the project's anon key. The service role key never leaves Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-device-token',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function isDevice(req: Request): Promise<boolean> {
  const token = req.headers.get('x-device-token')?.trim()
  if (!token) return false
  const { data, error } = await supabase
    .from('bridge_devices')
    .select('token')
    .eq('token', token)
    .maybeSingle()
  return !error && data !== null
}

const verifiedKeys = new Set<string>()

// The runtime's SUPABASE_ANON_KEY may be a different key format than the one
// the web app ships, so fall back to asking PostgREST whether the key is valid.
async function isWebApp(req: Request): Promise<boolean> {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const key = req.headers.get('apikey') ?? bearer
  if (!key) return false
  if (key === ANON_KEY || verifiedKeys.has(key)) return true
  const res = await fetch(`${SUPABASE_URL}/rest/v1/materials?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  await res.body?.cancel()
  if (res.ok) verifiedKeys.add(key)
  return res.ok
}

function cleanRfid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim().toUpperCase()
  return /^[0-9A-F]{4,32}$/.test(id) ? id : null
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Path arrives as /bridge/... (or /functions/v1/bridge/... locally)
  const path = new URL(req.url).pathname.replace(/^.*?\/bridge/, '') || '/'

  if (req.method === 'GET' && path === '/health') return json({ status: 'ok' })

  if (path === '/scan' || path.startsWith('/scan/') || path === '/scans') {
    // Only the reader places samples; the web app may also take them off the table
    const allowed =
      req.method === 'POST'
        ? await isDevice(req)
        : (await isDevice(req)) || (await isWebApp(req))
    if (!allowed) return json({ detail: 'Unauthorized' }, 401)

    if (req.method === 'POST' && path === '/scan') {
      const body = await req.json().catch(() => ({}))
      const rfid_id = cleanRfid(body.rfid_id)
      if (!rfid_id) return json({ detail: 'rfid_id must be a hex UID' }, 400)
      const { error } = await supabase
        .from('active_scans')
        .upsert({ rfid_id, scanned_at: new Date().toISOString() }, { onConflict: 'rfid_id' })
      if (error) return json({ detail: 'Failed to update active_scans' }, 502)
      console.log(`scan ${rfid_id}`)
      return json({ ok: true })
    }

    if (req.method === 'DELETE' && path.startsWith('/scan/')) {
      const rfid_id = cleanRfid(decodeURIComponent(path.slice('/scan/'.length)))
      if (!rfid_id) return json({ detail: 'rfid_id must be a hex UID' }, 400)
      const { error } = await supabase.from('active_scans').delete().eq('rfid_id', rfid_id)
      if (error) return json({ detail: 'Failed to remove active scan' }, 502)
      return json({ ok: true })
    }

    if (req.method === 'DELETE' && path === '/scans') {
      const { error } = await supabase.from('active_scans').delete().neq('rfid_id', '')
      if (error) return json({ detail: 'Failed to clear active_scans' }, 502)
      return json({ ok: true })
    }
  }

  if (req.method === 'POST' && path === '/materials') {
    if (!(await isWebApp(req)) && !(await isDevice(req))) return json({ detail: 'Unauthorized' }, 401)
    const body = await req.json().catch(() => ({}))
    const rfid_id = cleanRfid(body.rfid_id)
    const name = optionalText(body.name)
    if (!rfid_id || !name) return json({ detail: 'rfid_id (hex) and name are required' }, 400)
    const row = {
      rfid_id,
      name,
      supplier: optionalText(body.supplier),
      cost_per_unit: optionalText(body.cost_per_unit),
      fire_rating: optionalText(body.fire_rating),
      acoustic_rating: optionalText(body.acoustic_rating),
      sustainability_cert: optionalText(body.sustainability_cert),
      spec_section: optionalText(body.spec_section),
      projects_used_in: Array.isArray(body.projects_used_in)
        ? body.projects_used_in.filter((p: unknown) => typeof p === 'string')
        : [],
      image_url: optionalText(body.image_url),
      datasheet_url: optionalText(body.datasheet_url),
    }
    const { data, error } = await supabase
      .from('materials')
      .upsert(row, { onConflict: 'rfid_id' })
      .select()
      .single()
    if (error) return json({ detail: 'Failed to save material' }, 502)
    // The registering scan should not stay on the presentation table
    await supabase.from('active_scans').delete().eq('rfid_id', rfid_id)
    return json({ ok: true, material: data })
  }

  if (req.method === 'POST' && path === '/link') {
    if (!(await isWebApp(req)) && !(await isDevice(req))) return json({ detail: 'Unauthorized' }, 401)
    const body = await req.json().catch(() => ({}))
    const rfid_id = cleanRfid(body.rfid_id)
    const material_id = typeof body.material_id === 'string' ? body.material_id : null
    if (!rfid_id || !material_id) {
      return json({ detail: 'rfid_id (hex) and material_id are required' }, 400)
    }

    // One tag ↔ one material: release the tag from any other material first
    const { error: releaseError } = await supabase
      .from('materials')
      .update({ rfid_id: null })
      .eq('rfid_id', rfid_id)
      .neq('id', material_id)
    if (releaseError) return json({ detail: 'Failed to release tag' }, 502)

    const { data, error } = await supabase
      .from('materials')
      .update({ rfid_id })
      .eq('id', material_id)
      .select()
      .maybeSingle()
    if (error) return json({ detail: 'Failed to link tag' }, 502)
    if (!data) return json({ detail: 'Material not found' }, 404)

    // The linking scan should not stay on the presentation table
    await supabase.from('active_scans').delete().eq('rfid_id', rfid_id)
    console.log(`link ${rfid_id} -> ${material_id}`)
    return json({ ok: true, material: data })
  }

  return json({ detail: 'Not found' }, 404)
})
