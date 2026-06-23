import { useMemo, useState } from 'react'
import { useFattureSoci } from '../hooks/useFattureSoci'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import FatturaSocioForm from '../components/fatture-soci/FatturaSocioForm'
import Badge from '../components/ui/Badge'
import { SOCI, SOCIO_LABELS, SOCIO_COLORS, formatCurrency, formatDate } from '../utils/format'

const SOCIO_BADGE_COLOR = { riccardo: 'blue', mattia: 'green', sergio: 'purple' }

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3">🧾</div>
      <p className="text-slate-600 font-medium">Nessuna fattura socio registrata</p>
      <p className="text-slate-400 text-sm mt-1 mb-4">Registra la prima fattura emessa da un socio</p>
      <button
        onClick={onNew}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Nuova fattura socio
      </button>
    </div>
  )
}

export default function FattureSoci() {
  const { fatture, loading, error, createFattura, updateFattura, deleteFattura } = useFattureSoci()
  const toast = useToast()

  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [filtroSocio, setFiltroSocio] = useState('')

  function openNew()    { setEditing(null); setModalOpen(true) }
  function openEdit(f)  { setEditing(f);    setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) {
        await updateFattura(editing.id, payload)
        toast('Fattura aggiornata')
      } else {
        await createFattura(payload)
        toast('Fattura registrata')
      }
      closeModal()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteFattura(deleteTarget.id)
      toast('Fattura eliminata')
      setDeleteTarget(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Filtro
  const fattureFiltrate = useMemo(() =>
    filtroSocio ? fatture.filter(f => f.socio === filtroSocio) : fatture,
    [fatture, filtroSocio]
  )

  // Totali per socio (su tutte le fatture, non filtrate)
  const totaliPerSocio = useMemo(() => {
    const acc = {}
    SOCI.forEach(s => { acc[s] = { imponibile: 0, totale: 0, count: 0 } })
    fatture.forEach(f => {
      acc[f.socio].imponibile += f.imponibile ?? 0
      acc[f.socio].totale     += f.totale_fattura ?? 0
      acc[f.socio].count      += 1
    })
    return acc
  }, [fatture])

  const totImponibile = fattureFiltrate.reduce((s, f) => s + (f.imponibile ?? 0), 0)
  const totTotale     = fattureFiltrate.reduce((s, f) => s + (f.totale_fattura ?? 0), 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fatture Soci</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fatture emesse dai soci alla SRL — scalano dal residuo individuale</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nuova fattura socio
        </button>
      </div>

      {/* Cards totali per socio */}
      {fatture.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {SOCI.map(socio => {
            const t = totaliPerSocio[socio]
            return (
              <button
                key={socio}
                onClick={() => setFiltroSocio(filtroSocio === socio ? '' : socio)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  filtroSocio === socio
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOCIO_COLORS[socio] }} />
                  <span className="text-sm font-semibold text-slate-800">{SOCIO_LABELS[socio]}</span>
                  {t.count > 0 && (
                    <span className="ml-auto text-xs text-slate-400">{t.count} fatt.</span>
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900">{formatCurrency(t.imponibile)}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {t.totale !== t.imponibile
                    ? `Totale con IVA: ${formatCurrency(t.totale)}`
                    : 'Forfettario — no IVA'}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filtro socio (bottoni) */}
      {!loading && fatture.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500 mr-1">Filtra per socio:</span>
          {SOCI.map(socio => (
            <button
              key={socio}
              onClick={() => setFiltroSocio(filtroSocio === socio ? '' : socio)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                filtroSocio === socio
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {SOCIO_LABELS[socio]}
            </button>
          ))}
          {filtroSocio && (
            <button
              onClick={() => setFiltroSocio('')}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕ Tutti
            </button>
          )}
        </div>
      )}

      {/* Errore */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          Errore nel caricamento: {error}
        </div>
      )}

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Caricamento…
          </div>
        ) : fatture.length === 0 ? (
          <EmptyState onNew={openNew} />
        ) : fattureFiltrate.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-500 text-sm">Nessuna fattura per il socio selezionato</p>
            <button onClick={() => setFiltroSocio('')} className="mt-2 text-xs text-blue-600 hover:underline">
              Mostra tutte
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Data', 'N. Fattura', 'Socio', 'Regime', 'Imponibile', 'IVA', 'Totale fattura', 'Note', ''].map(h => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide ${
                          ['Imponibile', 'IVA', 'Totale fattura'].includes(h) ? 'text-right' : h === '' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fattureFiltrate.map(f => {
                    const isOrdinario = f.iva_pct > 0
                    return (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                          {formatDate(f.data)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-500">
                            {f.numero_fattura || <span className="text-slate-200">—</span>}
                          </div>
                          {f.descrizione && (
                            <div className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">{f.descrizione}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SOCIO_COLORS[f.socio] }} />
                            <Badge color={SOCIO_BADGE_COLOR[f.socio]}>{SOCIO_LABELS[f.socio]}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${isOrdinario ? 'text-indigo-600' : 'text-green-600'}`}>
                            {isOrdinario ? 'Ordinario' : 'Forfettario'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(f.imponibile)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap text-xs">
                          {isOrdinario
                            ? formatCurrency(f.iva_importo)
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                          {formatCurrency(f.totale_fattura)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">
                          {f.note || <span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(f)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(f)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Elimina"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer totali */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm">
              <span className="text-xs text-slate-400">
                {fattureFiltrate.length}{' '}
                {fattureFiltrate.length !== fatture.length ? `di ${fatture.length} ` : ''}
                {fattureFiltrate.length === 1 ? 'fattura' : 'fatture'}
                {filtroSocio ? ` — ${SOCIO_LABELS[filtroSocio]}` : ''}
              </span>
              <div className="flex items-center gap-5">
                <span className="text-slate-600">
                  Imponibile: <span className="font-bold text-slate-900">{formatCurrency(totImponibile)}</span>
                </span>
                {totTotale !== totImponibile && (
                  <span className="text-slate-600">
                    Tot. con IVA: <span className="font-bold text-slate-900">{formatCurrency(totTotale)}</span>
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal form */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing
          ? `Modifica fattura — ${SOCIO_LABELS[editing.socio]} ${editing.numero_fattura ? `n. ${editing.numero_fattura}` : ''}`
          : 'Nuova fattura socio'}
        size="md"
      >
        <FatturaSocioForm
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      {/* Confirm elimina */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Elimina fattura socio"
        message={`Sei sicuro di voler eliminare la fattura di ${SOCIO_LABELS[deleteTarget?.socio] ?? ''} da ${formatCurrency(deleteTarget?.imponibile)}? L'operazione non può essere annullata.`}
      />
    </div>
  )
}
