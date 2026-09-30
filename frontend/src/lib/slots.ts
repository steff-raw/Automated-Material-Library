import type { Material } from '../types'

export type Slot = { kind: 'material'; material: Material } | { kind: 'unknown'; rfidId: string }

/** Stable identity of a tile: the material, or the unregistered tag. */
export function slotKey(slot: Slot): string {
  return slot.kind === 'material' ? `m:${slot.material.id}` : `r:${slot.rfidId}`
}
