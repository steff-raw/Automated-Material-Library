import { useEffect, useMemo, useState } from 'react'
import { downloadTexturePack } from '../lib/downloadTextures'
import type { Material } from '../types'
import { DetailsTable } from './DetailsTable'
import { MaterialCard } from './MaterialCard'

export type Slot =
  | { kind: 'material'; material: Material }
  | { kind: 'unknown'; rfidId: string }

type MaterialWallProps = {
  slots: Slot[]
}

function galleryGridClass(count: number): string {
  switch (count) {
    case 1:
      return 'grid-cols-1 grid-rows-1'
    case 2:
      return 'grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1'
    case 3:
      return 'grid-cols-1 grid-rows-3 md:grid-cols-2 md:grid-rows-2'
    case 4:
      return 'grid-cols-2 grid-rows-2'
    default:
      return 'grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2'
  }
}

function galleryCellClass(count: number, index: number): string {
  if (count === 3 && index === 2) return 'md:col-span-2'
  return ''
}

function placeholderMaterial(rfidId: string): Material {
  return {
    id: rfidId,
    rfid_id: rfidId,
    name: 'Unknown',
    supplier: null,
    cost_per_unit: null,
    fire_rating: null,
    acoustic_rating: null,
    sustainability_cert: null,
    spec_section: null,
    projects_used_in: null,
    image_url: null,
    datasheet_url: null,
  }
}

export function MaterialWall({ slots }: MaterialWallProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const count = slots.length

  useEffect(() => {
    if (count === 0) setShowDetails(false)
  }, [count])

  const knownMaterials = useMemo(
    () =>
      slots
        .filter((s): s is { kind: 'material'; material: Material } => s.kind === 'material')
        .map((s) => s.material),
    [slots],
  )

  async function handleDownload() {
    if (knownMaterials.length === 0 || downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadTexturePack(knownMaterials)
    } catch (err) {
      console.error(err)
      setDownloadError('Download failed — check the browser console.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="relative flex h-full min-h-full w-full flex-col">
      <div
        className={`grid min-h-0 flex-1 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showDetails ? 'grid-cols-1 md:grid-cols-[1fr_3fr]' : 'grid-cols-1'
        }`}
      >
        {/* Image gallery — full wall, or left quarter when details open */}
        <div
          className={`min-h-0 overflow-hidden transition-all duration-500 ${
            showDetails ? 'border-r border-ash/40' : ''
          }`}
        >
          <div
            className={`grid h-full w-full gap-px bg-ash/50 ${
              showDetails
                ? 'grid-cols-1 auto-rows-fr'
                : galleryGridClass(count)
            }`}
            style={
              showDetails
                ? { gridTemplateRows: `repeat(${Math.max(count, 1)}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {slots.map((slot, index) => (
              <div
                key={slot.kind === 'material' ? slot.material.rfid_id : slot.rfidId}
                className={`min-h-0 overflow-hidden bg-paper transition-all duration-500 ease-out ${
                  showDetails ? '' : galleryCellClass(count, index)
                }`}
              >
                {slot.kind === 'material' ? (
                  <MaterialCard material={slot.material} strip={showDetails} />
                ) : (
                  <MaterialCard
                    unknown
                    strip={showDetails}
                    material={placeholderMaterial(slot.rfidId)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Details table panel */}
        {showDetails && (
          <div className="details-slide-in min-h-0 overflow-hidden border-t border-ash/30 md:border-t-0">
            {knownMaterials.length > 0 ? (
              <DetailsTable materials={knownMaterials} />
            ) : (
              <div className="flex h-full items-center justify-center bg-paper px-8 text-center">
                <p className="text-stone">No registered materials to compare.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="pointer-events-none absolute top-4 right-4 z-40 flex flex-col items-end gap-2 sm:top-5 sm:right-5">
          <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={knownMaterials.length === 0 || downloading}
              className="rounded-sm border border-ink/15 bg-paper/90 px-4 py-2.5 text-xs font-medium tracking-[0.18em] text-ink uppercase shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-paper hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"
            >
              {downloading ? 'Downloading…' : 'Download Textures'}
            </button>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="rounded-sm border border-ink/15 bg-paper/90 px-4 py-2.5 text-xs font-medium tracking-[0.18em] text-ink uppercase shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-paper hover:shadow-md"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          {downloadError && (
            <p className="pointer-events-auto max-w-xs rounded-sm bg-ink/85 px-3 py-1.5 text-xs text-paper">
              {downloadError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
