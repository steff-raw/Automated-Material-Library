import { useEffect, useState, type FormEvent } from 'react'
import { useTagScan } from '../hooks/useTagScan'
import { bridgeHeaders, bridgeUrl } from '../lib/bridge'
import { saveCustomMaterial } from '../lib/localMaterials'
import { supabase } from '../lib/supabase'
import type { Material } from '../types'

type AddMaterialPageProps = {
  onBack: () => void
  onSaved: () => void
}

type FormState = {
  rfid_id: string
  name: string
  supplier: string
  cost_per_unit: string
  fire_rating: string
  acoustic_rating: string
  sustainability_cert: string
  spec_section: string
  projects_used_in: string
  image_url: string
  datasheet_url: string
}

const emptyForm: FormState = {
  rfid_id: '',
  name: '',
  supplier: '',
  cost_per_unit: '',
  fire_rating: '',
  acoustic_rating: '',
  sustainability_cert: '',
  spec_section: '',
  projects_used_in: '',
  image_url: '',
  datasheet_url: '',
}

function Field({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string
  name: keyof FormState
  value: string
  onChange: (name: keyof FormState, value: string) => void
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[0.65rem] font-medium tracking-[0.2em] text-mist uppercase">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        className="mt-1.5 w-full border border-ash/50 bg-paper/80 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  )
}

export function AddMaterialPage({ onBack, onSaved }: AddMaterialPageProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Live mode captures the UID by tapping the tag; demo mode keeps a text field
  const scan = useTagScan()
  const rfid = scan.listening ? (scan.uid ?? '') : form.rfid_id.trim().toUpperCase()
  const [linkedTo, setLinkedTo] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !scan.uid) return
    let cancelled = false
    void supabase
      .from('materials')
      .select('name')
      .eq('rfid_id', scan.uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLinkedTo((data as { name: string } | null)?.name ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [scan.uid])

  function update(name: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!rfid) {
      setError('Tap the sample’s tag on the reader first.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload = {
      rfid_id: rfid,
      name: form.name.trim(),
      supplier: form.supplier.trim() || null,
      cost_per_unit: form.cost_per_unit.trim() || null,
      fire_rating: form.fire_rating.trim() || null,
      acoustic_rating: form.acoustic_rating.trim() || null,
      sustainability_cert: form.sustainability_cert.trim() || null,
      spec_section: form.spec_section.trim() || null,
      projects_used_in: form.projects_used_in
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      image_url: form.image_url.trim() || null,
      datasheet_url: form.datasheet_url.trim() || null,
    }

    try {
      if (bridgeUrl) {
        const res = await fetch(`${bridgeUrl}/materials`, {
          method: 'POST',
          headers: bridgeHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail ?? `Save failed (${res.status})`)
        }
        const data = (await res.json()) as { material?: Material }
        if (data.material) {
          saveCustomMaterial(data.material)
        } else {
          saveCustomMaterial({
            id: crypto.randomUUID(),
            ...payload,
          })
        }
      } else {
        saveCustomMaterial({
          id: crypto.randomUUID(),
          ...payload,
        })
      }

      setSuccess(`Saved “${payload.name}”. It is available in View Material Assets.`)
      setForm(emptyForm)
      scan.reset()
      setLinkedTo(null)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save material')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-full overflow-auto bg-paper">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ebe7df 0%, #f2efe9 40%, #f2efe9 100%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-12">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium tracking-[0.2em] text-mist uppercase transition-colors hover:text-ink"
        >
          ← Home
        </button>

        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Add Material Asset
        </h1>
        <p className="mt-2 max-w-xl text-sm text-stone sm:text-base">
          Tap the sample’s RFID tag on the reader, then enter its specification data.
          {!bridgeUrl && (
            <span className="block mt-1 text-mist">
              Demo mode: saved locally in this browser.
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2">
            {scan.listening ? (
              <div className="sm:col-span-2 border border-ash/50 bg-paper/80 px-4 py-4">
                <span className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
                  RFID tag
                </span>
                {scan.uid ? (
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <span className="font-display text-xl text-ink">{scan.uid}</span>
                      <span className="ml-3 text-sm text-stone">
                        {linkedTo
                          ? `Linked to ${linkedTo} — saving replaces it`
                          : 'New tag'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        scan.reset()
                        setLinkedTo(null)
                      }}
                      className="text-xs tracking-[0.15em] text-mist uppercase hover:text-ink"
                    >
                      Scan again
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 font-display text-xl text-mist animate-pulse-soft">
                    Tap the sample’s tag on the reader…
                  </p>
                )}
              </div>
            ) : (
              <Field
                label="RFID ID"
                name="rfid_id"
                value={form.rfid_id}
                onChange={update}
                required
                placeholder="04A1B2C3"
              />
            )}
            <Field
              label="Name"
              name="name"
              value={form.name}
              onChange={update}
              required
              placeholder="Quarry Ash Porcelain"
            />
            <Field
              label="Supplier"
              name="supplier"
              value={form.supplier}
              onChange={update}
            />
            <Field
              label="Cost per unit"
              name="cost_per_unit"
              value={form.cost_per_unit}
              onChange={update}
              placeholder="$48 / sf"
            />
            <Field
              label="Fire rating"
              name="fire_rating"
              value={form.fire_rating}
              onChange={update}
            />
            <Field
              label="Acoustic rating"
              name="acoustic_rating"
              value={form.acoustic_rating}
              onChange={update}
            />
            <Field
              label="Sustainability cert"
              name="sustainability_cert"
              value={form.sustainability_cert}
              onChange={update}
            />
            <Field
              label="Spec section"
              name="spec_section"
              value={form.spec_section}
              onChange={update}
            />
          </section>

          <section className="space-y-4">
            <Field
              label="Projects used in"
              name="projects_used_in"
              value={form.projects_used_in}
              onChange={update}
              placeholder="Comma-separated project names"
            />
            <Field
              label="Image URL"
              name="image_url"
              value={form.image_url}
              onChange={update}
              placeholder="https://…"
            />
            <Field
              label="Datasheet URL"
              name="datasheet_url"
              value={form.datasheet_url}
              onChange={update}
              placeholder="https://…"
            />
          </section>

          {error && (
            <p className="border border-red-900/20 bg-red-950/5 px-4 py-3 text-sm text-red-900/80">
              {error}
            </p>
          )}
          {success && (
            <p className="border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-accent">
              {success}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !rfid}
              className="bg-ink px-6 py-3 text-xs font-medium tracking-[0.2em] text-paper uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Asset'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="border border-ink/15 px-6 py-3 text-xs font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:bg-ink/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
