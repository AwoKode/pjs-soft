import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Box,
  CanvasEdit,
  Company,
  Offer,
  Product,
  ProductField,
  TableColumn,
  Template,
  TemplateLayout
} from '@shared/types'
import { FONT_CHOICES, PRODUCT_FIELD_LABELS, emptyCompany } from '@shared/defaults'
import { todayIso } from '@shared/format'
import { pl } from '../i18n/pl'
import { Checkbox, ConfirmDialog, Field, type ConfirmSpec } from '../components/ui'
import { AlignPicker, BoxField, ColorField, Num, Section, StyleEditor } from '../components/controls'
import { TemplateCanvas } from '../components/TemplateCanvas'
import { PdfPreview } from '../components/PdfPreview'

const AUTOSAVE_MS = 600

/** Stand-in products so the builder has something to lay out on an empty install. */
function sampleProducts(): Product[] {
  const now = new Date().toISOString()
  const make = (
    id: string,
    name: string,
    title: string,
    packaging: string,
    min: number,
    price: number
  ): Product => ({
    id,
    name,
    title,
    packaging,
    minSellQuantity: min,
    price,
    image: null,
    createdAt: now,
    updatedAt: now
  })
  return [
    make('s1', 'Yankee Candle Olive & Cypress', '567g', '4 szt / karton', 4, 57.15),
    make('s2', 'Head&Shoulders szampon Pro expert 7', '250 ml', '6 szt / karton', 6, 8.15),
    make('s3', 'Ariel Laundry Pods Colour 19szt', '', '12 szt / karton', 12, 14.5),
    make('s4', 'Dove deo Original', '150ml', '6 szt / karton', 6, 7.19)
  ]
}

function sampleOffer(templateId: string, products: Product[]): Offer {
  const now = new Date().toISOString()
  return {
    id: 'sample',
    number: 'OF/2026/08/31',
    title: 'Oferta Kosmetyki & Chemia',
    customer: 'Przykładowy klient Sp. z o.o.',
    date: todayIso(),
    validUntil: null,
    templateId,
    items: products.map((p, index) => ({
      productId: p.id,
      order: index,
      quantity: null,
      priceOverride: null
    })),
    notes: '',
    createdAt: now,
    updatedAt: now
  }
}

type GroupKey =
  | 'page'
  | 'header'
  | 'image'
  | 'product'
  | 'fields'
  | 'grid'
  | 'table'
  | 'cover'
  | 'terms'
  | 'footer'

