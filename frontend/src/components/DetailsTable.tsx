import type { Material } from '../types'

const COLUMNS: { key: keyof Material | 'projects'; label: string }[] = [
  { key: 'name', label: 'Material' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'cost_per_unit', label: 'Cost' },
  { key: 'fire_rating', label: 'Fire rating' },
  { key: 'acoustic_rating', label: 'Acoustic' },
  { key: 'sustainability_cert', label: 'Sustainability' },
  { key: 'spec_section', label: 'Spec section' },
  { key: 'projects', label: 'Projects' },
]

type DetailsTableProps = {
  materials: Material[]
}

function cellValue(material: Material, key: (typeof COLUMNS)[number]['key']): string {
  if (key === 'projects') {
    const projects = material.projects_used_in?.filter(Boolean) ?? []
    return projects.length ? projects.join(', ') : '—'
  }
  const value = material[key]
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ') || '—'
  return String(value)
}

export function DetailsTable({ materials }: DetailsTableProps) {
  return (
    <div className="details-panel flex h-full min-h-0 flex-col overflow-hidden bg-paper">
      <header className="shrink-0 border-b border-ash/40 px-6 py-5 sm:px-8">
        <p className="text-[0.65rem] font-medium tracking-[0.28em] text-mist uppercase">
          Comparison
        </p>
        <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          Samples on the table
        </h2>
        <p className="mt-1 text-sm text-stone">
          {materials.length} material{materials.length === 1 ? '' : 's'} in view
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="sticky top-0 z-10 border-b border-ash/50 bg-paper/95 px-3 py-3 text-[0.6rem] font-medium tracking-[0.2em] text-mist uppercase backdrop-blur-sm first:pl-1 last:pr-1"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((material, rowIndex) => (
                <tr
                  key={material.rfid_id}
                  className="group/row border-b border-ash/25 transition-colors hover:bg-[#ebe6dc]/60"
                  style={{
                    animation: 'fade-up 0.45s ease-out both',
                    animationDelay: `${80 + rowIndex * 70}ms`,
                  }}
                >
                  {COLUMNS.map((col) => {
                    const isName = col.key === 'name'
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-4 align-top first:pl-1 last:pr-1 ${
                          isName
                            ? 'font-display text-base font-medium text-ink'
                            : 'text-sm text-stone'
                        }`}
                      >
                        {isName ? (
                          <div className="flex items-start gap-3">
                            {material.image_url && (
                              <img
                                src={material.image_url}
                                alt=""
                                className="mt-0.5 h-10 w-10 shrink-0 rounded-sm object-cover"
                              />
                            )}
                            <div>
                              <div>{material.name}</div>
                              {material.datasheet_url && (
                                <a
                                  href={material.datasheet_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-block text-[0.7rem] tracking-wide text-accent hover:opacity-70"
                                >
                                  Datasheet →
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          cellValue(material, col.key)
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
