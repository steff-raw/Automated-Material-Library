import { useEffect, useState, type FormEvent } from 'react'
import { listProjects, type Project } from '../lib/projects'

type ProjectSetupProps = {
  onBack: () => void
  onStart: (projectName: string, roomName: string) => Promise<void>
}

/** Asks for the project and first room before the material wall opens. */
export function ProjectSetup({ onBack, onStart }: ProjectSetupProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectName, setProjectName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!projectName.trim() || !roomName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onStart(projectName.trim(), roomName.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open project')
      setBusy(false)
    }
  }

  const inputClass =
    'mt-1.5 w-full border border-ash/50 bg-paper/80 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent'

  return (
    <div className="relative flex min-h-full items-center justify-center bg-paper px-6 py-12">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-6 left-6 text-xs font-medium tracking-[0.2em] text-mist uppercase transition-colors hover:text-ink"
      >
        ← Home
      </button>

      <form onSubmit={submit} className="w-full max-w-md animate-fade-up">
        <p className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
          View Material Assets
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Start a palette
        </h1>
        <p className="mt-2 text-sm text-stone">
          Name the project and the room. An existing project opens with its saved rooms.
        </p>

        <label className="mt-8 block">
          <span className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
            Project name
          </span>
          <input
            list="project-names"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            autoFocus
            placeholder="Harbor Civic Center"
            className={inputClass}
          />
          <datalist id="project-names">
            {projects.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </label>

        <label className="mt-5 block">
          <span className="text-[0.65rem] font-medium tracking-[0.25em] text-mist uppercase">
            Room name
          </span>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            placeholder="Lobby"
            className={inputClass}
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

        <button
          type="submit"
          disabled={busy || !projectName.trim() || !roomName.trim()}
          className="mt-8 w-full bg-ink px-6 py-4 text-xs font-medium tracking-[0.2em] text-paper uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Opening…' : 'Open room'}
        </button>
      </form>
    </div>
  )
}