export function Szablony({ notify }: { notify: (msg: string, error?: boolean) => void }): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Template | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const [offers, setOffers] = useState<Offer[]>([])
  const [realProducts, setRealProducts] = useState<Product[]>([])
  const [company, setCompany] = useState<Company>(emptyCompany())
  const [previewOfferId, setPreviewOfferId] = useState('sample')

  const [mode, setMode] = useState<'canvas' | 'pdf'>('canvas')
  const [zoom, setZoom] = useState(0.8)
  const [open, setOpen] = useState<Record<GroupKey, boolean>>({
    page: true,
    header: false,
    image: true,
    product: false,
    fields: true,
    grid: false,
    table: false,
    cover: false,
    terms: false,
    footer: false
  })
  const [flash, setFlash] = useState<GroupKey | null>(null)

  const reload = useCallback(async (selectId?: string) => {
    const [list, offerList, productList, companyData] = await Promise.all([
      window.api.templates.list(),
      window.api.offers.list(),
      window.api.products.list(),
      window.api.company.get()
    ])
    setTemplates(list)
    setOffers(offerList)
    setRealProducts(productList)
    setCompany(companyData ?? emptyCompany())
    setActiveId((current) => {
      const next = selectId ?? current ?? list[0]?.id ?? null
      setDraft(list.find((t) => t.id === next) ?? null)
      return next
    })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // --- Autosave -----------------------------------------------------------
  const pending = useRef<Template | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const value = pending.current
    pending.current = null
    if (!value || value.builtIn) return
    try {
      const { id, ...patch } = value
      await window.api.templates.update(id, patch)
      setTemplates((prev) => prev.map((t) => (t.id === id ? value : t)))
    } catch (e) {
      notify(e instanceof Error ? e.message : pl.common.unknownError, true)
    }
  }, [notify])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  const update = useCallback(
    (mutate: (draft: Template) => Template) => {
      setDraft((prev) => {
        if (!prev) return prev
        const next = mutate(prev)
        if (!next.builtIn) {
          pending.current = next
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => void flush(), AUTOSAVE_MS)
        }
        return next
      })
    },
    [flush]
  )

  /** Shorthand for patching one top-level section of the template. */
  const patch = useCallback(
    <K extends keyof Template>(key: K, value: Partial<Template[K]>) => {
      update((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...value } }) as Template)
    },
    [update]
  )

  function select(template: Template): void {
    if (timer.current) clearTimeout(timer.current)
    void flush()
    setActiveId(template.id)
    setDraft(template)
  }

  // --- Canvas edits -------------------------------------------------------
  const applyCanvasEdit = useCallback(
    (edit: CanvasEdit) => {
      update((prev) => {
        switch (edit.op) {
          case 'margin':
            return {
              ...prev,
              page: { ...prev.page, margin: { ...prev.page.margin, [edit.side]: edit.value } }
            }
          case 'imageSize':
            return { ...prev, image: { ...prev.image, width: edit.width, height: edit.height } }
          case 'logoWidth':
            return {
              ...prev,
              header: { ...prev.header, logo: { ...prev.header.logo, width: edit.value } }
            }
          case 'reorderField': {
            const fields = [...prev.product.fields]
            const [moved] = fields.splice(edit.from, 1)
            fields.splice(Math.min(edit.to, fields.length), 0, moved)
            return { ...prev, product: { ...prev.product, fields } }
          }
          case 'columnWidth': {
            // The canvas indexes visible columns only; map back to the full list.
            const visible = prev.table.columns.filter((c) => c.visible)
            const a = visible[edit.index]
            const b = visible[edit.index + 1]
            if (!a || !b) return prev
            const columns = prev.table.columns.map((column) =>
              column.key === a.key
                ? { ...column, width: edit.width }
                : column.key === b.key
                  ? { ...column, width: edit.nextWidth }
                  : column
            )
            return { ...prev, table: { ...prev.table, columns } }
          }
          default:
            return prev
        }
      })
    },
    [update]
  )

  const onSelect = useCallback((target: string) => {
    const group: GroupKey | null = target.startsWith('field')
      ? 'fields'
      : target === 'image'
        ? 'image'
        : target === 'logo' || target === 'header'
          ? 'header'
          : target === 'margin'
            ? 'page'
            : target === 'table' || target === 'column'
              ? 'table'
              : target === 'terms'
                ? 'terms'
                : target === 'footer'
                  ? 'footer'
                  : 'product'
    setOpen((prev) => ({ ...prev, [group]: true }))
    setFlash(group)
    setTimeout(() => setFlash(null), 900)
  }, [])

  // --- Preview data -------------------------------------------------------
  const previewProducts = realProducts.length > 0 ? realProducts : sampleProducts()
  const previewOffer = useMemo(() => {
    if (!draft) return null
    const found = offers.find((o) => o.id === previewOfferId)
    if (found) return { ...found, templateId: draft.id }
    return sampleOffer(draft.id, previewProducts.slice(0, 6))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, offers, previewOfferId, realProducts])

  const toggle = (key: GroupKey) => (): void =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <>
      <div className="page-head">
        <h1>{pl.templates.title}</h1>
        <div className="head-actions">
          <select
            className="input"
            style={{ width: 220 }}
            value={activeId ?? ''}
            onChange={(e) => {
              const found = templates.find((t) => t.id === e.target.value)
              if (found) select(found)
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.builtIn ? ` (${pl.templates.builtIn})` : ''}
              </option>
            ))}
          </select>
          <button
            className="btn"
            disabled={!draft}
            onClick={async () => {
              if (!draft) return
              await flush()
              const copy = await window.api.templates.duplicate(draft.id)
              await reload(copy.id)
              notify('Utworzono kopię szablonu — teraz można ją edytować.')
            }}
          >
            {pl.common.duplicate}
          </button>
          <button
            className="btn danger"
            disabled={!draft || draft.builtIn}
            onClick={() => {
              if (!draft) return
              setConfirm({
                title: pl.templates.deleteTitle,
                body: pl.templates.deleteBody(draft.name),
                danger: true,
                onConfirm: async () => {
                  pending.current = null
                  await window.api.templates.delete(draft.id)
                  await reload(undefined)
                  notify('Szablon usunięty.')
                }
              })
            }}
          >
            {pl.common.delete}
          </button>
        </div>
      </div>

      <div className="page-body flush">
        {draft && previewOffer ? (
          <div className="builder">
            <div className="settings">
              {draft.builtIn ? (
                <p className="readonly-note">{pl.templates.builtInNote}</p>
              ) : null}

              <Field label={pl.templates.fields.name}>
                <input
                  className="input"
                  value={draft.name}
                  disabled={draft.builtIn}
                  onChange={(e) => update((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Field>

              <Field label={pl.templates.layout}>
                <div className="radio-row">
                  {(
                    [
                      ['row', pl.templates.layouts.row],
                      ['grid', pl.templates.layouts.grid2],
                      ['table', pl.templates.layouts.table]
                    ] as [TemplateLayout, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      className={draft.layout === key ? 'active' : ''}
                      disabled={draft.builtIn}
                      onClick={() => update((prev) => ({ ...prev, layout: key }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              <BuilderPanel
                draft={draft}
                open={open}
                flash={flash}
                toggle={toggle}
                update={update}
                patch={patch}
              />
            </div>

            <div className="preview">
              <div className="preview-bar">
                <div className="tabs">
                  <button
                    className={mode === 'canvas' ? 'active' : ''}
                    onClick={() => setMode('canvas')}
                  >
                    {pl.templates.modeCanvas}
                  </button>
                  <button className={mode === 'pdf' ? 'active' : ''} onClick={() => setMode('pdf')}>
                    {pl.templates.modePdf}
                  </button>
                </div>

                {mode === 'canvas' ? (
                  <div className="zoom">
                    <button className="btn ghost small" onClick={() => setZoom((z) => Math.max(0.35, z - 0.1))}>
                      −
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button className="btn ghost small" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}>
                      +
                    </button>
                  </div>
                ) : null}

                <select
                  className="input"
                  style={{ width: 240, marginLeft: 'auto' }}
                  value={previewOfferId}
                  onChange={(e) => setPreviewOfferId(e.target.value)}
                >
                  <option value="sample">{pl.templates.sampleNote}</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} {o.number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="preview-stage">
                {mode === 'canvas' ? (
                  <>
                    <TemplateCanvas
                      offer={previewOffer}
                      products={previewProducts}
                      company={company}
                      template={draft}
                      zoom={zoom}
                      onEdit={applyCanvasEdit}
                      onSelect={onSelect}
                    />
                    <div className="canvas-hint">{pl.templates.canvasHint}</div>
                  </>
                ) : (
                  <PdfPreview offer={previewOffer} template={draft} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="page-body">{pl.common.loading}</div>
        )}
      </div>

      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

// ---------------------------------------------------------------------------

function BuilderPanel({
  draft,
  open,
  flash,
  toggle,
  update,
  patch
}: {
  draft: Template
  open: Record<GroupKey, boolean>
  flash: GroupKey | null
  toggle: (key: GroupKey) => () => void
  update: (mutate: (draft: Template) => Template) => void
  patch: <K extends keyof Template>(key: K, value: Partial<Template[K]>) => void
}): JSX.Element {
  const ro = draft.builtIn
  const f = pl.templates.fields
  const g = pl.templates.groups

  function setField(index: number, changes: Partial<ProductField>): void {
    update((prev) => ({
      ...prev,
      product: {
        ...prev.product,
        fields: prev.product.fields.map((field, i) =>
          i === index ? { ...field, ...changes } : field
        )
      }
    }))
  }

  function moveField(index: number, direction: -1 | 1): void {
    update((prev) => {
      const fields = [...prev.product.fields]
      const target = index + direction
      if (target < 0 || target >= fields.length) return prev
      ;[fields[index], fields[target]] = [fields[target], fields[index]]
      return { ...prev, product: { ...prev.product, fields } }
    })
  }

  function setColumn(index: number, changes: Partial<TableColumn>): void {
    update((prev) => ({
      ...prev,
      table: {
        ...prev.table,
        columns: prev.table.columns.map((column, i) =>
          i === index ? { ...column, ...changes } : column
        )
      }
    }))
  }

  function moveColumn(index: number, direction: -1 | 1): void {
    update((prev) => {
      const columns = [...prev.table.columns]
      const target = index + direction
      if (target < 0 || target >= columns.length) return prev
      ;[columns[index], columns[target]] = [columns[target], columns[index]]
      return { ...prev, table: { ...prev.table, columns } }
    })
  }

  return (
    <>
      <Section title={g.page} open={open.page} onToggle={toggle('page')} highlight={flash === 'page'}>
        <div className="two-col">
          <label className="mini">
            {f.orientation}
            <select
              className="input"
              value={draft.page.orientation}
              disabled={ro}
              onChange={(e) =>
                patch('page', { orientation: e.target.value as 'portrait' | 'landscape' })
              }
            >
              <option value="portrait">{f.portrait}</option>
              <option value="landscape">{f.landscape}</option>
            </select>
          </label>
          <label className="mini">
            {f.fontFamily}
            <select
              className="input"
              value={draft.font.family}
              disabled={ro}
              onChange={(e) => patch('font', { family: e.target.value })}
            >
              {FONT_CHOICES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <BoxField
          label={f.margin}
          unit="mm"
          value={draft.page.margin}
          disabled={ro}
          onChange={(margin: Box) => patch('page', { margin })}
        />
        <Num
          label={f.fontSize}
          unit="px"
          min={7}
          max={24}
          value={draft.font.baseSize}
          disabled={ro}
          onChange={(baseSize) => patch('font', { baseSize })}
        />
        <ColorField
          label={f.accent}
          value={draft.colors.accent}
          disabled={ro}
          onChange={(accent) => patch('colors', { accent })}
        />
        <ColorField
          label={f.text}
          value={draft.colors.text}
          disabled={ro}
          onChange={(text) => patch('colors', { text })}
        />
        <ColorField
          label={f.muted}
          value={draft.colors.muted}
          disabled={ro}
          onChange={(muted) => patch('colors', { muted })}
        />
        <ColorField
          label={f.background}
          value={draft.page.background}
          disabled={ro}
          onChange={(background) => patch('page', { background })}
        />
      </Section>

      <Section
        title={g.header}
        open={open.header}
        onToggle={toggle('header')}
        highlight={flash === 'header'}
      >
        <Checkbox
          label={f.headerVisible}
          checked={draft.header.visible}
          disabled={ro}
          onChange={(visible) => patch('header', { visible })}
        />
        <Checkbox
          label={f.showLogo}
          checked={draft.header.logo.visible}
          disabled={ro}
          onChange={(visible) =>
            patch('header', { logo: { ...draft.header.logo, visible } })
          }
        />
        {draft.header.logo.visible ? (
          <>
            <Num
              label={f.logoWidth}
              unit="px"
              min={40}
              max={700}
              value={draft.header.logo.width}
              disabled={ro}
              onChange={(width) => patch('header', { logo: { ...draft.header.logo, width } })}
            />
            <AlignPicker
              label={f.logoAlign}
              value={draft.header.logo.align}
              disabled={ro}
              onChange={(align) => patch('header', { logo: { ...draft.header.logo, align } })}
            />
          </>
        ) : null}

        <Checkbox
          label={f.headerTitleVisible}
          checked={draft.header.title.visible}
          disabled={ro}
          onChange={(visible) => patch('header', { title: { ...draft.header.title, visible } })}
        />
        {draft.header.title.visible ? (
          <>
            <Field label={f.headerTitle} hint={pl.templates.placeholders}>
              <input
                className="input"
                value={draft.header.title.text}
                disabled={ro}
                onChange={(e) =>
                  patch('header', { title: { ...draft.header.title, text: e.target.value } })
                }
              />
            </Field>
            <StyleEditor
              value={draft.header.title.style}
              disabled={ro}
              onChange={(style) => patch('header', { title: { ...draft.header.title, style } })}
            />
          </>
        ) : null}

        <Checkbox
          label={f.showCompany}
          checked={draft.header.company.visible}
          disabled={ro}
          onChange={(visible) => patch('header', { company: { ...draft.header.company, visible } })}
        />
        {draft.header.company.visible ? (
          <StyleEditor
            value={draft.header.company.style}
            disabled={ro}
            onChange={(style) => patch('header', { company: { ...draft.header.company, style } })}
          />
        ) : null}

        <Checkbox
          label={f.headerDivider}
          checked={draft.header.divider.visible}
          disabled={ro}
          onChange={(visible) =>
            patch('header', { divider: { ...draft.header.divider, visible } })
          }
        />
        {draft.header.divider.visible ? (
          <>
            <Num
              label={f.dividerWidth}
              unit="px"
              min={0}
              max={10}
              value={draft.header.divider.width}
              disabled={ro}
              onChange={(width) => patch('header', { divider: { ...draft.header.divider, width } })}
            />
            <ColorField
              label={f.dividerColor}
              value={draft.header.divider.color}
              disabled={ro}
              onChange={(color) => patch('header', { divider: { ...draft.header.divider, color } })}
            />
          </>
        ) : null}
        <Num
          label={f.headerSpaceBelow}
          unit="px"
          min={0}
          max={80}
          value={draft.header.spaceBelow}
          disabled={ro}
          onChange={(spaceBelow) => patch('header', { spaceBelow })}
        />
      </Section>

      <Section
        title={g.image}
        open={open.image}
        onToggle={toggle('image')}
        highlight={flash === 'image'}
      >
        <Checkbox
          label={f.showImage}
          checked={draft.image.visible}
          disabled={ro}
          onChange={(visible) => patch('image', { visible })}
        />
        {draft.image.visible ? (
          <>
            <Num
              label={f.imageWidth}
              unit="px"
              min={30}
              max={600}
              value={draft.image.width}
              disabled={ro}
              onChange={(width) => patch('image', { width })}
            />
            <Num
              label={f.imageHeight}
              unit="px"
              min={30}
              max={600}
              value={draft.image.height}
              disabled={ro}
              onChange={(height) => patch('image', { height })}
            />
            <div className="two-col">
              <label className="mini">
                {f.imagePosition}
                <select
                  className="input"
                  value={draft.image.position}
                  disabled={ro}
                  onChange={(e) =>
                    patch('image', { position: e.target.value as 'left' | 'right' | 'top' })
                  }
                >
                  <option value="left">{f.posLeft}</option>
                  <option value="right">{f.posRight}</option>
                  <option value="top">{f.posTop}</option>
                </select>
              </label>
              <label className="mini">
                {f.imageFit}
                <select
                  className="input"
                  value={draft.image.fit}
                  disabled={ro}
                  onChange={(e) => patch('image', { fit: e.target.value as 'contain' | 'cover' })}
                >
                  <option value="contain">{f.fitContain}</option>
                  <option value="cover">{f.fitCover}</option>
                </select>
              </label>
            </div>
            <Num
              label={f.imageGap}
              unit="px"
              min={0}
              max={60}
              value={draft.image.gap}
              disabled={ro}
              onChange={(gap) => patch('image', { gap })}
            />
            <Num
              label={f.imageRadius}
              unit="px"
              min={0}
              max={40}
              value={draft.image.radius}
              disabled={ro}
              onChange={(radius) => patch('image', { radius })}
            />
          </>
        ) : null}
      </Section>

      <Section
        title={g.fields}
        open={open.fields}
        onToggle={toggle('fields')}
        highlight={flash === 'fields'}
      >
        <p className="hint">{pl.templates.fieldsHint}</p>
        {draft.product.fields.map((field, index) => (
          <div key={field.key} className="field-card">
            <div className="field-card-head">
              <span className="order-btns">
                <button
                  className="btn ghost small"
                  disabled={ro || index === 0}
                  onClick={() => moveField(index, -1)}
                  title="W górę"
                >
                  ↑
                </button>
                <button
                  className="btn ghost small"
                  disabled={ro || index === draft.product.fields.length - 1}
                  onClick={() => moveField(index, 1)}
                  title="W dół"
                >
                  ↓
                </button>
              </span>
              <strong>{PRODUCT_FIELD_LABELS[field.key]}</strong>
              <label className="check compact">
                <input
                  type="checkbox"
                  checked={field.visible}
                  disabled={ro}
                  onChange={(e) => setField(index, { visible: e.target.checked })}
                />
              </label>
            </div>
            {field.visible ? (
              <>
                <input
                  className="input"
                  placeholder={f.prefix}
                  value={field.prefix}
                  disabled={ro}
                  onChange={(e) => setField(index, { prefix: e.target.value })}
                />
                <StyleEditor
                  value={field.style}
                  disabled={ro}
                  onChange={(style) => setField(index, { style })}
                />
              </>
            ) : null}
          </div>
        ))}
      </Section>

      <Section
        title={g.product}
        open={open.product}
        onToggle={toggle('product')}
        highlight={flash === 'product'}
      >
        <Num
          label={f.productGap}
          unit="px"
          min={0}
          max={80}
          value={draft.product.gap}
          disabled={ro}
          onChange={(gap) => patch('product', { gap })}
        />
        <BoxField
          label={f.productPadding}
          unit="px"
          max={80}
          value={draft.product.padding}
          disabled={ro}
          onChange={(padding) => patch('product', { padding })}
        />
        {draft.layout === 'grid' ? (
          <Num
            label={f.columns}
            unit=""
            min={1}
            max={4}
            value={draft.product.columns}
            disabled={ro}
            onChange={(columns) => patch('product', { columns })}
          />
        ) : null}

        <Checkbox
          label={f.divider}
          checked={draft.product.divider.visible}
          disabled={ro}
          onChange={(visible) =>
            patch('product', { divider: { ...draft.product.divider, visible } })
          }
        />
        {draft.product.divider.visible ? (
          <>
            <Num
              label={f.dividerWidth}
              unit="px"
              min={0}
              max={8}
              value={draft.product.divider.width}
              disabled={ro}
              onChange={(width) => patch('product', { divider: { ...draft.product.divider, width } })}
            />
            <ColorField
              label={f.dividerColor}
              value={draft.product.divider.color}
              disabled={ro}
              onChange={(color) => patch('product', { divider: { ...draft.product.divider, color } })}
            />
          </>
        ) : null}

        <Num
          label={f.cardBorder}
          unit="px"
          min={0}
          max={8}
          value={draft.product.card.border}
          disabled={ro}
          onChange={(border) => patch('product', { card: { ...draft.product.card, border } })}
        />
        {draft.product.card.border > 0 ? (
          <ColorField
            label={f.cardBorderColor}
            value={draft.product.card.borderColor}
            disabled={ro}
            onChange={(borderColor) =>
              patch('product', { card: { ...draft.product.card, borderColor } })
            }
          />
        ) : null}
        <Num
          label={f.cardRadius}
          unit="px"
          min={0}
          max={30}
          value={draft.product.card.radius}
          disabled={ro}
          onChange={(radius) => patch('product', { card: { ...draft.product.card, radius } })}
        />
        <ColorField
          label={f.cardBackground}
          value={draft.product.card.background}
          disabled={ro}
          onChange={(background) =>
            patch('product', { card: { ...draft.product.card, background } })
          }
        />
      </Section>

      {draft.layout === 'table' ? (
        <Section
          title={g.table}
          open={open.table}
          onToggle={toggle('table')}
          highlight={flash === 'table'}
        >
          <p className="hint">{pl.templates.tableHint}</p>
          {draft.table.columns.map((column, index) => (
            <div key={column.key} className="field-card">
              <div className="field-card-head">
                <span className="order-btns">
                  <button
                    className="btn ghost small"
                    disabled={ro || index === 0}
                    onClick={() => moveColumn(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="btn ghost small"
                    disabled={ro || index === draft.table.columns.length - 1}
                    onClick={() => moveColumn(index, 1)}
                  >
                    ↓
                  </button>
                </span>
                <strong>{PRODUCT_FIELD_LABELS[column.key]}</strong>
                <label className="check compact">
                  <input
                    type="checkbox"
                    checked={column.visible}
                    disabled={ro}
                    onChange={(e) => setColumn(index, { visible: e.target.checked })}
                  />
                </label>
              </div>
              {column.visible ? (
                <>
                  <input
                    className="input"
                    value={column.label}
                    disabled={ro}
                    onChange={(e) => setColumn(index, { label: e.target.value })}
                  />
                  <div className="style-row">
                    <input
                      className="input num"
                      type="number"
                      min={4}
                      max={90}
                      title="Szerokość (%)"
                      value={column.width}
                      disabled={ro}
                      onChange={(e) => setColumn(index, { width: Number(e.target.value) })}
                    />
                    <AlignPicker
                      value={column.align}
                      disabled={ro}
                      onChange={(align) => setColumn(index, { align })}
                    />
                  </div>
                </>
              ) : null}
            </div>
          ))}

          <Num
            label={f.rowPadding}
            unit="px"
            min={0}
            max={24}
            value={draft.table.rowPadding}
            disabled={ro}
            onChange={(rowPadding) => patch('table', { rowPadding })}
          />
          <Checkbox
            label={f.zebra}
            checked={draft.table.zebra}
            disabled={ro}
            onChange={(zebra) => patch('table', { zebra })}
          />
          <ColorField
            label={f.tableHeaderBg}
            value={draft.table.headerBackground}
            disabled={ro}
            onChange={(headerBackground) => patch('table', { headerBackground })}
          />
          <ColorField
            label={f.tableHeaderColor}
            value={draft.table.headerColor}
            disabled={ro}
            onChange={(headerColor) => patch('table', { headerColor })}
          />
          <ColorField
            label={f.tableBorder}
            value={draft.table.borderColor}
            disabled={ro}
            onChange={(borderColor) => patch('table', { borderColor })}
          />
        </Section>
      ) : null}

      <Section
        title={g.cover}
        open={open.cover}
        onToggle={toggle('cover')}
        highlight={flash === 'cover'}
      >
        <Checkbox
          label={f.coverEnabled}
          checked={draft.cover.enabled}
          disabled={ro}
          onChange={(enabled) => patch('cover', { enabled })}
        />
        {draft.cover.enabled ? (
          <>
            <Field label={f.coverTitle}>
              <input
                className="input"
                value={draft.cover.title}
                disabled={ro}
                onChange={(e) => patch('cover', { title: e.target.value })}
              />
            </Field>
            <StyleEditor
              value={draft.cover.titleStyle}
              disabled={ro}
              onChange={(titleStyle) => patch('cover', { titleStyle })}
            />
            <Field label={f.coverSubtitle} hint={pl.templates.placeholders}>
              <input
                className="input"
                value={draft.cover.subtitle}
                disabled={ro}
                onChange={(e) => patch('cover', { subtitle: e.target.value })}
              />
            </Field>
            <StyleEditor
              value={draft.cover.subtitleStyle}
              disabled={ro}
              onChange={(subtitleStyle) => patch('cover', { subtitleStyle })}
            />
            <label className="mini">
              {f.coverJustify}
              <select
                className="input"
                value={draft.cover.justify}
                disabled={ro}
                onChange={(e) =>
                  patch('cover', { justify: e.target.value as 'start' | 'center' | 'end' })
                }
              >
                <option value="start">{f.justifyStart}</option>
                <option value="center">{f.justifyCenter}</option>
                <option value="end">{f.justifyEnd}</option>
              </select>
            </label>
            <Num
              label={f.coverLogoWidth}
              unit="px"
              min={40}
              max={700}
              value={draft.cover.logoWidth}
              disabled={ro}
              onChange={(logoWidth) => patch('cover', { logoWidth })}
            />
          </>
        ) : null}
      </Section>

      <Section
        title={g.terms}
        open={open.terms}
        onToggle={toggle('terms')}
        highlight={flash === 'terms'}
      >
        <Checkbox
          label={f.termsEnabled}
          checked={draft.terms.enabled}
          disabled={ro}
          onChange={(enabled) => patch('terms', { enabled })}
        />
        {draft.terms.enabled ? (
          <>
            <Field label={f.termsTitle}>
              <input
                className="input"
                value={draft.terms.title}
                disabled={ro}
                onChange={(e) => patch('terms', { title: e.target.value })}
              />
            </Field>
            <Field label={f.termsText}>
              <textarea
                className="input"
                rows={8}
                value={draft.terms.text}
                disabled={ro}
                onChange={(e) => patch('terms', { text: e.target.value })}
              />
            </Field>
            <StyleEditor
              value={draft.terms.style}
              disabled={ro}
              showSpaceAbove={false}
              onChange={(style) => patch('terms', { style })}
            />
            <Num
              label={f.termsSpaceAbove}
              unit="px"
              min={0}
              max={120}
              value={draft.terms.spaceAbove}
              disabled={ro}
              onChange={(spaceAbove) => patch('terms', { spaceAbove })}
            />
          </>
        ) : null}
      </Section>

      <Section
        title={g.footer}
        open={open.footer}
        onToggle={toggle('footer')}
        highlight={flash === 'footer'}
      >
        <Field label={f.footerText} hint={pl.templates.placeholders}>
          <input
            className="input"
            value={draft.footer.text}
            disabled={ro}
            onChange={(e) => patch('footer', { text: e.target.value })}
          />
        </Field>
        <StyleEditor
          value={draft.footer.style}
          disabled={ro}
          showSpaceAbove={false}
          onChange={(style) => patch('footer', { style })}
        />
        <Checkbox
          label={f.pageNumbers}
          checked={draft.footer.showPageNumbers}
          disabled={ro}
          onChange={(showPageNumbers) => patch('footer', { showPageNumbers })}
        />
      </Section>
    </>
  )
}
