import { useEffect, useState } from 'react'
import type { Company } from '@shared/types'
import { emptyCompany } from '@shared/defaults'
import { pl } from '../i18n/pl'
import { Field } from '../components/ui'
import { ImagePicker } from '../components/ImagePicker'

export function Firma({ notify }: { notify: (msg: string, error?: boolean) => void }): JSX.Element {
  const [form, setForm] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void window.api.company.get().then((value) => setForm(value ?? emptyCompany()))
  }, [])

  if (!form) return <div className="page-body">{pl.common.loading}</div>

  function set<K extends keyof Company>(key: K, value: Company[K]): void {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function save(): Promise<void> {
    if (!form) return
    setSaving(true)
    try {
      await window.api.company.save(form)
      notify(pl.common.saved)
    } catch (e) {
      notify(e instanceof Error ? e.message : pl.common.unknownError, true)
    } finally {
      setSaving(false)
    }
  }

  const f = pl.company.fields

  return (
    <>
      <div className="page-head">
        <h1>{pl.company.title}</h1>
        <div className="head-actions">
          <button className="btn primary" onClick={save} disabled={saving}>
            {pl.common.save}
          </button>
        </div>
      </div>

      <div className="page-body">
        <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>{pl.company.intro}</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: 18,
            alignItems: 'start'
          }}
        >
          <div className="card card-pad">
            <Field label={f.name}>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label={f.address}>
              <textarea
                className="input"
                rows={3}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
            <div className="field-row">
              <Field label={f.nip}>
                <input className="input" value={form.nip} onChange={(e) => set('nip', e.target.value)} />
              </Field>
              <Field label={f.phone}>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
            </div>
            <div className="field-row">
              <Field label={f.email}>
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label={f.www}>
                <input className="input" value={form.www} onChange={(e) => set('www', e.target.value)} />
              </Field>
            </div>
            <Field label={f.bankAccount}>
              <input
                className="input"
                value={form.bankAccount}
                onChange={(e) => set('bankAccount', e.target.value)}
              />
            </Field>
          </div>

          <div className="card card-pad">
            <Field label={f.logo}>
              <ImagePicker
                kind="logo"
                value={form.logo}
                onChange={(file) => set('logo', file)}
                onError={(msg) => notify(msg, true)}
              />
            </Field>
          </div>
        </div>
      </div>
    </>
  )
}
