import { useEffect, useState } from 'react'
import { pl } from '../i18n/pl'
import { Field } from '../components/ui'
import { updateMessage, useUpdateStatus } from '../useUpdates'

export function Ustawienia({
  notify,
  onDataDirChanged
}: {
  notify: (msg: string, error?: boolean) => void
  onDataDirChanged: () => void
}): JSX.Element {
  const [dataDir, setDataDir] = useState('')
  const [version, setVersion] = useState('')
  const status = useUpdateStatus()

  useEffect(() => {
    void window.api.settings.get().then((s) => setDataDir(s.dataDir))
    void window.api.updates.version().then(setVersion)
  }, [])

  async function change(): Promise<void> {
    try {
      const result = await window.api.settings.chooseDataDir()
      if (result.changed) {
        setDataDir(result.dataDir)
        notify(pl.settings.restartNote)
        onDataDirChanged()
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : pl.common.unknownError, true)
    }
  }

  const message = updateMessage(status, pl.updates)
  const busy = status.state === 'checking' || status.state === 'downloading'

  return (
    <>
      <div className="page-head">
        <h1>{pl.settings.title}</h1>
      </div>

      <div className="page-body">
        <div className="card card-pad" style={{ maxWidth: 760 }}>
          <Field label={pl.settings.dataDir} hint={pl.settings.dataDirHint}>
            <input className="input" value={dataDir} readOnly />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={change}>
              {pl.settings.change}
            </button>
            <button className="btn" onClick={() => void window.api.settings.openDataDir()}>
              {pl.settings.openFolder}
            </button>
          </div>
        </div>

        <div className="card card-pad" style={{ maxWidth: 760, marginTop: 18 }}>
          <h3 style={{ marginTop: 0 }}>{pl.settings.about}</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {pl.app.name} — {pl.app.tagline}. Dane przechowywane są lokalnie w plikach JSON;
            program nie wymaga połączenia z internetem.
          </p>

          <p style={{ margin: '14px 0 10px' }}>
            {pl.updates.version} <strong>{version || pl.common.loading}</strong>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn"
              disabled={busy}
              onClick={() => void window.api.updates.check()}
            >
              {pl.updates.check}
            </button>
            {status.state === 'ready' && (
              <button className="btn primary" onClick={() => void window.api.updates.install()}>
                {pl.updates.install}
              </button>
            )}
            {message && <span style={{ color: 'var(--text-muted)' }}>{message}</span>}
          </div>

          <p style={{ color: 'var(--text-muted)', margin: '10px 0 0', fontSize: 12 }}>
            {pl.updates.portableNote}
          </p>
        </div>
      </div>
    </>
  )
}
