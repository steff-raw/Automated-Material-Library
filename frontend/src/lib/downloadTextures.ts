import { saveAs } from 'file-saver'
import type { Material } from '../types'

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_')
  return cleaned || 'material'
}

function extensionFor(blob: Blob, url: string): string {
  const fromType = blob.type.split('/')[1]?.split(';')[0]
  if (fromType === 'jpeg') return 'jpg'
  if (fromType && fromType !== 'octet-stream') return fromType

  const path = url.split('?')[0]
  const match = path.match(/\.([a-zA-Z0-9]+)$/)
  if (match) {
    const ext = match[1].toLowerCase()
    return ext === 'jpeg' ? 'jpg' : ext
  }
  return 'jpg'
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uniqueStems(materials: Material[]): Map<string, string> {
  const used = new Map<string, number>()
  const result = new Map<string, string>()

  for (const material of materials) {
    const base = sanitizeFilename(material.name)
    const count = used.get(base) ?? 0
    used.set(base, count + 1)
    result.set(material.rfid_id, count === 0 ? base : `${base}_${count + 1}`)
  }
  return result
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/**
 * Downloads each material image as its own named file
 * (e.g. Quarry_Ash_Porcelain.jpg), then texture-information.csv.
 */
export async function downloadTexturePack(materials: Material[]): Promise<void> {
  if (materials.length === 0) return

  const stems = uniqueStems(materials)
  const infoRows: { material: Material; filename: string | null }[] = []

  for (const material of materials) {
    const stem = stems.get(material.rfid_id) ?? sanitizeFilename(material.name)

    if (!material.image_url) {
      infoRows.push({ material, filename: null })
      continue
    }

    try {
      const response = await fetch(material.image_url, { mode: 'cors' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const filename = `${stem}.${extensionFor(blob, material.image_url)}`
      saveAs(blob, filename)
      infoRows.push({ material, filename })
      await delay(350)
    } catch (err) {
      console.warn('Image download failed for', material.name, err)
      infoRows.push({ material, filename: null })
    }
  }

  const headers = [
    'name',
    'supplier',
    'cost_per_unit',
    'fire_rating',
    'acoustic_rating',
    'sustainability_cert',
    'spec_section',
    'projects_used_in',
    'rfid_id',
    'image_url',
    'datasheet_url',
    'image_filename',
  ]

  const lines = [
    headers.join(','),
    ...infoRows.map(({ material: m, filename }) =>
      [
        m.name,
        m.supplier ?? '',
        m.cost_per_unit ?? '',
        m.fire_rating ?? '',
        m.acoustic_rating ?? '',
        m.sustainability_cert ?? '',
        m.spec_section ?? '',
        (m.projects_used_in ?? []).join('; '),
        m.rfid_id,
        m.image_url ?? '',
        m.datasheet_url ?? '',
        filename ?? '',
      ]
        .map((v) => escapeCsv(String(v)))
        .join(','),
    ),
  ]

  saveAs(
    new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    'texture-information.csv',
  )
}
