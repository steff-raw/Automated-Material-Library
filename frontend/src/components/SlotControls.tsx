import { MAX_SLOTS, MIN_SLOTS } from '../hooks/useSlotCount'

type SlotControlsProps = {
  count: number
  onIncrement: () => void
  onDecrement: () => void
}

const buttonClass =
  'flex h-9 w-9 items-center justify-center rounded border border-ash/40 text-lg leading-none transition-colors hover:bg-paper/10 disabled:opacity-35'

/** − N + stepper for how many tiles the material wall shows. */
export function SlotControls({ count, onIncrement, onDecrement }: SlotControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onDecrement}
        disabled={count <= MIN_SLOTS}
        aria-label="Remove a slot"
        className={buttonClass}
      >
        −
      </button>
      <span className="min-w-[5.5rem] text-center text-[0.65rem] font-medium tracking-[0.2em] text-ash uppercase">
        {count} {count === 1 ? 'slot' : 'slots'}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={count >= MAX_SLOTS}
        aria-label="Add a slot"
        className={buttonClass}
      >
        +
      </button>
    </div>
  )
}
