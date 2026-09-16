import type { Material } from '../types'

type MaterialCardProps = {
  material: Material
  unknown?: boolean
  /** Tighter overlay for the details-mode image strip */
  strip?: boolean
}

export function MaterialCard({
  material,
  unknown = false,
  strip = false,
}: MaterialCardProps) {
  if (unknown) {
    return (
      <div className="group relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#d8d2c8]">
        <div className="px-4 text-center">
          <p className="text-[0.6rem] font-medium tracking-[0.25em] text-mist uppercase">
            Unregistered
          </p>
          <p className="mt-2 font-display text-lg text-ink">{material.rfid_id}</p>
        </div>
      </div>
    )
  }

  const projects = material.projects_used_in?.filter(Boolean) ?? []

  return (
    <article className="group relative h-full min-h-0 overflow-hidden bg-stone">
      {material.image_url ? (
        <img
          src={material.image_url}
          alt={material.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-ash/50">
          <span className="font-display text-lg text-stone">No image</span>
        </div>
      )}

      {/* Always-visible name cue at bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent px-4 pb-4 pt-16 transition-opacity duration-300 group-hover:opacity-0">
        <p className="truncate font-display text-lg text-paper sm:text-xl">
          {material.name}
        </p>
      </div>

      {/* Hover details overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end bg-ink/75 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 ease-out group-hover:opacity-100 ${
          strip ? 'px-3 py-3' : 'px-5 py-5 sm:px-6 sm:py-6'
        }`}
      >
        <p
          className={`font-medium tracking-[0.22em] text-ash/90 uppercase ${
            strip ? 'text-[0.55rem]' : 'text-[0.65rem]'
          }`}
        >
          {material.supplier ?? 'Material Sample'}
        </p>
        <h2
          className={`mt-1 font-display font-medium leading-tight text-paper ${
            strip ? 'text-base' : 'text-2xl sm:text-3xl'
          }`}
        >
          {material.name}
        </h2>

        <dl
          className={`mt-3 grid gap-x-4 gap-y-2 text-paper/90 ${
            strip ? 'grid-cols-1 text-xs' : 'grid-cols-2 text-sm'
          }`}
        >
          {material.cost_per_unit && (
            <div>
              <dt className="text-[0.55rem] tracking-[0.18em] text-ash uppercase">Cost</dt>
              <dd className="mt-0.5">{material.cost_per_unit}</dd>
            </div>
          )}
          {material.fire_rating && (
            <div>
              <dt className="text-[0.55rem] tracking-[0.18em] text-ash uppercase">Fire</dt>
              <dd className="mt-0.5">{material.fire_rating}</dd>
            </div>
          )}
          {!strip && material.acoustic_rating && (
            <div>
              <dt className="text-[0.55rem] tracking-[0.18em] text-ash uppercase">Acoustic</dt>
              <dd className="mt-0.5">{material.acoustic_rating}</dd>
            </div>
          )}
          {!strip && material.sustainability_cert && (
            <div>
              <dt className="text-[0.55rem] tracking-[0.18em] text-ash uppercase">Sustainability</dt>
              <dd className="mt-0.5">{material.sustainability_cert}</dd>
            </div>
          )}
          {!strip && material.spec_section && (
            <div className="col-span-2">
              <dt className="text-[0.55rem] tracking-[0.18em] text-ash uppercase">Spec</dt>
              <dd className="mt-0.5">{material.spec_section}</dd>
            </div>
          )}
        </dl>

        {!strip && projects.length > 0 && (
          <p className="mt-3 truncate text-xs text-ash">
            {projects.join(' · ')}
          </p>
        )}
      </div>
    </article>
  )
}
