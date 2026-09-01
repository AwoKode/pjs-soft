import { useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasEdit, Company, Offer, Product, Template } from '@shared/types'
import { renderOfferHtml } from '@shared/render/document'

/**
 * The editable page. It renders the very same HTML the PDF is printed from,
 * with mode 'canvas' adding drag handles, and reports edits back as the user
 * moves things around.
 */
export function TemplateCanvas({
  offer,
  products,
  company,
  template,
  zoom,
  onEdit,
  onSelect
}: {
  offer: Offer
  products: Product[]
  company: Company
  template: Template
  zoom: number
  onEdit: (edit: CanvasEdit) => void
  onSelect?: (target: string) => void
}): JSX.Element {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(1200)

  const html = useMemo(
    () =>
      renderOfferHtml({
        offer,
        products,
        template,
        company,
        mode: 'canvas',
        imageUrl: (kind, file) => window.api.images.url(kind, file)
      }),
    [offer, products, template, company]
  )

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      const data = event.data
      if (!data || data.source !== 'pjs-canvas') return
      if (typeof data.height === 'number') {
        setHeight(Math.max(600, data.height + 40))
        return
      }
      const edit = data.edit as CanvasEdit | undefined
      if (!edit) return
      if (edit.op === 'select') onSelect?.(edit.target)
      else onEdit(edit)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onEdit, onSelect])

  // A4 at 96dpi; the sheet inside is sized in millimetres and must not wrap.
  const frameWidth = template.page.orientation === 'landscape' ? 1123 : 794

  return (
    <div className="canvas-scroll">
      <div
        style={{
          width: frameWidth * zoom,
          height: height * zoom,
          margin: '0 auto'
        }}
      >
        <iframe
          ref={frame}
          title="canvas"
          srcDoc={html}
          style={{
            width: frameWidth,
            height,
            border: 0,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            display: 'block'
          }}
        />
      </div>
    </div>
  )
}
