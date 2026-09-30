import { useState, type FormEvent } from 'react'
import { useScanEvents } from '../hooks/useScanEvents'
import { exportSchedule } from '../lib/exportSchedule'
import {
  ensureProject,
  ensureRoom,
  fetchMaterialByRfid,
  loadProjectRooms,
  saveRoomPalette,
  type Project,
  type Room,
} from '../lib/projects'
import { slotKey, type Slot } from '../lib/slots'
import type { Material } from '../types'
import { IdleScreen } from './IdleScreen'
import { MaterialWall } from './MaterialWall'
import { ProjectSetup } from './ProjectSetup'
import { ScanModeToggle, type ScanMode } from './ScanModeToggle'

type ProjectWorkspaceProps = {
  onHome: () => void
}

type Workspace = {
  project: Project
  rooms: Room[]
  /** Working palette per room (unsaved edits included) */
  palettes: Record<string, Slot[]>
  /** Material ids last saved per room, for the unsaved indicator */
  saved: Record<string, string[]>
  activeRoomId: string
}

function materialIds(slots: Slot[]): string[] {
  return slots.flatMap((s) => (s.kind === 'material' ? [s.material.id] : []))
}

function isDirty(ws: Workspace, roomId: string): boolean {
  const slots = ws.palettes[roomId] ?? []
  const saved = ws.saved[roomId] ?? []
  return slots.some((s) => s.kind === 'unknown') || materialIds(slots).join() !== saved.join()
}

function matchesTag(slot: Slot, rfidId: string): boolean {
  return slot.kind === 'material' ? slot.material.rfid_id === rfidId : slot.rfidId === rfidId
}

const barButton =
  'rounded border border-ash/40 px-3 py-1.5 text-xs tracking-wide transition-colors hover:bg-paper/10 disabled:opacity-40'

/**
 * View Material Assets: project → room tabs → material palette per room.
 * Scans add (+) or remove (−) materials in the active room; palettes are saved per room.
 */
