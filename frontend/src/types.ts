export type Material = {
  id: string
  rfid_id: string
  name: string
  supplier: string | null
  cost_per_unit: string | null
  fire_rating: string | null
  acoustic_rating: string | null
  sustainability_cert: string | null
  spec_section: string | null
  projects_used_in: string[] | null
  image_url: string | null
  datasheet_url: string | null
}

export type ActiveScan = {
  rfid_id: string
  scanned_at: string
}
