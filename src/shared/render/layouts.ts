import type { ProductField, ResolvedLine, Template, TextStyle } from '../types'
import { formatPln, formatQuantity } from '../format'

export type LayoutContext = {
  lines: ResolvedLine[]
  template: Template
  imageUrl: (kind: 'products' | 'logo', file: string) => string
  /** Adds the hooks the interactive canvas needs to hang handles off. */
  interactive: boolean
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Inline CSS for a text element, so every field is independently styleable. */
export function styleAttr(style: TextStyle, extra = ''): string {
  const parts = [
    `font-size:${style.size}px`,
    `font-weight:${style.weight}`,
    `color:${style.color}`,
    `text-align:${style.align}`,
    style.uppercase ? 'text-transform:uppercase' : '',
    style.spaceAbove ? `margin-top:${style.spaceAbove}px` : '',
    extra
  ].filter(Boolean)
  return parts.join(';')
}

/** The printed value of one product field, or null when there is nothing to show. */
export function fieldValue(field: ProductField, line: ResolvedLine): string | null {
  const p = line.product
  switch (field.key) {
    case 'name':
      return p.name || null
    case 'title':
      return p.title || null
    case 'packaging':
      return p.packaging || null
    case 'minSellQuantity':
      return p.minSellQuantity > 0 ? formatQuantity(p.minSellQuantity) : null
    case 'quantity':
      return line.item.quantity != null ? formatQuantity(line.item.quantity) : null
    case 'price':
      return formatPln(line.price)
    default:
      return null
  }
}

function renderFields(line: ResolvedLine, ctx: LayoutContext): string {
  return ctx.template.product.fields
    .map((field, index) => {
      if (!field.visible) return ''
      const value = fieldValue(field, line)
      if (value === null) return ''
      const drag = ctx.interactive ? ` data-drag="field" data-index="${index}"` : ''
      return `<div class="pf pf-${field.key}" style="${styleAttr(field.style)}"${drag}>${escapeHtml(
        field.prefix
      )}${escapeHtml(value)}</div>`
    })
    .join('')
}

function imageTag(line: ResolvedLine, ctx: LayoutContext, first: boolean): string {
  const img = ctx.template.image
  if (!img.visible) return ''
  const file = line.product.image
  const inner = file
    ? `<img src="${escapeHtml(ctx.imageUrl('products', file))}" alt="">`
    : '<span class="no-image">brak zdjęcia</span>'
  // Only the first photo carries the resize handle, so the canvas has one target.
  const drag = ctx.interactive && first ? ' data-drag="image"' : ''
  return `<div class="product-image"${drag}>${inner}</div>`
}

/** Image left/right/top, text beside or below it. */
function productBlock(line: ResolvedLine, ctx: LayoutContext, index: number): string {
  const image = imageTag(line, ctx, index === 0)
  const body = `<div class="product-body">${renderFields(line, ctx)}</div>`
  const stacked = ctx.template.image.position === 'top'
  const inner = ctx.template.image.position === 'right' ? `${body}${image}` : `${image}${body}`
  return `<article class="product${stacked ? ' stacked' : ''}">${inner}</article>`
}

export function renderRowLayout(ctx: LayoutContext): string {
  return `<div class="layout-row">${ctx.lines
    .map((line, index) => productBlock(line, ctx, index))
    .join('')}</div>`
}

export function renderGridLayout(ctx: LayoutContext): string {
  return `<div class="layout-grid">${ctx.lines
    .map((line, index) => productBlock(line, ctx, index))
    .join('')}</div>`
}

export function renderTableLayout(ctx: LayoutContext): string {
  const columns = ctx.template.table.columns.filter((column) => column.visible)
  if (columns.length === 0) return '<p class="empty-note">Wszystkie kolumny są ukryte.</p>'

  const head = columns
    .map((column, index) => {
      const drag = ctx.interactive ? ` data-drag="column" data-index="${index}"` : ''
      return `<th style="width:${column.width}%;text-align:${column.align}"${drag}>${escapeHtml(
        column.label
      )}${ctx.interactive ? '<span class="col-grip"></span>' : ''}</th>`
    })
    .join('')

  const body = ctx.lines
    .map((line, rowIndex) => {
      const cells = columns
        .map((column) => {
          const field = ctx.template.product.fields.find((f) => f.key === column.key)
          const value = field ? fieldValue(field, line) : null
          return `<td style="text-align:${column.align}">${value === null ? '' : escapeHtml(value)}</td>`
        })
        .join('')
      const zebra = ctx.template.table.zebra && rowIndex % 2 === 1 ? ' class="odd"' : ''
      return `<tr${zebra}>${cells}</tr>`
    })
    .join('')

  return `<table class="layout-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

export function renderBody(ctx: LayoutContext): string {
  if (ctx.lines.length === 0) {
    return '<p class="empty-note">Oferta nie zawiera jeszcze żadnych pozycji.</p>'
  }
  switch (ctx.template.layout) {
    case 'grid':
      return renderGridLayout(ctx)
    case 'table':
      return renderTableLayout(ctx)
    case 'row':
    default:
      return renderRowLayout(ctx)
  }
}
