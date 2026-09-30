import type { Material } from '../types'
import { bridgeHeaders, bridgeUrl } from './bridge'
import { supabase } from './supabase'

export type Project = { id: string; name: string }
export type Room = { id: string; project_id: string; name: string; position: number }

async function bridge<T>(method: string, path: string, body: unknown): Promise<T> {
  if (!bridgeUrl) throw new Error('Bridge URL not configured')
  const res = await fetch(`${bridgeUrl}${path}`, {
    method,
    headers: bridgeHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `Request failed (${res.status})`)
  return data as T
}

function db() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await db().from('projects').select('id, name').order('name')
  if (error) throw new Error(error.message)
  return data as Project[]
}

/** Find-or-create by name (case-insensitive). */
export async function ensureProject(name: string): Promise<Project> {
  const { project } = await bridge<{ project: Project }>('POST', '/projects', { name })
  return project
}

/** Find-or-create a room by name within a project. */
export async function ensureRoom(projectId: string, name: string): Promise<Room> {
  const { room } = await bridge<{ room: Room }>('POST', '/rooms', { project_id: projectId, name })
  return room
}

export async function saveRoomPalette(roomId: string, materialIds: string[]): Promise<void> {
  await bridge('PUT', `/rooms/${roomId}/materials`, { material_ids: materialIds })
}

/** Rooms of a project in tab order, each with its saved materials in palette order. */
export async function loadProjectRooms(
  projectId: string,
): Promise<{ rooms: Room[]; palettes: Record<string, Material[]> }> {
  const { data: rooms, error } = await db()
    .from('rooms')
    .select('id, project_id, name, position')
    .eq('project_id', projectId)
    .order('position')
  if (error) throw new Error(error.message)

  const palettes: Record<string, Material[]> = {}
  for (const room of rooms as Room[]) palettes[room.id] = []
  if (rooms.length === 0) return { rooms: [], palettes }

  const { data: rows, error: rowsError } = await db()
    .from('room_materials')
    .select('room_id, position, materials(*)')
    .in(
      'room_id',
      (rooms as Room[]).map((r) => r.id),
    )
    .order('position')
  if (rowsError) throw new Error(rowsError.message)

  for (const row of rows as unknown as { room_id: string; materials: Material | null }[]) {
    if (row.materials) palettes[row.room_id].push(row.materials)
  }
  return { rooms: rooms as Room[], palettes }
}

export async function fetchMaterialByRfid(rfidId: string): Promise<Material | null> {
  const { data, error } = await db().from('materials').select('*').eq('rfid_id', rfidId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Material | null) ?? null
}
