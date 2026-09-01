/** Formats a number the Polish way: 1 234,56 */
export function formatNumber(value: number, decimals = 2): string {
  const fixed = Math.abs(value).toFixed(decimals)
  const [whole, fraction] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = value < 0 ? '-' : ''
  return fraction ? `${sign}${grouped},${fraction}` : `${sign}${grouped}`
}

/** "57,15 PLN" */
export function formatPln(value: number): string {
  return `${formatNumber(value)} PLN`
}

/** "1 368 szt" */
export function formatQuantity(value: number): string {
  return `${formatNumber(value, 0)} szt`
}

/** ISO date (or Date) -> "31.08.2026". Returns "" for empty/invalid input. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

/** Today as an ISO yyyy-mm-dd string, for <input type="date">. */
export function todayIso(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/**
 * Parses a user-typed price. Accepts both "57,15" and "57.15";
 * returns null when the text is not a usable number.
 */
export function parseDecimal(input: string): number | null {
  const cleaned = input.replace(/\s| /g, '').replace(',', '.')
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}
