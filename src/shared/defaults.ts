import type {
  Align,
  Box,
  Company,
  Offer,
  Product,
  ProductField,
  ProductFieldKey,
  TableColumn,
  Template,
  TemplateLayout,
  TextStyle
} from './types'

export const FONT_CHOICES = [
  { value: "'Segoe UI', Tahoma, sans-serif", label: 'Segoe UI' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' }
]

const ACCENT = '#1f4e79'
const TEXT = '#1a1a1a'
const MUTED = '#6b7480'

/** Trading terms transcribed from the existing offer document. */
export const DEFAULT_TERMS = [
  'Forma płatności: przedpłata / faktura proforma',
  'Czas realizacji: 2 - 5 dni w zależności od asortymentu',
  'Oferta ważna: do wyczerpania zapasów',
  'Odbiór osobisty: 63-020 Zaniemyśl',
  'Wysyłka paletowa: paleta 160,00 zł netto, półpaleta 100,00 zł netto',
  '',
  'Wszystkie ceny są cenami NETTO!'
].join('\n')

export function box(top: number, right = top, bottom = top, left = right): Box {
  return { top, right, bottom, left }
}

export function text(
  size: number,
  overrides: Partial<TextStyle> = {}
): TextStyle {
  return {
    size,
    weight: 400,
    color: TEXT,
    align: 'left',
    uppercase: false,
    spaceAbove: 0,
    ...overrides
  }
}

export const PRODUCT_FIELD_LABELS: Record<ProductFieldKey, string> = {
  name: 'Nazwa',
  title: 'Tytuł / wariant',
  packaging: 'Opakowanie',
  minSellQuantity: 'Min. ilość',
  quantity: 'Ilość z oferty',
  price: 'Cena netto'
}

export const PRODUCT_FIELD_KEYS: ProductFieldKey[] = [
  'name',
  'title',
  'packaging',
  'minSellQuantity',
  'quantity',
  'price'
]

function defaultProductFields(): ProductField[] {
  return [
    { key: 'name', visible: true, prefix: '', style: text(15, { weight: 600, color: ACCENT }) },
    { key: 'title', visible: true, prefix: '', style: text(12, { color: MUTED, spaceAbove: 2 }) },
    {
      key: 'packaging',
      visible: true,
      prefix: '',
      style: text(11, { color: MUTED, spaceAbove: 4 })
    },
    {
      key: 'minSellQuantity',
      visible: true,
      prefix: 'min. ',
      style: text(11, { color: MUTED, spaceAbove: 2 })
    },
    {
      key: 'quantity',
      visible: false,
      prefix: 'ilość: ',
      style: text(11, { color: MUTED, spaceAbove: 2 })
    },
    {
      key: 'price',
      visible: true,
      prefix: 'Cena netto: ',
      style: text(13, { weight: 700, color: ACCENT, spaceAbove: 6 })
    }
  ]
}

function defaultTableColumns(): TableColumn[] {
  return [
    { key: 'name', label: 'Nazwa', width: 40, align: 'left', visible: true },
    { key: 'title', label: 'Tytuł', width: 12, align: 'left', visible: true },
    { key: 'packaging', label: 'Opakowanie', width: 20, align: 'left', visible: true },
    { key: 'minSellQuantity', label: 'Min. ilość', width: 12, align: 'right', visible: true },
    { key: 'quantity', label: 'Ilość', width: 8, align: 'right', visible: false },
    { key: 'price', label: 'Cena netto', width: 16, align: 'right', visible: true }
  ]
}

export function defaultTemplate(): Template {
  return {
    id: '',
    name: 'Nowy szablon',
    builtIn: false,
    layout: 'row',

    page: {
      orientation: 'portrait',
      margin: box(15),
      background: '#ffffff'
    },

    font: { family: FONT_CHOICES[0].value, baseSize: 12 },
    colors: { accent: ACCENT, text: TEXT, muted: MUTED },

    image: {
      visible: true,
      width: 110,
      height: 110,
      position: 'left',
      fit: 'contain',
      radius: 4,
      gap: 16
    },

    product: {
      fields: defaultProductFields(),
      gap: 10,
      padding: box(10, 0, 10, 0),
      divider: { visible: true, color: '#e0e0e0', width: 1 },
      card: { border: 0, borderColor: '#dddddd', radius: 6, background: 'transparent' },
      columns: 2
    },

    table: {
      columns: defaultTableColumns(),
      rowPadding: 6,
      zebra: false,
      headerBackground: ACCENT,
      headerColor: '#ffffff',
      borderColor: '#dddddd'
    },

    header: {
      visible: true,
      logo: { visible: true, width: 150, align: 'left' },
      title: {
        visible: true,
        text: '{{numerOferty}}',
        style: text(19, { weight: 700, color: ACCENT })
      },
      company: { visible: true, align: 'right', style: text(10, { color: MUTED, align: 'right' }) },
      divider: { visible: true, color: ACCENT, width: 2 },
      spaceBelow: 18
    },

    cover: {
      enabled: false,
      title: 'Oferta handlowa',
      subtitle: '{{data}}',
      justify: 'center',
      logoWidth: 220,
      titleStyle: text(34, { weight: 700, color: ACCENT, align: 'center' }),
      subtitleStyle: text(15, { color: MUTED, align: 'center', spaceAbove: 10 })
    },

    terms: {
      enabled: true,
      title: 'Warunki handlowe',
      text: DEFAULT_TERMS,
      style: text(12),
      spaceAbove: 24
    },

    footer: {
      text: 'Wszystkie ceny są cenami netto.',
      showPageNumbers: true,
      style: text(10, { color: MUTED, align: 'center' })
    }
  }
}

/** The read-only presets seeded on first run. */
export function builtInTemplates(): Template[] {
  const row: Template = {
    ...defaultTemplate(),
    id: 'builtin-row',
    name: 'Wiersze ze zdjęciem',
    builtIn: true,
    layout: 'row'
  }

  const base = defaultTemplate()
  const grid: Template = {
    ...base,
    id: 'builtin-grid2',
    name: 'Siatka 2-kolumnowa',
    builtIn: true,
    layout: 'grid',
    font: { ...base.font, baseSize: 11 },
    image: { ...base.image, position: 'top', width: 200, height: 140 },
    product: {
      ...base.product,
      columns: 2,
      gap: 14,
      padding: box(12),
      divider: { visible: false, color: '#e0e0e0', width: 1 },
      card: { border: 1, borderColor: '#dddddd', radius: 6, background: 'transparent' }
    }
  }

  const table: Template = {
    ...defaultTemplate(),
    id: 'builtin-table',
    name: 'Tabela zbiorcza',
    builtIn: true,
    layout: 'table'
  }

  return [row, grid, table]
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep-merges a stored (possibly partial or outdated) value onto a default. */
function merge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch) || !isPlainObject(base)) {
    return (patch === undefined ? base : (patch as T))
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in out)) continue // drop keys the current model no longer has
    out[key] = merge((base as Record<string, unknown>)[key], value)
  }
  return out as T
}

