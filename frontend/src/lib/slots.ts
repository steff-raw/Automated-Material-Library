import type { Material } from '../types'

export type Slot = { kind: 'material'; material: Material } | { kind: 'unknown'; rfidId: string }

export function slotRfid(slot: Slot): string {
  return slot.kind === 'material' ? slot.material.rfid_id : slot.rfidId
}
