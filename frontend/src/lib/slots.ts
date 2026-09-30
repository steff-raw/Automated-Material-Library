import type { Material } from '../types'

export type Slot =
  | { kind: 'material'; material: Material }
  | { kind: 'unknown'; rfidId: string }
  | { kind: 'empty'; key: string }

/** Keep the newest `capacity` slots, then pad with empty tiles up to it. */
export function fillSlots(slots: Slot[], capacity: number): Slot[] {
  const shown = slots.slice(-capacity)
  const empties = Array.from({ length: capacity - shown.length }, (_, i) => ({
    kind: 'empty' as const,
    key: `empty-${i}`,
  }))
  return [...shown, ...empties]
}
