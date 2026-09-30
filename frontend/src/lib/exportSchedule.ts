import type { Material } from '../types'
import type { Room } from './projects'

const COLUMNS: { header: string; width: number; value: (m: Material) => string }[] = [
  { header: 'Material', width: 30, value: (m) => m.name },
  { header: 'Supplier', width: 24, value: (m) => m.supplier ?? '' },
  { header: 'Spec Section', width: 30, value: (m) => m.spec_section ?? '' },
  { header: 'Cost per Unit', width: 16, value: (m) => m.cost_per_unit ?? '' },
  { header: 'Fire Rating', width: 20, value: (m) => m.fire_rating ?? '' },
  { header: 'Acoustic Rating', width: 16, value: (m) => m.acoustic_rating ?? '' },
  { header: 'Sustainability', width: 26, value: (m) => m.sustainability_cert ?? '' },
  { header: 'Projects Used In', width: 34, value: (m) => (m.projects_used_in ?? []).join(', ') },
  { header: 'Datasheet', width: 40, value: (m) => m.datasheet_url ?? '' },
  { header: 'RFID Tag', width: 18, value: (m) => m.rfid_id ?? '' },
]

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Project'
}

/** One sheet: title block, then one row per material grouped by room (tab order). */
export async function exportSchedule(
  projectName: string,
  rooms: Room[],
  palettes: Record<string, Material[]>,
): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const header = [
    { value: 'Room', fontWeight: 'bold' as const, backgroundColor: '#E8E3DA' },
    { value: 'Item', fontWeight: 'bold' as const, backgroundColor: '#E8E3DA' },
    ...COLUMNS.map((c) => ({
      value: c.header,
      fontWeight: 'bold' as const,
      backgroundColor: '#E8E3DA',
    })),
  ]

  const rows = rooms.flatMap((room, roomIndex) =>
    (palettes[room.id] ?? []).map((material, i) => [
      room.name,
      `${roomIndex + 1}.${String(i + 1).padStart(2, '0')}`,
      ...COLUMNS.map((c) => c.value(material)),
    ]),
  )

  const data = [
    [{ value: `${projectName} — Material Schedule`, fontWeight: 'bold' as const, fontSize: 14 }],
    [`Exported ${new Date().toLocaleDateString()} · ${rooms.length} rooms · ${rows.length} items`],
    [],
    header,
    ...rows,
  ]

  await writeXlsxFile(data, {
    sheet: 'Schedule',
    columns: [{ width: 20 }, { width: 8 }, ...COLUMNS.map((c) => ({ width: c.width }))],
    stickyRowsCount: 4,
  }).toFile(`${sanitizeFilename(projectName)} - Material Schedule.xlsx`)
}
