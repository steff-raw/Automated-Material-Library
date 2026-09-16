export function IdleScreen() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-8 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #ddd8ce 0%, #ebe7df 45%, #f2efe9 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 animate-fade-up">
        <p className="mb-6 text-xs font-medium tracking-[0.35em] text-mist uppercase">
          Materials Sample Library
        </p>
        <div className="mx-auto mb-10 h-px w-16 bg-ash animate-breathe" />
        <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl md:text-6xl">
          Place a sample
          <br />
          on the table
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base text-stone animate-pulse-soft sm:text-lg">
          Rest an RFID-tagged material sample on the reader to view specifications.
        </p>
      </div>
    </div>
  )
}
