import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@shared/types'
import { emptyProduct } from '@shared/defaults'
import { formatNumber, formatPln, parseDecimal } from '@shared/format'
import { pl } from '../i18n/pl'
import { ImagePicker, Thumb } from '../components/ImagePicker'
import { ConfirmDialog, EmptyState, Field, type ConfirmSpec } from '../components/ui'

type Draft = Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
type Errors = Partial<Record<'name' | 'price' | 'minSellQuantity', string>>

export function Produkty({ notify }: { notify: (msg: string, error?: boolean) => void }): JSX.Element {
  const [items, setItems] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  async function reload(): Promise<void> {
    setItems(await window.api.products.list())
  }

  useEffect(() => {
    void reload()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    if (!q) return sorted
    return sorted.filter((p) =>
      [p.name, p.title, p.packaging].some((v) => v.toLowerCase().includes(q))
    )
  }, [items, query])

  function askDelete(product: Product): void {
    void window.api.products.usage(product.id).then((offers) => {
      setConfirm({
        title: pl.products.deleteTitle,
        body: pl.products.deleteBody(product.name),
        details: offers.length
          ? [pl.products.deleteUsage, ...offers.map((o) => `• ${o.title} ${o.number}`.trim())]
          : undefined,
        danger: true,
        onConfirm: async () => {
          try {
            await window.api.products.delete(product.id)
            setDraft(null)
            await reload()
            notify('Produkt usunięty.')
          } catch (e) {
            notify(e instanceof Error ? e.message : pl.common.unknownError, true)
          }
        }
      })
    })
  }

  return (
    <>
      <div className="page-head">
        <h1>{pl.products.title}</h1>
        <div className="head-actions">
          <button className="btn primary" onClick={() => setDraft(emptyProduct())}>
            + {pl.products.new}
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div className="search">
            <input
              className="input"
              placeholder={pl.common.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="count">{pl.products.count(filtered.length)}</span>
        </div>

        {items.length === 0 ? (
          <div className="card">
            <EmptyState
              title={pl.products.emptyTitle}
              hint={pl.products.emptyHint}
              action={
                <button className="btn primary" onClick={() => setDraft(emptyProduct())}>
                  + {pl.products.new}
                </button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState title={pl.products.noResults} />
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 60 }} />
                  <th>{pl.products.fields.name}</th>
                  <th style={{ width: 130 }}>{pl.products.fields.title}</th>
                  <th style={{ width: 190 }}>{pl.products.fields.packaging}</th>
                  <th className="num" style={{ width: 90 }}>
                    Min.
                  </th>
                  <th className="num" style={{ width: 120 }}>
                    {pl.products.fields.price}
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className={draft?.id === product.id ? 'selected' : undefined}
                    onClick={() => setDraft({ ...product })}
                  >
                    <td>
                      <Thumb file={product.image} />
                    </td>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.title}</td>
                    <td>{product.packaging}</td>
                    <td className="num">{formatNumber(product.minSellQuantity, 0)}</td>
                    <td className="num">{formatPln(product.price)}</td>
                    <td>
                      <button
                        className="btn ghost small"
                        title={pl.common.delete}
                        onClick={(e) => {
                          e.stopPropagation()
                          askDelete(product)
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {draft ? (
        <ProductPanel
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null)
            await reload()
          }}
          notify={notify}
        />
      ) : null}

      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

function ProductPanel({
  draft,
  onClose,
  onSaved,
  notify
}: {
  draft: Draft
  onClose: () => void
  onSaved: () => void | Promise<void>
  notify: (msg: string, error?: boolean) => void
}): JSX.Element {
  const [form, setForm] = useState<Draft>(draft)
  const [priceText, setPriceText] = useState(
    draft.price ? formatNumber(draft.price) : ''
  )
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(draft)
    setPriceText(draft.price ? formatNumber(draft.price) : '')
    setErrors({})
  }, [draft])

  function set<K extends keyof Draft>(key: K, value: Draft[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save(): Promise<void> {
    const price = parseDecimal(priceText) ?? 0
    const next: Errors = {}
    if (!form.name.trim()) next.name = pl.common.required
    if (priceText.trim() && parseDecimal(priceText) === null) next.price = pl.common.invalidNumber
    if (price < 0) next.price = pl.common.invalidNumber
    if (!Number.isInteger(form.minSellQuantity) || form.minSellQuantity < 0) {
      next.minSellQuantity = pl.common.invalidNumber
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      const payload = { ...form, price, name: form.name.trim() }
      delete (payload as { id?: string }).id
      if (form.id) {
        await window.api.products.update(form.id, payload)
      } else {
        await window.api.products.create(payload)
      }
      notify(pl.common.saved)
      await onSaved()
    } catch (e) {
      notify(e instanceof Error ? e.message : pl.common.unknownError, true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="side-panel">
      <header>
        <h2>{form.id ? pl.products.edit : pl.products.new}</h2>
        <button className="btn ghost small" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="panel-body">
        <Field label={pl.products.fields.name} error={errors.name}>
          <input
            className={errors.name ? 'input invalid' : 'input'}
            value={form.name}
            autoFocus
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <Field label={pl.products.fields.title} hint={pl.products.fields.titleHint}>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>

        <Field label={pl.products.fields.packaging} hint={pl.products.fields.packagingHint}>
          <input
            className="input"
            value={form.packaging}
            onChange={(e) => set('packaging', e.target.value)}
          />
        </Field>

        <div className="field-row">
          <Field label={pl.products.fields.minSellQuantity} error={errors.minSellQuantity}>
            <input
              className={errors.minSellQuantity ? 'input invalid' : 'input'}
              type="number"
              min={0}
              step={1}
              value={form.minSellQuantity}
              onChange={(e) => set('minSellQuantity', Math.trunc(Number(e.target.value) || 0))}
            />
          </Field>
          <Field label={pl.products.fields.price} error={errors.price}>
            <input
              className={errors.price ? 'input invalid' : 'input'}
              inputMode="decimal"
              placeholder="0,00"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
            />
          </Field>
        </div>

        <Field label={pl.products.fields.image}>
          <ImagePicker
            kind="products"
            value={form.image}
            onChange={(file) => set('image', file)}
            onError={(msg) => notify(msg, true)}
          />
        </Field>
      </div>

      <footer>
        <button className="btn" onClick={onClose}>
          {pl.common.cancel}
        </button>
        <button className="btn primary" onClick={save} disabled={saving}>
          {pl.common.save}
        </button>
      </footer>
    </aside>
  )
}
