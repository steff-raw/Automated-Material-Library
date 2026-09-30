import { useState } from 'react'

export const MIN_SLOTS = 1
export const MAX_SLOTS = 12
const DEFAULT_SLOTS = 5
const STORAGE_KEY = 'aml.slotCount'

function readStored(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY))
    if (Number.isInteger(n) && n >= MIN_SLOTS && n <= MAX_SLOTS) return n
  } catch {
    // storage unavailable (private mode) — fall back to default
  }
  return DEFAULT_SLOTS
}

/** Number of tiles on the material wall, remembered per browser. */
export function useSlotCount() {
  const [count, setCount] = useState(readStored)

  function update(next: number) {
    const clamped = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, next))
    setCount(clamped)
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped))
    } catch {
      // ignore
    }
  }

  return {
    count,
    increment: () => update(count + 1),
    decrement: () => update(count - 1),
  }
}
