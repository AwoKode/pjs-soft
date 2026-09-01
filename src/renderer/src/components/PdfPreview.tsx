import { useEffect, useRef, useState } from 'react'
import type { Offer, Template } from '@shared/types'
import { pl } from '../i18n/pl'

/**
 * Live preview of the offer.
 *
 * The preview is the real PDF: the main process runs exactly the same
 * printToPDF pipeline the export uses and hands back the bytes, which we show
 * in Chromium's built-in viewer. There is therefore no way for the preview and
 * the exported file to drift apart.
 */
export function PdfPreview({
  offer,
  template,
  debounceMs = 300
}: {
  offer: Offer
  template: Template
  debounceMs?: number
}): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const currentUrl = useRef<string | null>(null)

  const signature = JSON.stringify({ offer, template })

  useEffect(() => {
    const id = ++requestId.current
    setBusy(true)
    const timer = setTimeout(async () => {
      try {
        const bytes = await window.api.pdf.render(offer, template)
        if (id !== requestId.current) return // a newer render already started
        // .slice() gives a standalone ArrayBuffer, which is what BlobPart wants.
        const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
        const next = URL.createObjectURL(blob)
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
        currentUrl.current = next
        setUrl(next)
        setError(null)
      } catch (e) {
        if (id !== requestId.current) return
        setError(e instanceof Error ? e.message : pl.common.unknownError)
      } finally {
        if (id === requestId.current) setBusy(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, debounceMs])

  // Release the last blob when the preview goes away.
  useEffect(() => {
    return () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
      currentUrl.current = null
    }
  }, [])

  return (
    <div className="preview-wrap">
      {busy ? <div className="preview-status">{pl.offers.exporting}</div> : null}
      {error ? (
        <div className="preview-error">
          <strong>Nie udało się wygenerować podglądu.</strong>
          <p>{error}</p>
        </div>
      ) : url ? (
        <iframe title="preview" src={`${url}#toolbar=1&navpanes=0`} />
      ) : null}
    </div>
  )
}