/**
 * Brings a stored template up to the current shape: fills in anything missing,
 * reconciles the ordered field/column arrays, and maps the handful of keys that
 * existed in the first version of the model.
 */
export function normalizeTemplate(raw: unknown): Template {
  const source = isPlainObject(raw) ? { ...raw } : {}
  const legacy = source as Record<string, any>

  // v1 stored a single margin number and a flat style/fields block.
  if (typeof legacy.page?.margin === 'number') {
    legacy.page = { ...legacy.page, margin: box(legacy.page.margin) }
  }
  if (legacy.layout === 'grid2') legacy.layout = 'grid'
  if (isPlainObject(legacy.style)) {
    legacy.font = { family: legacy.style.fontFamily, baseSize: legacy.style.fontSize }
    legacy.colors = { accent: legacy.style.accent, text: legacy.style.text }
    legacy.page = { ...legacy.page, background: legacy.style.background }
    legacy.image = { ...legacy.image, width: legacy.style.imageWidth, height: legacy.style.imageWidth }
    delete legacy.style
  }
  if (isPlainObject(legacy.fields)) {
    const visibility = legacy.fields as Record<string, boolean>
    legacy.image = { ...legacy.image, visible: visibility.image !== false }
    legacy.product = {
      ...legacy.product,
      fields: defaultProductFields().map((field) => ({
        ...field,
        visible: visibility[field.key] ?? field.visible
      }))
    }
    delete legacy.fields
  }
  if (isPlainObject(legacy.header) && typeof legacy.header.titleText === 'string') {
    legacy.header = {
      ...legacy.header,
      title: { visible: true, text: legacy.header.titleText },
      logo: { visible: legacy.header.showLogo !== false },
      company: { visible: legacy.header.showCompany !== false }
    }
  }
  if (isPlainObject(legacy.footer) && typeof legacy.footer.text === 'string') {
    // shape unchanged apart from the added style block, handled by merge
  }

  const merged = merge(defaultTemplate(), legacy)

  // Ordered arrays are merged by key so a stored order survives, but any field
  // added to the model later still appears.
  merged.product.fields = reconcile(
    defaultProductFields(),
    (legacy.product?.fields ?? merged.product.fields) as ProductField[],
    (item) => item.key
  )
  merged.table.columns = reconcile(
    defaultTableColumns(),
    (legacy.table?.columns ?? merged.table.columns) as TableColumn[],
    (item) => item.key
  )
  return merged
}

/** Keeps the stored order, merges stored values onto defaults, appends new entries. */
function reconcile<T>(defaults: T[], stored: T[], keyOf: (item: T) => string): T[] {
  const defaultsByKey = new Map(defaults.map((item) => [keyOf(item), item]))
  const seen = new Set<string>()
  const result: T[] = []

  for (const item of Array.isArray(stored) ? stored : []) {
    const key = keyOf(item)
    const fallback = defaultsByKey.get(key)
    if (!fallback || seen.has(key)) continue
    seen.add(key)
    result.push(merge(fallback, item))
  }
  for (const item of defaults) {
    if (!seen.has(keyOf(item))) result.push(item)
  }
  return result
}

// ---------------------------------------------------------------------------

export function emptyCompany(): Company {
  return {
    name: '',
    address: '',
    nip: '',
    phone: '',
    email: '',
    www: '',
    bankAccount: '',
    logo: null
  }
}

export function emptyProduct(): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
  return { name: '', title: '', packaging: '', minSellQuantity: 1, price: 0, image: null }
}

export function emptyOffer(
  templateId: string,
  date: string
): Omit<Offer, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    number: '',
    title: 'Oferta handlowa',
    customer: '',
    date,
    validUntil: null,
    templateId,
    items: [],
    notes: ''
  }
}

export const ALIGNS: Align[] = ['left', 'center', 'right']
export const LAYOUTS: TemplateLayout[] = ['row', 'grid', 'table']
