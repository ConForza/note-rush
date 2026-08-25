import type { NotePrompt } from './features/game/domain'
import { MusicStaff } from './features/game/notation'

const treblePrompt: NotePrompt = {
  pitch: { note: 'C', octave: 4 },
  clef: 'treble',
}

const bassPrompt: NotePrompt = {
  pitch: { note: 'C', octave: 4 },
  clef: 'bass',
}

function App() {
  return (
    <main className="app-shell">
      <section className="preview-card" aria-labelledby="app-title">
        <p className="eyebrow">Notation renderer preview</p>
        <h1 id="app-title">Note Rush</h1>
        <p className="subtitle">Music note-reading game</p>

        <div className="staff-previews">
          <section className="staff-preview" aria-labelledby="treble-preview-title">
            <h2 id="treble-preview-title">Treble</h2>
            <MusicStaff prompt={treblePrompt} />
          </section>
          <section className="staff-preview" aria-labelledby="bass-preview-title">
            <h2 id="bass-preview-title">Bass</h2>
            <MusicStaff prompt={bassPrompt} />
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
