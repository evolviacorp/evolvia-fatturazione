import { useState } from 'react'
import { useFattureEntrata } from '../hooks/useFattureEntrata'
import { useAgenti } from '../hooks/useAgenti'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import WizardFatturaEntrata from '../components/fatture-entrata/WizardFatturaEntrata'
import Badge from '../components/ui/Badge'
import { formatCurrency, formatDate, SOCIO_LABELS } from '../utils/format'

function QuoteSociSummary({ quotes }) {
  if (!quotes || quotes.length === 0) return <span className="text-slate-300">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {quotes.map(q => (
        <span key={q.socio} className="text-xs text-slate-600">
          <span className="font-medium">{SOCIO_LABELS[q.socio]?.slice(0, 3)}</span>{' '}
          {new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(q.importo)}
        </span>
      )).reduce((acc, el, i) => [...acc, ...(i > 0 ? [<span key={`sep-${i}`} className="text-slate-300">·</span>] : []), el], [])}
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3">📥</div>
      <p className="text-slate-600 font-medium">Nessuna fattura di entrata</p>
      <p className="text-slate-400 text-sm mt-1 mb-4">Registra la prima fattura ricevuta da un cliente</p>
      <button
        onClick={onNew}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Nuova fattura
      </button>
    </div>
  )
}

export default function FattureEntrata() {
  const { fatture, loading, error, createFattura, updateFattura, deleteFattura } = useFattureEntrata()
  const { agenti } = useAgenti()
  const toast = useToast()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function openNew() {
    setEditing(null)
    setWizardOpen(true)
  }

  function openEdit(fattura) {
    setEditing(fattura)
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateFattura(editing.id, payload)
      toast('Fattura aggiornata')
    } else {
      await createFattura(payload)
      toast('Fattura registrata')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
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

  // Totali
  const totImponibile = fatture.reduce((s, f) => s + (f.imponibile ?? 0), 0)
  const totLordo = fatture.reduce((s, f) => s + (f.totale_lordo ?? 0), 0)
  const totIva = totLordo - totImponibile
  const totQuoteSoci = ['riccardo', 'mattia', 'sergio'].reduce((acc, socio) => {
    acc[socio] = fatture.reduce((s, f) => {
      const q = (f.fatture_entrata_quote_soci ?? []).find(q => q.socio === socio)
      return s + (q?.importo ?? 0)
    }, 0)
    return acc
  }, {})

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fatture Entrata</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fatture ricevute da clienti (es. IREN)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nuova fattura
        </button>
      </div>

      {/* Error */}
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
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Data', 'N. Fattura', 'Cliente', 'Imponibile', 'IVA', 'Totale lordo', 'Quote soci', 'Agenti', ''].map(h => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide ${
                          h === 'Imponibile' || h === 'Totale lordo' ? 'text-right' : h === '' ? '' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fatture.map(fattura => {
                    const nAgenti = fattura.fatture_entrata_quote_agenti?.length ?? 0
                    const totAgentiLordo = (fattura.fatture_entrata_quote_agenti ?? [])
                      .reduce((s, q) => s + (q.importo_lordo ?? 0), 0)
                    return (
                      <tr key={fattura.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {formatDate(fattura.data)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {fattura.numero_fattura || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {fattura.cliente}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatCurrency(fattura.imponibile)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {fattura.iva_pct}%
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(fattura.totale_lordo)}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <QuoteSociSummary quotes={fattura.fatture_entrata_quote_soci} />
                        </td>
                        <td className="px-4 py-3">
                          {nAgenti > 0 ? (
                            <div className="space-y-0.5">
                              <Badge color="purple">
                                {nAgenti} {nAgenti === 1 ? 'agente' : 'agenti'}
                              </Badge>
                              <div className="text-xs text-slate-400">
                                {formatCurrency(totAgentiLordo)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(fattura)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(fattura)}
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
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-start justify-between flex-wrap gap-y-2">
              <span className="text-xs text-slate-400 mt-1">{fatture.length} fatture</span>
              <div className="flex flex-wrap justify-end gap-x-6 gap-y-1.5 text-sm">
                <span className="text-slate-600">
                  Tot. imponibile: <span className="font-semibold text-slate-900">{formatCurrency(totImponibile)}</span>
                </span>
                <span className="text-slate-600">
                  Tot. IVA: <span className="font-semibold text-slate-900">{formatCurrency(totIva)}</span>
                </span>
                <span className="text-slate-600">
                  Tot. lordo: <span className="font-bold text-blue-700">{formatCurrency(totLordo)}</span>
                </span>
                <span className="w-full h-0 basis-full" />
                <span className="text-slate-600">
                  Quota Riccardo: <span className="font-semibold text-blue-600">{formatCurrency(totQuoteSoci.riccardo)}</span>
                </span>
                <span className="text-slate-600">
                  Quota Mattia: <span className="font-semibold text-emerald-600">{formatCurrency(totQuoteSoci.mattia)}</span>
                </span>
                <span className="text-slate-600">
                  Quota Sergio: <span className="font-semibold text-amber-600">{formatCurrency(totQuoteSoci.sergio)}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Wizard modal */}
      <Modal
        open={wizardOpen}
        onClose={closeWizard}
        title={editing
          ? `Modifica fattura${editing.numero_fattura ? ' — ' + editing.numero_fattura : ''}`
          : 'Nuova fattura di entrata'
        }
        size="xl"
      >
        <WizardFatturaEntrata
          editing={editing}
          agentiList={agenti}
          onSave={handleSave}
          onClose={closeWizard}
        />
      </Modal>

      {/* Confirm elimina */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Elimina fattura"
        message={`Sei sicuro di voler eliminare la fattura di ${deleteTarget?.cliente} del ${formatDate(deleteTarget?.data)}? Verranno eliminati anche tutti i dati collegati (quote soci, agenti).`}
      />
    </div>
  )
}
