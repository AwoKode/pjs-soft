export type Product = {
  id: string
  name: string
  title: string
  packaging: string
  minSellQuantity: number
  price: number
  image: string | null
  createdAt: string
  updatedAt: string
}

export type OfferItem = {
  productId: string
  order: number
  quantity: number | null
  priceOverride: number | null
}

export type Offer = {
  id: string
  number: string
  title: string
  customer: string
  date: string
  validUntil: string | null
  templateId: string
  items: OfferItem[]
  notes: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Template model
// ---------------------------------------------------------------------------

export type Align = 'left' | 'center' | 'right'

/** Per-side measurements. Page margins are millimetres; padding is pixels. */
export type Box = { top: number; right: number; bottom: number; left: number }

export type TextStyle = {
  size: number
  weight: number
  color: string
  align: Align
  uppercase: boolean
  /** Space above this element, in pixels. */
  spaceAbove: number
}

/** The lines that can appear inside a product block, in display order. */
export type ProductFieldKey =
  | 'name'
  | 'title'
  | 'packaging'
  | 'minSellQuantity'
  | 'quantity'
  | 'price'

export type ProductField = {
  key: ProductFieldKey
  visible: boolean
  /** Printed before the value, e.g. "Cena netto: ". */
  prefix: string
  style: TextStyle
}

export type TableColumn = {
  key: ProductFieldKey
  label: string
  /** Share of the table width, in percent. */
  width: number
  align: Align
  visible: boolean
}

export type TemplateLayout = 'row' | 'grid' | 'table'
export type ImagePosition = 'left' | 'right' | 'top'

export type Template = {
  id: string
  name: string
  builtIn: boolean
  layout: TemplateLayout

  page: {
    orientation: 'portrait' | 'landscape'
    /** Millimetres per side. */
    margin: Box
    background: string
  }

  font: { family: string; baseSize: number }
  colors: { accent: string; text: string; muted: string }

  image: {
    visible: boolean
    width: number
    height: number
    position: ImagePosition
    fit: 'contain' | 'cover'
    radius: number
    /** Space between the photo and the text column. */
    gap: number
  }

  product: {
    /** Ordered — the array order is the print order. */
    fields: ProductField[]
    /** Space between product blocks, in pixels. */
    gap: number
    padding: Box
    divider: { visible: boolean; color: string; width: number }
    card: { border: number; borderColor: string; radius: number; background: string }
    /** Columns used by the grid layout. */
    columns: number
  }

  table: {
    columns: TableColumn[]
    rowPadding: number
    zebra: boolean
    headerBackground: string
    headerColor: string
    borderColor: string
  }

  header: {
    visible: boolean
    logo: { visible: boolean; width: number; align: Align }
    title: { visible: boolean; text: string; style: TextStyle }
    company: { visible: boolean; align: Align; style: TextStyle }
    divider: { visible: boolean; color: string; width: number }
    spaceBelow: number
  }

  cover: {
    enabled: boolean
    title: string
    subtitle: string
    justify: 'start' | 'center' | 'end'
    logoWidth: number
    titleStyle: TextStyle
    subtitleStyle: TextStyle
  }

  terms: {
    enabled: boolean
    title: string
    text: string
    style: TextStyle
    spaceAbove: number
  }

  footer: { text: string; showPageNumbers: boolean; style: TextStyle }
}

export type Company = {
  name: string
  address: string
  nip: string
  phone: string
  email: string
  www: string
  bankAccount: string
  logo: string | null
}

export type Settings = { dataDir: string }

/**
 * Progress of the auto-updater, pushed from the main process to the renderer.
 * `none` means the check finished and the app is already current.
 */
export type UpdateStatus =
  | { state: 'idle' | 'checking' | 'none' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }

export type ImageKind = 'products' | 'logo'

/** A resolved offer line: the offer item joined with its product and effective price. */
export type ResolvedLine = {
  item: OfferItem
  product: Product
  price: number
}

/**
 * Edits the interactive preview sends back to the builder. The canvas is an
 * iframe, so these arrive as postMessage payloads.
 */
export type CanvasEdit =
  | { op: 'margin'; side: keyof Box; value: number }
  | { op: 'imageSize'; width: number; height: number }
  | { op: 'logoWidth'; value: number }
  | { op: 'reorderField'; from: number; to: number }
  | { op: 'columnWidth'; index: number; width: number; nextWidth: number }
  | { op: 'select'; target: string }
