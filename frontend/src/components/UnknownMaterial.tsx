type UnknownMaterialProps = {
  rfidId: string
}

export function UnknownMaterial({ rfidId }: UnknownMaterialProps) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-8 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 45%, #d4cfc5 0%, #ebe7df 55%, #f2efe9 100%)',
        }}
      />
      <div className="relative z-10 max-w-lg animate-fade-up">
        <p className="mb-4 text-xs font-medium tracking-[0.3em] text-mist uppercase">
          Unregistered Sample
        </p>
        <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">
          No material found
        </h1>
        <p className="mt-5 text-base text-stone">
          Tag <span className="font-medium text-ink">{rfidId}</span> is not linked
          to a row in the materials library.
        </p>
      </div>
    </div>
  )
}
