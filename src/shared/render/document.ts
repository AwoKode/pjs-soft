import type { Box, Company, Offer, Product, ResolvedLine, Template } from '../types'
import { formatDate } from '../format'
import { escapeHtml, renderBody, styleAttr } from './layouts'
import { CANVAS_SCRIPT, CANVAS_STYLES } from './canvas'

export type RenderMode = 'print' | 'canvas'

export type RenderOptions = {
  offer: Offer
  products: Product[]
  template: Template
  company: Company
  imageUrl: (kind: 'products' | 'logo', file: string) => string
  /**
   * 'print' leaves the page margins to printToPDF so every page gets them.
   * 'canvas' draws a single A4-sized sheet with the margins as padding, plus
   * the drag handles the template builder needs.
   */
  mode?: RenderMode
}

/**
 * Joins offer items to their products, drops items whose product no longer
 * exists, and applies the per-offer price override.
 */
export function resolveLines(offer: Offer, products: Product[]): ResolvedLine[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  return offer.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((item) => {
      const product = byId.get(item.productId)
      if (!product) return []
      return [{ item, product, price: item.priceOverride ?? product.price }]
    })
}

/** Substitutes {{numerOferty}}, {{data}}, {{waznaDo}}, {{klient}}, {{firma}}. */
export function applyPlaceholders(text: string, offer: Offer, company: Company): string {
  const values: Record<string, string> = {
    numerOferty: offer.number,
    data: formatDate(offer.date),
    waznaDo: formatDate(offer.validUntil),
    klient: offer.customer,
    firma: company.name
  }
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] : match
  )
}

/** A4 in millimetres, for the orientation in use. */
export function pageSizeMm(t: Template): { width: number; height: number } {
  return t.page.orientation === 'landscape'
    ? { width: 297, height: 210 }
    : { width: 210, height: 297 }
}

function boxCss(value: Box, unit: 'mm' | 'px'): string {
  return `${value.top}${unit} ${value.right}${unit} ${value.bottom}${unit} ${value.left}${unit}`
}

function textBlock(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => '<p>' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>')
    .join('')
}

