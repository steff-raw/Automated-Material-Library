export type ScanMode = 'add' | 'remove'

type ScanModeToggleProps = {
  mode: ScanMode
  onChange: (mode: ScanMode) => void
}

const base =
  'flex h-10 min-w-[7.5rem] items-center justify-center gap-2 rounded px-4 text-xs font-medium tracking-[0.18em] uppercase transition-colors'

/** + / − switch: what scanning a tag does on the material wall. */
export function ScanModeToggle({ mode, onChange }: ScanModeToggleProps) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Scan mode">
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'add'}
        onClick={() => onChange('add')}
        className={`${base} ${
          mode === 'add' ? 'bg-paper text-ink' : 'border border-ash/40 text-ash hover:bg-paper/10'
        }`}
      >
        <span className="text-base leading-none">+</span> Add
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'remove'}
        onClick={() => onChange('remove')}
        className={`${base} ${
          mode === 'remove'
            ? 'bg-red-800 text-paper'
            : 'border border-ash/40 text-ash hover:bg-paper/10'
        }`}
      >
        <span className="text-base leading-none">−</span> Remove
      </button>
    </div>
  )
}
