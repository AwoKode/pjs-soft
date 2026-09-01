import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Offer, OfferItem, Product, Template } from '@shared/types'
import { formatNumber, formatPln, parseDecimal } from '@shared/format'
import { pl } from '../i18n/pl'
import { Field } from '../components/ui'
import { PdfPreview } from '../components/PdfPreview'
import { Thumb } from '../components/ImagePicker'

const AUTOSAVE_MS = 700

export function OfertaEdytor({
  offerId,
  templates,
  notify,
  onBack
}: {
  offerId: string
  templates: Template[]
  notify: (msg: string, error?: boolean) => void
  onBack: () => void
}): JSX.Element {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void Promise.all([window.api.offers.get(offerId), window.api.products.list()]).then(
      ([loaded, list]) => {
        setOffer(loaded)
        setProducts(list)
      }
    )
  }, [offerId])

  // --- Autosave -----------------------------------------------------------
  const pending = useRef<Offer | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const value = pending.current
    if (!value) return
    pending.current = null
    const { id, createdAt: _c, updatedAt: _u, ...patch } = value
    try {
      await window.api.offers.update(id, patch)
      setDirty(false)
    } catch (e) {
      notify(e instanceof Error ? e.message : pl.common.unknownError, true)
    }
  }, [notify])

  const patch = useCallback(
    (changes: Partial<Offer>) => {
      setOffer((prev) => {
        if (!prev) return prev
        const next = { ...prev, ...changes }
        pending.current = next
        setDirty(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void flush(), AUTOSAVE_MS)
        return next
      })
    },
    [flush]
  )

  // Never leave the editor with an unsaved change still queued.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  const template = useMemo(
    () => templates.find((t) => t.id === offer?.templateId) ?? templates[0],
    [templates, offer?.templateId]
  )

  if (!offer || !template) {
    return <div className="page-body">{pl.common.loading}</div>
  }

  async function exportPdf(): Promise<void> {
    if (!offer || !template) return
    setExporting(true)
    try {
      await flush()
      const result = await window.api.pdf.export(offer, template)
      if (!result.canceled) {
        notify(`${pl.offers.exported}: ${result.path}`, false)
        void window.api.pdf.open(result.path)
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : pl.common.unknownError, true)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button className="btn ghost" onClick={onBack}>
            ← {pl.common.back}
          </button>
          <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {offer.title || pl.offers.new}
          </h1>
          <span className="badge">{dirty ? 'zapisywanie...' : pl.common.saved}</span>
        </div>
        <div className="head-actions">
          <div className="tabs">
            <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>
              {pl.offers.tabEdit}
            </button>
            <button
              className={tab === 'preview' ? 'active' : ''}
              onClick={async () => {
                await flush()
                setTab('preview')
              }}
            >
              {pl.offers.tabPreview}
            </button>
          </div>
          <button className="btn primary" onClick={exportPdf} disabled={exporting}>
            {exporting ? pl.offers.exporting : pl.offers.exportPdf}
          </button>
        </div>
      </div>

      <div className="offer-meta">
        <Field label={pl.offers.fields.number}>
          <input
            className="input"
            value={offer.number}
            onChange={(e) => patch({ number: e.target.value })}
          />
        </Field>
        <Field label={pl.offers.fields.title}>
          <input
            className="input"
            value={offer.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>
        <Field label={pl.offers.fields.customer}>
          <input
            className="input"
            value={offer.customer}
            onChange={(e) => patch({ customer: e.target.value })}
          />
        </Field>
        <Field label={pl.offers.fields.template}>
          <select
            className="input"
            value={offer.templateId}
            onChange={(e) => patch({ templateId: e.target.value })}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={pl.offers.fields.date}>
          <input
            className="input"
            type="date"
            value={offer.date.slice(0, 10)}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </Field>
        <Field label={pl.offers.fields.validUntil}>
          <input
            className="input"
            type="date"
            value={offer.validUntil?.slice(0, 10) ?? ''}
            onChange={(e) => patch({ validUntil: e.target.value || null })}
          />
        </Field>
        <div style={{ gridColumn: 'span 2' }}>
          <Field label={pl.offers.fields.notes}>
            <input
              className="input"
              value={offer.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="page-body flush">
        {tab === 'preview' ? (
          <PdfPreview offer={offer} template={template} />
        ) : (
          <EditPanes offer={offer} products={products} patch={patch} />
        )}
      </div>
    </>
  )
}

function EditPanes({
  offer,
  products,
  patch
}: {
  offer: Offer
  products: Product[]
  patch: (changes: Partial<Offer>) => void
}): JSX.Element {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const inOffer = useMemo(() => new Set(offer.items.map((i) => i.productId)), [offer.items])

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => !inOffer.has(p.id))
      .filter((p) => !q || [p.name, p.title, p.packaging].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [products, inOffer, query])

  function addSelected(): void {
    if (selected.size === 0) return
    const start = offer.items.length
    const added: OfferItem[] = [...selected].map((productId, index) => ({
      productId,
      order: start + index,
      quantity: null,
      priceOverride: null
    }))
    patch({ items: [...offer.items, ...added] })
    setSelected(new Set())
  }

  return (
    <div className="split">
      <div className="pane" style={{ flex: '0 0 340px' }}>
        <h2 className="pane-title">{pl.offers.catalogue}</h2>
        <div className="search" style={{ maxWidth: 'none', marginBottom: 10 }}>
          <input
            className="input"
            placeholder={pl.common.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {available.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            {products.length === 0 ? pl.products.emptyHint : pl.offers.allAdded}
          </p>
        ) : (
          available.map((product) => (
            <label key={product.id} className="picker-item">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={(e) => {
                  const next = new Set(selected)
                  if (e.target.checked) next.add(product.id)
                  else next.delete(product.id)
                  setSelected(next)
                }}
              />
              <div className="picker-name">
                <div>
                  <strong>{product.name}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {[product.title, formatPln(product.price)].filter(Boolean).join(' · ')}
                </div>
              </div>
            </label>
          ))
        )}

        <button
          className="btn primary"
          style={{ marginTop: 12, width: '100%' }}
          onClick={addSelected}
          disabled={selected.size === 0}
        >
          {pl.offers.addSelected} {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
      </div>

      <div className="pane" style={{ flex: '1 1 auto' }}>
        <h2 className="pane-title">{pl.offers.lines(offer.items.length)}</h2>
        <OfferLines offer={offer} products={products} patch={patch} />
      </div>
    </div>
  )
}

function OfferLines({
  offer,
  products,
  patch
}: {
  offer: Offer
  products: Product[]
  patch: (changes: Partial<Offer>) => void
}): JSX.Element {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  // Free-text buffer so a half-typed price like "6," is not clobbered.
  const [priceText, setPriceText] = useState<Record<string, string>>({})

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const ordered = useMemo(
    () => [...offer.items].sort((a, b) => a.order - b.order),
    [offer.items]
  )

  function updateItem(productId: string, changes: Partial<OfferItem>): void {
    patch({
      items: offer.items.map((item) =>
        item.productId === productId ? { ...item, ...changes } : item
      )
    })
  }

  function removeItem(productId: string): void {
    patch({
      items: offer.items
        .filter((item) => item.productId !== productId)
        .map((item, index) => ({ ...item, order: index }))
    })
  }

  function reorder(from: number, to: number): void {
    if (from === to) return
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    patch({ items: next.map((item, index) => ({ ...item, order: index })) })
  }

  if (ordered.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>{pl.offers.noLines}</p>
  }

  return (
    <>
      {ordered.map((item, index) => {
        const product = byId.get(item.productId)
        if (!product) return null
        const effective = item.priceOverride ?? product.price
        const overridden = item.priceOverride !== null && item.priceOverride !== product.price
        const text = priceText[item.productId] ?? formatNumber(effective)

        return (
          <div
            key={item.productId}
            className={overIndex === index ? 'line-row drag-over' : 'line-row'}
            onDragOver={(e) => {
              e.preventDefault()
              setOverIndex(index)
            }}
            onDragLeave={() => setOverIndex((cur) => (cur === index ? null : cur))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex !== null) reorder(dragIndex, index)
              setDragIndex(null)
              setOverIndex(null)
            }}
          >
            <span
              className="grip"
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              title={pl.offers.reorderHint}
            >
              ⠿
            </span>
            <Thumb file={product.image} />
            <div className="line-name">
              <div>{product.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {[product.title, product.packaging].filter(Boolean).join(' · ')}
              </div>
            </div>

            <span className="catalogue">
              {pl.offers.catalogPrice} {formatPln(product.price)}
            </span>

            <input
              className={overridden ? 'input price-changed' : 'input'}
              inputMode="decimal"
              title={pl.offers.offerPrice}
              value={text}
              onChange={(e) => {
                const raw = e.target.value
                setPriceText((prev) => ({ ...prev, [item.productId]: raw }))
                const parsed = parseDecimal(raw)
                if (parsed !== null && parsed >= 0) {
                  updateItem(item.productId, { priceOverride: parsed })
                }
              }}
              onBlur={() =>
                setPriceText((prev) => {
                  const next = { ...prev }
                  delete next[item.productId]
                  return next
                })
              }
            />

            <input
              className="input qty"
              type="number"
              min={0}
              placeholder={pl.offers.quantity}
              title={pl.offers.quantity}
              value={item.quantity ?? ''}
              onChange={(e) =>
                updateItem(item.productId, {
                  quantity: e.target.value === '' ? null : Math.max(0, Number(e.target.value))
                })
              }
            />

            <button
              className="btn ghost small"
              title={pl.offers.resetPrice}
              disabled={item.priceOverride === null}
              onClick={() => {
                setPriceText((prev) => {
                  const next = { ...prev }
                  delete next[item.productId]
                  return next
                })
                updateItem(item.productId, { priceOverride: null })
              }}
            >
              ↺
            </button>
            <button
              className="btn ghost small"
              title={pl.offers.remove}
              onClick={() => removeItem(item.productId)}
            >
              ✕
            </button>
          </div>
        )
      })}
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{pl.offers.reorderHint}</p>
    </>
  )
}
