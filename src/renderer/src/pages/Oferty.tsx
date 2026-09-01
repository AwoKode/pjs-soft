import { useEffect, useState } from 'react'
import type { Offer, Template } from '@shared/types'
import { emptyOffer } from '@shared/defaults'
import { formatDate, todayIso } from '@shared/format'
import { pl } from '../i18n/pl'
import { ConfirmDialog, EmptyState, type ConfirmSpec } from '../components/ui'
import { OfertaEdytor } from './OfertaEdytor'

export function Oferty({ notify }: { notify: (msg: string, error?: boolean) => void }): JSX.Element {
  const [offers, setOffers] = useState<Offer[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  async function reload(): Promise<void> {
    const [o, t] = await Promise.all([window.api.offers.list(), window.api.templates.list()])
    setOffers(o)
    setTemplates(t)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function createOffer(): Promise<void> {
    const templateId = templates[0]?.id
    if (!templateId) {
      notify('Brak szablonów — otwórz zakładkę Szablony.', true)
      return
    }
    const created = await window.api.offers.create(emptyOffer(templateId, todayIso()))
    await reload()
    setOpenId(created.id)
  }

  if (openId) {
    return (
      <OfertaEdytor
        offerId={openId}
        templates={templates}
        notify={notify}
        onBack={async () => {
          setOpenId(null)
          await reload()
        }}
      />
    )
  }

  const sorted = [...offers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <>
      <div className="page-head">
        <h1>{pl.offers.title}</h1>
        <div className="head-actions">
          <button className="btn primary" onClick={createOffer}>
            + {pl.offers.new}
          </button>
        </div>
      </div>

      <div className="page-body">
        {offers.length === 0 ? (
          <div className="card">
            <EmptyState
              title={pl.offers.emptyTitle}
              hint={pl.offers.emptyHint}
              action={
                <button className="btn primary" onClick={createOffer}>
                  + {pl.offers.new}
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="toolbar">
              <span className="count">{pl.offers.count(offers.length)}</span>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>{pl.offers.columns.number}</th>
                    <th>{pl.offers.columns.title}</th>
                    <th style={{ width: 200 }}>{pl.offers.columns.customer}</th>
                    <th style={{ width: 110 }}>{pl.offers.columns.date}</th>
                    <th className="num" style={{ width: 90 }}>
                      {pl.offers.columns.items}
                    </th>
                    <th style={{ width: 100 }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((offer) => (
                    <tr key={offer.id} onClick={() => setOpenId(offer.id)}>
                      <td>{offer.number || <span className="badge">bez numeru</span>}</td>
                      <td>
                        <strong>{offer.title}</strong>
                      </td>
                      <td>{offer.customer}</td>
                      <td>{formatDate(offer.date)}</td>
                      <td className="num">{offer.items.length}</td>
                      <td>
                        <button
                          className="btn ghost small"
                          title={pl.common.duplicate}
                          onClick={async (e) => {
                            e.stopPropagation()
                            await window.api.offers.duplicate(offer.id)
                            await reload()
                            notify('Utworzono kopię oferty.')
                          }}
                        >
                          ⧉
                        </button>
                        <button
                          className="btn ghost small"
                          title={pl.common.delete}
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirm({
                              title: pl.offers.deleteTitle,
                              body: pl.offers.deleteBody(offer.title),
                              danger: true,
                              onConfirm: async () => {
                                await window.api.offers.delete(offer.id)
                                await reload()
                                notify('Oferta usunięta.')
                              }
                            })
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
