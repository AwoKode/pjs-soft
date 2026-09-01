import { useEffect, type ReactNode } from 'react'
import { pl } from '../i18n/pl'

/** Labelled form field with optional hint and validation message. */
export function Field({
  label,
  hint,
  error,
  children
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export function EmptyState({
  title,
  hint,
  action
}: {
  title: string
  hint?: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {hint ? <p>{hint}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  )
}

export type ConfirmSpec = {
  title: string
  body?: string
  details?: string[]
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  spec,
  onClose
}: {
  spec: ConfirmSpec | null
  onClose: () => void
}): JSX.Element | null {
  useEffect(() => {
    if (!spec) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spec, onClose])

  if (!spec) return null
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-body">
          <h2>{spec.title}</h2>
          {spec.body ? <p>{spec.body}</p> : null}
          {spec.details?.length ? (
            <ul>
              {spec.details.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <footer>
          <button className="btn" onClick={onClose}>
            {pl.common.cancel}
          </button>
          <button
            className={spec.danger ? 'btn danger' : 'btn primary'}
            onClick={() => {
              spec.onConfirm()
              onClose()
            }}
          >
            {spec.confirmLabel ?? pl.common.delete}
          </button>
        </footer>
      </div>
    </div>
  )
}

export type ToastState = { message: string; error?: boolean; action?: { label: string; run: () => void } }

export function Toast({
  toast,
  onDismiss
}: {
  toast: ToastState | null
  onDismiss: () => void
}): JSX.Element | null {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, toast.action ? 9000 : 3200)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  return (
    <div className={toast.error ? 'toast error' : 'toast'}>
      <span>{toast.message}</span>
      {toast.action ? <button onClick={toast.action.run}>{toast.action.label}</button> : null}
    </div>
  )
}
