import { useCallback, useState } from 'react'
import { pl } from './i18n/pl'
import { Toast, type ToastState } from './components/ui'
import { Produkty } from './pages/Produkty'
import { Oferty } from './pages/Oferty'
import { Szablony } from './pages/Szablony'
import { Firma } from './pages/Firma'
import { Ustawienia } from './pages/Ustawienia'
import { useUpdateStatus } from './useUpdates'

type Section = 'products' | 'offers' | 'templates' | 'company' | 'settings'

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'products', label: pl.nav.products, icon: '▦' },
  { key: 'offers', label: pl.nav.offers, icon: '🗎' },
  { key: 'templates', label: pl.nav.templates, icon: '❏' },
  { key: 'company', label: pl.nav.company, icon: '⌂' },
  { key: 'settings', label: pl.nav.settings, icon: '⚙' }
]

export function App(): JSX.Element {
  const [section, setSection] = useState<Section>('products')
  const [toast, setToast] = useState<ToastState | null>(null)
  // Bumped when the data folder changes, to force every page to re-read.
  const [dataEpoch, setDataEpoch] = useState(0)
  const update = useUpdateStatus()

  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error })
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">{pl.app.name}</div>
        <nav>
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              className={section === item.key ? 'active' : ''}
              onClick={() => setSection(item.key)}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">{pl.app.tagline}</div>
      </aside>

      <main className="content">
        {update.state === 'ready' && (
          <div className="update-bar">
            <span>{pl.updates.ready(update.version)}</span>
            <button onClick={() => void window.api.updates.install()}>{pl.updates.install}</button>
          </div>
        )}

        {section === 'products' && <Produkty key={`p${dataEpoch}`} notify={notify} />}
        {section === 'offers' && <Oferty key={`o${dataEpoch}`} notify={notify} />}
        {section === 'templates' && <Szablony key={`t${dataEpoch}`} notify={notify} />}
        {section === 'company' && <Firma key={`c${dataEpoch}`} notify={notify} />}
        {section === 'settings' && (
          <Ustawienia notify={notify} onDataDirChanged={() => setDataEpoch((n) => n + 1)} />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