function buildCss(t: Template, mode: RenderMode): string {
  const page = pageSizeMm(t)
  const img = t.image
  const card = t.product.card
  const divider = t.product.divider

  const sheetRules =
    mode === 'canvas'
      ? `.sheet { width: ${page.width}mm; min-height: ${page.height}mm; margin: 0 auto;
           padding: ${boxCss(t.page.margin, 'mm')}; background: ${t.page.background};
           position: relative; box-shadow: 0 0 0 1px rgba(0,0,0,.12); }
         .sheet + .sheet { margin-top: 14px; }`
      : `.sheet { padding: 0; }`

  return `
@page { size: A4 ${t.page.orientation}; margin: 0; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: ${t.font.family};
  font-size: ${t.font.baseSize}px;
  line-height: 1.45;
  color: ${t.colors.text};
  background: ${mode === 'canvas' ? '#8b9199' : t.page.background};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1, h2, h3 { margin: 0; font-weight: inherit; }
p { margin: 0 0 6px; }
${sheetRules}

/* ---- cover ---- */
.cover { display: flex; flex-direction: column; justify-content: ${t.cover.justify};
  align-items: stretch; height: ${page.height - t.page.margin.top - t.page.margin.bottom}mm;
  break-after: page; page-break-after: always; }
.cover-logo { text-align: center; margin-bottom: 18px; }
.cover-logo img { width: ${t.cover.logoWidth}px; max-width: 100%; object-fit: contain; }
.cover-meta { margin-top: 18px; text-align: center; color: ${t.colors.muted};
  font-size: ${t.font.baseSize}px; }

/* ---- header ---- */
.doc-header { margin-bottom: ${t.header.spaceBelow}px;
  ${t.header.divider.visible
    ? `border-bottom: ${t.header.divider.width}px solid ${t.header.divider.color}; padding-bottom: 10px;`
    : ''} }
.header-logo { text-align: ${t.header.logo.align}; margin-bottom: 8px; }
.header-logo img { width: ${t.header.logo.width}px; max-width: 100%; object-fit: contain; }
.header-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.header-main > div { flex: 1 1 0; min-width: 0; }
.header-company { white-space: pre-line; }
.header-sub { color: ${t.colors.muted}; font-size: ${t.font.baseSize * 0.85}px; }

/* ---- products ---- */
.product { break-inside: avoid; page-break-inside: avoid; display: flex;
  gap: ${img.gap}px; align-items: flex-start;
  padding: ${boxCss(t.product.padding, 'px')};
  ${card.border ? `border: ${card.border}px solid ${card.borderColor};` : ''}
  ${card.radius ? `border-radius: ${card.radius}px;` : ''}
  ${card.background !== 'transparent' ? `background: ${card.background};` : ''} }
.product.stacked { flex-direction: column; align-items: stretch; }
.product-body { flex: 1 1 auto; min-width: 0; }
.product-image { flex: 0 0 ${img.width}px; width: ${img.width}px; height: ${img.height}px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  ${img.radius ? `border-radius: ${img.radius}px;` : ''} position: relative; }
.product.stacked .product-image { flex: 0 0 auto; align-self: ${
    t.image.position === 'top' ? 'center' : 'flex-start'
  }; }
.product-image img { width: 100%; height: 100%; object-fit: ${img.fit}; }
.no-image { font-size: ${t.font.baseSize * 0.75}px; color: ${t.colors.muted}; opacity: .6; }
.pf { line-height: 1.35; }

.layout-row { display: flex; flex-direction: column; gap: ${t.product.gap}px; }
${divider.visible
    ? `.layout-row .product + .product { border-top: ${divider.width}px solid ${divider.color};
         padding-top: ${t.product.padding.top + t.product.gap}px; }
       .layout-row { gap: 0; }`
    : ''}

.layout-grid { display: grid; grid-template-columns: repeat(${t.product.columns}, minmax(0, 1fr));
  gap: ${t.product.gap}px; align-items: start; }

/* ---- table ---- */
.layout-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.layout-table th { background: ${t.table.headerBackground}; color: ${t.table.headerColor};
  padding: ${t.table.rowPadding + 2}px 8px; font-weight: 600;
  font-size: ${t.font.baseSize * 0.92}px; position: relative; }
.layout-table td { padding: ${t.table.rowPadding}px 8px;
  border-bottom: 1px solid ${t.table.borderColor}; font-size: ${t.font.baseSize * 0.92}px;
  overflow-wrap: break-word; }
.layout-table tr { break-inside: avoid; page-break-inside: avoid; }
${t.table.zebra ? `.layout-table tbody tr.odd td { background: rgba(0,0,0,.035); }` : ''}

/* ---- trailing sections ---- */
.notes { margin-top: 18px; break-inside: avoid; }
.terms { margin-top: ${t.terms.spaceAbove}px; padding-top: 12px;
  border-top: 2px solid ${t.colors.accent}; break-inside: avoid; page-break-inside: avoid; }
.terms h2 { font-size: ${t.terms.style.size * 1.2}px; font-weight: 700;
  color: ${t.colors.accent}; margin-bottom: 6px; }
.doc-footer { margin-top: 22px; padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,.15); white-space: pre-line; }
.empty-note { color: ${t.colors.muted}; font-style: italic; }
${mode === 'canvas' ? CANVAS_STYLES : ''}
`.trim()
}

