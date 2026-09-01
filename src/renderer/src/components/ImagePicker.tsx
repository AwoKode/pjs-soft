import { useState } from 'react'
import type { ImageKind } from '@shared/types'
import { pl } from '../i18n/pl'

/**
 * Click to open the native picker, or drop a file straight onto the box.
 * Either way the main process copies and downscales it, and we keep only the
 * stored file name.
 */
export function ImagePicker({
  kind,
  value,
  onChange,
  onError
}: {
  kind: ImageKind
  value: string | null
  onChange: (fileName: string | null) => void
  onError?: (message: string) => void
}): JSX.Element {
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(task: () => Promise<string | null>): Promise<void> {
    setBusy(true)
    try {
      const file = await task()
      if (file) onChange(file)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : pl.common.unknownError)
    } finally {
      setBusy(false)
      setOver(false)
    }
  }

  const pick = (): Promise<void> => run(() => window.api.images.pick(kind))

  function onDrop(event: React.DragEvent): void {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) {
      setOver(false)
      return
    }
    if (!file.type.startsWith('image/')) {
      onError?.('To nie jest plik obrazu.')
      setOver(false)
      return
    }
    const path = window.api.images.pathForFile(file)
    void run(() => window.api.images.import(kind, path))
  }

  return (
    <div>
      <div
        className={over ? 'image-drop over' : 'image-drop'}
        onClick={busy ? undefined : pick}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {busy ? (
          <span>{pl.common.loading}</span>
        ) : value ? (
          <img src={window.api.images.url(kind, value)} alt="" />
        ) : (
          <>
            <strong>{pl.image.choose}</strong>
            <span>{pl.image.dropHint}</span>
          </>
        )}
      </div>
      {value ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn small" onClick={pick} disabled={busy}>
            {pl.image.change}
          </button>
          <button
            type="button"
            className="btn small danger"
            onClick={() => {
              // The file itself is cleaned up when the record is deleted or replaced.
              onChange(null)
            }}
            disabled={busy}
          >
            {pl.image.remove}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Small square thumbnail used in list views. */
export function Thumb({ file }: { file: string | null }): JSX.Element {
  if (!file) return <div className="thumb placeholder">–</div>
  return <img className="thumb" src={window.api.images.url('products', file)} alt="" />
}
