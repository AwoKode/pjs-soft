import { useState, type ReactNode } from 'react'
import type { Align, Box, TextStyle } from '@shared/types'

export function Section({
  title,
  open,
  onToggle,
  highlight,
  children
}: {
  title: string
  open: boolean
  onToggle: () => void
  highlight?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <section className={highlight ? 'group highlight' : 'group'}>
      <button className="group-head" onClick={onToggle}>
        <span className="chevron">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open ? <div className="group-body">{children}</div> : null}
    </section>
  )
}

/** Number field with an optional slider, so values can be typed or swept. */
export function Num({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  slider = true,
  disabled
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  slider?: boolean
  disabled?: boolean
}): JSX.Element {
  function set(raw: number): void {
    if (!Number.isFinite(raw)) return
    onChange(Math.min(max, Math.max(min, raw)))
  }
  return (
    <div className="num-field">
      <label>
        {label}
        {unit ? <span className="unit"> ({unit})</span> : null}
      </label>
      <div className="num-row">
        {slider ? (
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => set(Number(e.target.value))}
          />
        ) : null}
        <input
          className="input num"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

const SIDES: { key: keyof Box; label: string }[] = [
  { key: 'top', label: 'Góra' },
  { key: 'right', label: 'Prawy' },
  { key: 'bottom', label: 'Dół' },
  { key: 'left', label: 'Lewy' }
]

export function BoxField({
  label,
  value,
  onChange,
  unit,
  max = 60,
  disabled
}: {
  label: string
  value: Box
  onChange: (value: Box) => void
  unit: string
  max?: number
  disabled?: boolean
}): JSX.Element {
  const [linked, setLinked] = useState(
    value.top === value.right && value.right === value.bottom && value.bottom === value.left
  )

  function set(side: keyof Box, next: number): void {
    const clamped = Math.min(max, Math.max(0, next))
    onChange(
      linked
        ? { top: clamped, right: clamped, bottom: clamped, left: clamped }
        : { ...value, [side]: clamped }
    )
  }

  return (
    <div className="box-field">
      <div className="box-head">
        <label>
          {label} <span className="unit">({unit})</span>
        </label>
        <button
          className={linked ? 'link-toggle on' : 'link-toggle'}
          title="Wszystkie strony razem"
          disabled={disabled}
          onClick={() => setLinked((v) => !v)}
        >
          {linked ? '🔗' : '⛓'}
        </button>
      </div>
      <div className="box-grid">
        {SIDES.map((side) => (
          <div key={side.key}>
            <span>{side.label}</span>
            <input
              className="input num"
              type="number"
              min={0}
              max={max}
              step={0.5}
              value={value[side.key]}
              disabled={disabled}
              onChange={(e) => set(side.key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const ALIGN_ICON: Record<Align, string> = { left: '⭰', center: '↔', right: '⭲' }

export function AlignPicker({
  label,
  value,
  onChange,
  disabled
}: {
  label?: string
  value: Align
  onChange: (value: Align) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div className="align-picker">
      {label ? <label>{label}</label> : null}
      <div className="radio-row tight">
        {(['left', 'center', 'right'] as Align[]).map((align) => (
          <button
            key={align}
            className={value === align ? 'active' : ''}
            disabled={disabled}
            title={align}
            onClick={() => onChange(align)}
          >
            {ALIGN_ICON[align]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div className="color-row">
      <label>{label}</label>
      <div className="color-field">
        <input
          type="color"
          value={normalizeColor(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="input"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

/** <input type="color"> only accepts #rrggbb. */
function normalizeColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
}

const WEIGHTS = [
  { value: 400, label: 'Zwykła' },
  { value: 600, label: 'Półgruba' },
  { value: 700, label: 'Pogrubiona' }
]

/** Full typography control for one text element. */
export function StyleEditor({
  value,
  onChange,
  disabled,
  showSpaceAbove = true
}: {
  value: TextStyle
  onChange: (value: TextStyle) => void
  disabled?: boolean
  showSpaceAbove?: boolean
}): JSX.Element {
  function set<K extends keyof TextStyle>(key: K, next: TextStyle[K]): void {
    onChange({ ...value, [key]: next })
  }
  return (
    <div className="style-editor">
      <div className="style-row">
        <input
          className="input num"
          type="number"
          min={5}
          max={72}
          title="Rozmiar (px)"
          value={value.size}
          disabled={disabled}
          onChange={(e) => set('size', Math.min(72, Math.max(5, Number(e.target.value))))}
        />
        <select
          className="input"
          title="Grubość"
          value={value.weight}
          disabled={disabled}
          onChange={(e) => set('weight', Number(e.target.value))}
        >
          {WEIGHTS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
        <input
          type="color"
          title="Kolor"
          value={normalizeColor(value.color)}
          disabled={disabled}
          onChange={(e) => set('color', e.target.value)}
        />
        <AlignPicker value={value.align} onChange={(a) => set('align', a)} disabled={disabled} />
        <button
          className={value.uppercase ? 'btn small active-toggle' : 'btn small'}
          title="WERSALIKI"
          disabled={disabled}
          onClick={() => set('uppercase', !value.uppercase)}
        >
          AA
        </button>
      </div>
      {showSpaceAbove ? (
        <Num
          label="Odstęp od góry"
          unit="px"
          value={value.spaceAbove}
          min={0}
          max={60}
          disabled={disabled}
          onChange={(v) => set('spaceAbove', v)}
        />
      ) : null}
    </div>
  )
}