function renderCover(o: RenderOptions): string {
  const { template: t, offer, company } = o
  if (!t.cover.enabled) return ''
  const logo =
    t.header.logo.visible && company.logo
      ? `<div class="cover-logo"><img src="${escapeHtml(o.imageUrl('logo', company.logo))}" alt=""></div>`
      : ''
  const subtitle = applyPlaceholders(t.cover.subtitle, offer, company)
  const meta = [
    offer.customer ? `Dla: ${offer.customer}` : '',
    offer.validUntil ? `Oferta ważna do: ${formatDate(offer.validUntil)}` : ''
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br>')

  // Wrapped in a .sheet so the cover picks up the page padding in canvas mode;
  // in print mode .sheet has no padding and this is a plain wrapper.
  return `<div class="sheet cover-sheet"><section class="cover">
  ${logo}
  <h1 style="${styleAttr(t.cover.titleStyle)}">${escapeHtml(
    applyPlaceholders(t.cover.title, offer, company)
  )}</h1>
  ${subtitle ? `<div style="${styleAttr(t.cover.subtitleStyle)}">${escapeHtml(subtitle)}</div>` : ''}
  ${meta ? `<div class="cover-meta">${meta}</div>` : ''}
</section></div>`
}

function renderHeader(o: RenderOptions): string {
  const { template: t, offer, company } = o
  const h = t.header
  if (!h.visible) return ''

  const wantsLogo = h.logo.visible && !!company.logo
  const drag = o.mode === 'canvas' ? ' data-drag="logo"' : ''
  const logo = wantsLogo
    ? `<div class="header-logo"${drag}><img src="${escapeHtml(
        o.imageUrl('logo', company.logo!)
      )}" alt=""></div>`
    : ''

  const title = applyPlaceholders(h.title.text, offer, company)
  const left =
    h.title.visible && (title || offer.customer)
      ? `<div>
        ${title ? `<div style="${styleAttr(h.title.style)}">${escapeHtml(title)}</div>` : ''}
        ${offer.customer ? `<div class="header-sub">Dla: ${escapeHtml(offer.customer)}</div>` : ''}
      </div>`
      : '<div></div>'

  const companyLines = [
    company.name,
    company.address,
    company.nip ? `NIP: ${company.nip}` : '',
    company.phone ? `tel. ${company.phone}` : '',
    company.email,
    company.www
  ]
    .filter(Boolean)
    .join('\n')

  const right =
    h.company.visible && companyLines
      ? `<div class="header-company" style="${styleAttr(h.company.style)}">${escapeHtml(
          companyLines
        )}</div>`
      : '<div></div>'

  if (!logo && !h.title.visible && !h.company.visible) return ''
  return `<header class="doc-header">${logo}<div class="header-main">${left}${right}</div></header>`
}

/** Builds the complete standalone HTML document for an offer. */
export function renderOfferHtml(o: RenderOptions): string {
  const mode: RenderMode = o.mode ?? 'print'
  const { offer, template: t, company } = o
  const lines = resolveLines(offer, o.products)
  const interactive = mode === 'canvas'

  const body = renderBody({ lines, template: t, imageUrl: o.imageUrl, interactive })

  const terms =
    t.terms.enabled && t.terms.text.trim()
      ? `<section class="terms" style="${styleAttr(t.terms.style)}"><h2>${escapeHtml(
          t.terms.title
        )}</h2>${textBlock(applyPlaceholders(t.terms.text, offer, company))}</section>`
      : ''
  const notes = offer.notes.trim() ? `<section class="notes">${textBlock(offer.notes)}</section>` : ''
  const footerText = applyPlaceholders(t.footer.text, offer, company)
  const footer = footerText
    ? `<footer class="doc-footer" style="${styleAttr(t.footer.style)}">${escapeHtml(
        footerText
      )}</footer>`
    : ''

  const page = pageSizeMm(t)
  const guides = interactive
    ? (['top', 'right', 'bottom', 'left'] as const)
        .map((side) => `<div class="mg mg-${side}" data-drag="margin" data-side="${side}"></div>`)
        .join('')
    : ''

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>${escapeHtml(offer.title || 'Oferta')}</title>
<style>${buildCss(t, mode)}</style>
</head>
<body>
${renderCover(o)}
<div class="sheet" data-page-width="${page.width}" data-margin-top="${t.page.margin.top}"
  data-margin-right="${t.page.margin.right}" data-margin-bottom="${t.page.margin.bottom}"
  data-margin-left="${t.page.margin.left}">
${guides}
${renderHeader(o)}
${body}
${notes}
${terms}
${footer}
</div>
${interactive ? `<script>${CANVAS_SCRIPT}</script>` : ''}
</body>
</html>`
}
