import { useMemo, useState } from 'react'
import { getAllLocalMaterials } from '../lib/localMaterials'
import type { Material } from '../types'
import { IdleScreen } from './IdleScreen'
import { MaterialWall } from './MaterialWall'

const MAX_ON_TABLE = 5

type DemoBrowserProps = {
  onHome: () => void
  catalogVersion: number
}

export function DemoBrowser({ onHome, catalogVersion }: DemoBrowserProps) {
  const [onTable, setOnTable] = useState<string[]>([])
  const catalog = useMemo(() => getAllLocalMaterials(), [catalogVersion])

  const slots = useMemo(() => {
    return onTable.map((rfidId) => {
      const material = catalog.find((m) => m.rfid_id === rfidId)
      if (material) return { kind: 'material' as const, material }
      return { kind: 'unknown' as const, rfidId }
    })
  }, [onTable, catalog])

  function place(material: Material) {
    setOnTable((prev) => {
      if (prev.includes(material.rfid_id)) {
        return prev.filter((id) => id !== material.rfid_id)
      }
      if (prev.length >= MAX_ON_TABLE) return prev
      return [...prev, material.rfid_id]
    })
  }

  function clearTable() {
    setOnTable([])
  }

  return (
    <div className="relative flex h-full min-h-full flex-col">
      <div className="min-h-0 flex-1">
        {onTable.length === 0 ? (
          <IdleScreen />
        ) : (
          <MaterialWall slots={slots} />
        )}
      </div>

      <div className="z-50 shrink-0 border-t border-ash/40 bg-ink/90 px-3 py-3 text-paper backdrop-blur-sm sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onHome}
              className="rounded border border-ash/40 px-3 py-1 text-xs tracking-wide hover:bg-paper/10"
            >
              ← Home
            </button>
            <p className="text-[0.65rem] font-medium tracking-[0.2em] text-ash uppercase">
              Place samples ({onTable.length}/{MAX_ON_TABLE})
            </p>
          </div>
          <button
            type="button"
            onClick={clearTable}
            disabled={onTable.length === 0}
            className="rounded border border-ash/40 px-3 py-1 text-xs tracking-wide disabled:opacity-40 hover:bg-paper/10"
          >
            Clear table
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {catalog.map((material) => {
            const active = onTable.includes(material.rfid_id)
            const full = !active && onTable.length >= MAX_ON_TABLE
            return (
              <button
                key={material.rfid_id}
                type="button"
                disabled={full}
                onClick={() => place(material)}
                className={`shrink-0 rounded border px-3 py-2 text-left transition-colors disabled:opacity-35 ${
                  active
                    ? 'border-paper/50 bg-paper/15'
                    : 'border-ash/30 hover:bg-paper/10'
                }`}
              >
                <span className="block max-w-[9.5rem] truncate text-xs font-medium">
                  {material.name}
                </span>
                <span className="mt-0.5 block text-[0.65rem] text-mist">
                  {active ? 'On table — tap to remove' : 'Tap to place'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
