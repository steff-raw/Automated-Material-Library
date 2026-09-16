import type { Material } from '../types'
import { DEMO_MATERIALS } from '../data/demoMaterials'

const STORAGE_KEY = 'aml_custom_materials'

export function loadCustomMaterials(): Material[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Material[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomMaterial(material: Material): void {
  const existing = loadCustomMaterials().filter((m) => m.rfid_id !== material.rfid_id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([material, ...existing]))
}

export function getAllLocalMaterials(): Material[] {
  const custom = loadCustomMaterials()
  const customIds = new Set(custom.map((m) => m.rfid_id))
  return [...custom, ...DEMO_MATERIALS.filter((m) => !customIds.has(m.rfid_id))]
}
