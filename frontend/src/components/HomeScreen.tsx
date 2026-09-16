type HomeScreenProps = {
  onAdd: () => void
  onView: () => void
}

export function HomeScreen({ onAdd, onView }: HomeScreenProps) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 20% 20%, #ddd8ce 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 85% 75%, #d4cec3 0%, transparent 50%), linear-gradient(160deg, #f2efe9 0%, #e8e3da 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
        <p className="animate-fade-up text-xs font-medium tracking-[0.35em] text-mist uppercase">
          Materials Sample Library
        </p>
        <h1 className="animate-fade-up mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Material assets
          <br />
          for the studio table
        </h1>
        <p className="animate-fade-up-delay mt-5 max-w-xl text-base text-stone sm:text-lg">
          Register a new sample for RFID lookup, or open the live table view to
          present assets as they are placed.
        </p>

        <div className="animate-fade-up-delay mt-12 grid max-w-3xl gap-4 sm:grid-cols-2 sm:gap-5">
          <button
            type="button"
            onClick={onAdd}
            className="group relative overflow-hidden border border-ink/10 bg-paper/70 px-6 py-8 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-md"
          >
            <span className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
              Catalog
            </span>
            <span className="mt-3 block font-display text-2xl font-medium text-ink sm:text-3xl">
              Add Material Asset
            </span>
            <span className="mt-3 block text-sm leading-relaxed text-stone">
              Enter specs, image, and RFID ID for a new sample in the library.
            </span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-accent transition-opacity group-hover:opacity-80">
              Continue
              <span aria-hidden="true">→</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onView}
            className="group relative overflow-hidden border border-ink/10 bg-ink px-6 py-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-[0.65rem] font-medium tracking-[0.25em] text-ash uppercase">
              Presentation
            </span>
            <span className="mt-3 block font-display text-2xl font-medium text-paper sm:text-3xl">
              View Material Assets
            </span>
            <span className="mt-3 block text-sm leading-relaxed text-ash">
              Open the table display — place samples and compare textures live.
            </span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-paper/90 transition-opacity group-hover:opacity-80">
              Open view
              <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