export function ProjectWorkspace({ onHome }: ProjectWorkspaceProps) {
  const [ws, setWs] = useState<Workspace | null>(null)
  const [mode, setMode] = useState<ScanMode>('add')
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const activeRoomId = ws?.activeRoomId ?? null

  function updatePalette(roomId: string, update: (slots: Slot[]) => Slot[]) {
    setWs((prev) =>
      prev ? { ...prev, palettes: { ...prev.palettes, [roomId]: update(prev.palettes[roomId] ?? []) } } : prev,
    )
  }

  useScanEvents((rfidId) => {
    if (!activeRoomId) return
    const roomId = activeRoomId
    setMessage(null)
    if (mode === 'remove') {
      updatePalette(roomId, (slots) => slots.filter((s) => !matchesTag(s, rfidId)))
      return
    }
    fetchMaterialByRfid(rfidId)
      .then((material) => {
        const slot: Slot = material ? { kind: 'material', material } : { kind: 'unknown', rfidId }
        updatePalette(roomId, (slots) =>
          slots.some((s) => slotKey(s) === slotKey(slot) || matchesTag(s, rfidId))
            ? slots
            : [...slots, slot],
        )
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Lookup failed'))
  })

  async function openProject(projectName: string, roomName: string) {
    const project = await ensureProject(projectName)
    const room = await ensureRoom(project.id, roomName)
    const { rooms, palettes } = await loadProjectRooms(project.id)
    const toSlots = (list: Material[]): Slot[] => list.map((material) => ({ kind: 'material', material }))
    setWs({
      project,
      rooms,
      palettes: Object.fromEntries(rooms.map((r) => [r.id, toSlots(palettes[r.id] ?? [])])),
      saved: Object.fromEntries(rooms.map((r) => [r.id, (palettes[r.id] ?? []).map((m) => m.id)])),
      activeRoomId: room.id,
    })
    setMode('add')
    setMessage(null)
  }

  if (!ws) {
    return <ProjectSetup onBack={onHome} onStart={openProject} />
  }

  const workspace = ws
  const activeRoom = workspace.rooms.find((r) => r.id === workspace.activeRoomId)
  const slots = workspace.palettes[workspace.activeRoomId] ?? []
  const dirty = isDirty(workspace, workspace.activeRoomId)
  const anyDirty = workspace.rooms.some((r) => isDirty(workspace, r.id))

  async function addRoom(e: FormEvent) {
    e.preventDefault()
    const name = newRoomName.trim()
    if (!name) return
    setBusy('room')
    setMessage(null)
    try {
      const room = await ensureRoom(workspace.project.id, name)
      setWs((prev) => {
        if (!prev) return prev
        const exists = prev.rooms.some((r) => r.id === room.id)
        return {
          ...prev,
          rooms: exists ? prev.rooms : [...prev.rooms, room],
          palettes: exists ? prev.palettes : { ...prev.palettes, [room.id]: [] },
          saved: exists ? prev.saved : { ...prev.saved, [room.id]: [] },
          activeRoomId: room.id,
        }
      })
      setNewRoomName('')
      setAddingRoom(false)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not add room')
    } finally {
      setBusy(null)
    }
  }

  async function saveRoom() {
    const roomId = workspace.activeRoomId
    const ids = materialIds(slots)
    const unknown = slots.length - ids.length
    setBusy('save')
    setMessage(null)
    try {
      await saveRoomPalette(roomId, ids)
      setWs((prev) =>
        prev
          ? {
              ...prev,
              // Unregistered tags can't be saved; drop them so the room reads as saved
              palettes: { ...prev.palettes, [roomId]: (prev.palettes[roomId] ?? []).filter((s) => s.kind === 'material') },
              saved: { ...prev.saved, [roomId]: ids },
            }
          : prev,
      )
      setMessage(
        unknown > 0
          ? `Saved ${ids.length} materials. ${unknown} unregistered tag${unknown === 1 ? '' : 's'} left out — register them in Add Material.`
          : `Saved ${ids.length} material${ids.length === 1 ? '' : 's'} to ${activeRoom?.name ?? 'room'}.`,
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  async function exportExcel() {
    setBusy('export')
    setMessage(null)
    try {
      const palettes = Object.fromEntries(
        workspace.rooms.map((r) => [
          r.id,
          (workspace.palettes[r.id] ?? []).flatMap((s) => (s.kind === 'material' ? [s.material] : [])),
        ]),
      )
      await exportSchedule(workspace.project.name, workspace.rooms, palettes)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  function changeProject() {
    if (anyDirty && !window.confirm('Some rooms have unsaved changes. Leave this project anyway?')) return
    setWs(null)
  }

  return (
    <div className="relative flex h-full min-h-full flex-col">
      {/* Level 1 — project */}
      <header className="z-50 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 bg-ink px-4 py-3 text-paper">
        <button
          type="button"
          onClick={() => {
            if (anyDirty && !window.confirm('Some rooms have unsaved changes. Leave anyway?')) return
            onHome()
          }}
          className="text-xs font-medium tracking-[0.18em] text-ash uppercase hover:text-paper"
        >
          ← Home
        </button>
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-[0.6rem] font-medium tracking-[0.25em] text-ash uppercase">Project</span>
          <h1 className="truncate font-display text-xl text-paper">{workspace.project.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => void exportExcel()}
          disabled={busy === 'export'}
          className="rounded-sm bg-paper px-3 py-1.5 text-xs font-medium tracking-[0.15em] text-ink uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy === 'export' ? 'Exporting…' : 'Export Excel schedule'}
        </button>
        <button
          type="button"
          onClick={changeProject}
          className="ml-auto text-xs tracking-wide text-ash hover:text-paper"
        >
          Change project
        </button>
      </header>

      {/* Level 2 — rooms */}
      <nav className="z-40 flex shrink-0 items-end gap-1 overflow-x-auto border-b border-ash/60 bg-[#e8e3da] px-3 pt-2">
        {workspace.rooms.map((room) => {
          const active = room.id === workspace.activeRoomId
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => setWs((prev) => (prev ? { ...prev, activeRoomId: room.id } : prev))}
              className={`relative -mb-px flex shrink-0 items-center gap-2 rounded-t border px-4 py-2 text-sm transition-colors ${
                active
                  ? 'border-ash/60 border-b-paper bg-paper font-medium text-ink'
                  : 'border-transparent text-stone hover:bg-paper/50'
              }`}
            >
              {room.name}
              <span className="text-[0.65rem] text-mist">{workspace.palettes[room.id]?.length ?? 0}</span>
              {isDirty(workspace, room.id) && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" title="Unsaved changes" />
              )}
            </button>
          )
        })}

        <div className="ml-auto flex shrink-0 items-center pb-1.5 pl-3">
          {addingRoom ? (
            <form onSubmit={addRoom} className="flex items-center gap-2">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name"
                autoFocus
                className="w-40 border border-ash/60 bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!newRoomName.trim() || busy === 'room'}
                className="rounded-sm bg-ink px-3 py-1 text-xs text-paper disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingRoom(false)
                  setNewRoomName('')
                }}
                className="text-xs text-mist hover:text-ink"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingRoom(true)}
              className="rounded-sm border border-ink/20 px-3 py-1 text-xs font-medium tracking-wide text-ink transition-colors hover:bg-paper"
            >
              + Add room
            </button>
          )}
        </div>
      </nav>

      {/* Room palette */}
      <div className="min-h-0 flex-1">
        {slots.length === 0 ? (
          <IdleScreen />
        ) : (
          <MaterialWall
            slots={slots}
            onRemove={(key) =>
              updatePalette(workspace.activeRoomId, (list) => list.filter((s) => slotKey(s) !== key))
            }
          />
        )}
      </div>

      <div className="z-50 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ash/40 bg-ink/90 px-4 py-3 text-paper backdrop-blur-sm">
        <p className="min-w-[14rem] flex-1 text-[0.65rem] font-medium tracking-[0.2em] text-ash uppercase">
          {message ? (
            <span className="normal-case tracking-normal text-paper/90">{message}</span>
          ) : mode === 'add' ? (
            `Scan a tag to add it to ${activeRoom?.name ?? 'this room'}`
          ) : (
            `Scan a tag to remove it from ${activeRoom?.name ?? 'this room'}`
          )}
        </p>
        <ScanModeToggle mode={mode} onChange={setMode} />
        <div className="flex flex-1 justify-end gap-2">
          <button
            type="button"
            onClick={() => updatePalette(workspace.activeRoomId, () => [])}
            disabled={slots.length === 0}
            className={barButton}
          >
            Clear room
          </button>
          <button
            type="button"
            onClick={() => void saveRoom()}
            disabled={!dirty || busy === 'save'}
            className="rounded-sm bg-paper px-4 py-1.5 text-xs font-medium tracking-[0.15em] text-ink uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy === 'save' ? 'Saving…' : dirty ? 'Save room palette' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  )
}
