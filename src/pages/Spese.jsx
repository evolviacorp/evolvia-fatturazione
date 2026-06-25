import { useMemo, useState } from 'react'
import { useSpese } from '../hooks/useSpese'
import { useCategorieSpese } from '../hooks/useCategorieSpese'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import SpeseForm from '../components/spese/SpeseForm'
import Badge from '../components/ui/Badge'
import { CATEGORIE_SPESE, formatCurrency, formatDate } from '../utils/format'

// ── Colore categoria ──────────────────────────────────────
const GRUPPO_COLOR = {
  'Compensi soci & collaboratori': 'blue',
  'Costi operativi fissi':         'slate',
  'Servizi professionali':         'purple',
  'Costi variabili':               'amber',
  'Fiscale':                       'red',
  'Altro':                         'slate',
}

function findGruppo(categoria) {
  return CATEGORIE_SPESE.find(g => g.voci.includes(categoria))?.gruppo ?? 'Altro'
}

// ── Componenti locali ────────────────────────────────────

function CategoriaBadge({ categoria }) {
  const gruppo = findGruppo(categoria)
  return (
    <div className="space-y-0.5">
      <Badge color={GRUPPO_COLOR[gruppo] ?? 'slate'}>{categoria}</Badge>
    </div>
  )
}

function FilterBar({ filtroGruppo, setFiltroGruppo, filtroStato, setFiltroStato, search, setSearch, categorieSpese }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Cerca fornitore…"
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
      />
      <select
        value={filtroGruppo}
        onChange={e => setFiltroGruppo(e.target.value)}
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Tutte le categorie</option>
        {categorieSpese.map(g => (
          <option key={g.gruppo} value={g.gruppo}>{g.gruppo}</option>
        ))}
      </select>
      <select
        value={filtroStato}
        onChange={e => setFiltroStato(e.target.value)}
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Tutte</option>
        <option value="pagate">Pagate</option>
        <option value="da_pagare">Da pagare</option>
      </select>
      {(filtroGruppo || filtroStato || search) && (
        <button
          onClick={() => { setFiltroGruppo(''); setFiltroStato(''); setSearch('') }}
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Rimuovi filtri ✕
        </button>
      )}
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3">💸</div>
      <p className="text-slate-600 font-medium">Nessuna spesa registrata</p>
      <p className="text-slate-400 text-sm mt-1 mb-4">Registra la prima spesa societaria</p>
      <button
        onClick={onNew}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Nuova spesa
      </button>
    </div>
  )
}

// ── Pagina ────────────────────────────────────────────────

export default function Spese() {
  const { spese, loading, error, createSpesa, updateSpesa, deleteSpesa, togglePagata } = useSpese()
  const categorieSpese = useCategorieSpese()
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [filtroGruppo, setFiltroGruppo] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [search, setSearch] = useState('')

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(s) { setEditing(s); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      if (editing) {
        await updateSpesa(editing.id, payload)
        toast('Spesa aggiornata')
      } else {
        await createSpesa(payload)
        toast('Spesa registrata')
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
      await deleteSpesa(deleteTarget.id)
      toast('Spesa eliminata')
      setDeleteTarget(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleTogglePagata(s) {
    try {
      await togglePagata(s.id, s.pagata)
      toast(s.pagata ? 'Spesa segnata come da pagare' : 'Spesa segnata come pagata')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // Filtri
  const speseFiltrate = useMemo(() => {
    return spese.filter(s => {
      if (search && !s.fornitore.toLowerCase().includes(search.toLowerCase())) return false
      if (filtroGruppo && findGruppo(s.categoria) !== filtroGruppo) return false
      if (filtroStato === 'pagate' && !s.pagata) return false
      if (filtroStato === 'da_pagare' && s.pagata) return false
      return true
    })
  }, [spese, search, filtroGruppo, filtroStato])

  // Totali (sulle spese filtrate)
  const totImporto = speseFiltrate.reduce((s, x) => s + (x.importo ?? 0), 0)
  const totPagato  = speseFiltrate.filter(x => x.pagata).reduce((s, x) => s + (x.importo ?? 0), 0)
  const totDaPagare = totImporto - totPagato

  function quotaSocio(spesa, socio) {
    return spesa.spese_quote_soci?.find(q => q.socio === socio)?.importo ?? 0
  }

  const totRiccardo = speseFiltrate.reduce((s, x) => s + quotaSocio(x, 'riccardo'), 0)
  const totMattia   = speseFiltrate.reduce((s, x) => s + quotaSocio(x, 'mattia'), 0)
  const totSergio   = speseFiltrate.reduce((s, x) => s + quotaSocio(x, 'sergio'), 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Spese Societarie</h1>
          <p className="text-slate-500 text-sm mt-0.5">Spese pagate dal conto SRL</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nuova spesa
        </button>
      </div>

      {/* Sommario */}
      {spese.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Totale spese', value: totImporto, color: 'text-slate-900' },
            { label: 'Pagate', value: totPagato, color: 'text-green-700' },
            { label: 'Da pagare', value: totDaPagare, color: 'text-amber-700' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-xs text-slate-500 mb-1">{card.label}</div>
              <div className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          Errore nel caricamento: {error}
        </div>
      )}

      {/* Filtri */}
      {!loading && spese.length > 0 && (
        <FilterBar
          filtroGruppo={filtroGruppo} setFiltroGruppo={setFiltroGruppo}
          filtroStato={filtroStato} setFiltroStato={setFiltroStato}
          search={search} setSearch={setSearch}
          categorieSpese={categorieSpese}
        />
      )}

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Caricamento…
          </div>
        ) : spese.length === 0 ? (
          <EmptyState onNew={openNew} />
        ) : speseFiltrate.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-500 text-sm">Nessuna spesa corrisponde ai filtri selezionati</p>
            <button
              onClick={() => { setFiltroGruppo(''); setFiltroStato(''); setSearch('') }}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Rimuovi filtri
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Data doc.', 'N. Doc', 'Fornitore', 'Categoria', 'Importo', 'IVA', 'Ripartiz.', 'Riccardo', 'Mattia', 'Sergio', 'Fattura', 'Stato', ''].map(h => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide ${
                          h === 'Importo' || h === 'IVA' || h === 'Riccardo' || h === 'Mattia' || h === 'Sergio' ? 'text-right' : h === '' || h === 'Fattura' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {speseFiltrate.map(spesa => {
                    const ivaDisplay = spesa.iva_personalizzata
                      ? formatCurrency(spesa.iva_importo)
                      : `${spesa.iva_pct}%`
                    const haFattura = (spesa.ritenuta_acconto > 0 || spesa.contributo_albo > 0 || !!spesa.contributo_albo_nome)

                    return (
                      <tr key={spesa.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                          {formatDate(spesa.data_documento)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                          {spesa.numero_documento || <span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{spesa.fornitore}</div>
                          {spesa.descrizione && (
                            <div className="text-xs text-slate-400 truncate max-w-[180px]">{spesa.descrizione}</div>
                          )}
                          {spesa.nota_di_credito && (
                            <Badge color="amber">Nota di credito</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <CategoriaBadge categoria={spesa.categoria} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(spesa.importo)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                          {ivaDisplay}
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={spesa.ripartizione_tipo === 'uguale' ? 'slate' : 'blue'}>
                            {spesa.ripartizione_tipo === 'uguale' ? '⅓ Uguale' : 'Custom'}
                          </Badge>
                        </td>
                        {['riccardo', 'mattia', 'sergio'].map(socio => {
                          const q = quotaSocio(spesa, socio)
                          return (
                            <td key={socio} className="px-4 py-3 text-right text-sm whitespace-nowrap">
                              {q > 0
                                ? <span className="text-slate-700 font-medium">{formatCurrency(q)}</span>
                                : <span className="text-slate-300">—</span>
                              }
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-center">
                          {haFattura ? (
                            <div title={[
                              spesa.ritenuta_acconto > 0 && `Ritenuta: ${formatCurrency(spesa.ritenuta_acconto)}`,
                              spesa.contributo_albo > 0 && `${spesa.contributo_albo_nome || 'Contrib. albo'}: ${formatCurrency(spesa.contributo_albo)}`,
                            ].filter(Boolean).join(' | ')}>
                              <Badge color="purple">📎 Sì</Badge>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTogglePagata(spesa)}
                            title={spesa.pagata ? 'Clicca per segnare come da pagare' : 'Clicca per segnare come pagata'}
                          >
                            <Badge color={spesa.pagata ? 'green' : 'amber'}>
                              {spesa.pagata ? '✓ Pagata' : 'Da pagare'}
                            </Badge>
                          </button>
                          {spesa.data_pagamento && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {formatDate(spesa.data_pagamento)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {spesa.link_drive && (
                              <a
                                href={spesa.link_drive}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Apri allegato"
                              >
                                🔗
                              </a>
                            )}
                            <button
                              onClick={() => openEdit(spesa)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(spesa)}
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

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-sm">
              <span className="text-xs text-slate-400">
                {speseFiltrate.length} {speseFiltrate.length !== spese.length ? `di ${spese.length} ` : ''}
                {speseFiltrate.length === 1 ? 'spesa' : 'spese'}
              </span>
              <div className="flex items-center gap-5 flex-wrap">
                <span className="text-slate-600">
                  Totale: <span className="font-bold text-slate-900">{formatCurrency(totImporto)}</span>
                </span>
                <span className="text-green-700">
                  Pagate: <span className="font-bold">{formatCurrency(totPagato)}</span>
                </span>
                <span className="text-amber-700">
                  Da pagare: <span className="font-bold">{formatCurrency(totDaPagare)}</span>
                </span>
                <span className="border-l border-slate-200 pl-5 text-slate-500">
                  Riccardo: <span className="font-bold text-slate-700">{formatCurrency(totRiccardo)}</span>
                </span>
                <span className="text-slate-500">
                  Mattia: <span className="font-bold text-slate-700">{formatCurrency(totMattia)}</span>
                </span>
                <span className="text-slate-500">
                  Sergio: <span className="font-bold text-slate-700">{formatCurrency(totSergio)}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal form */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Modifica spesa — ${editing.fornitore}` : 'Nuova spesa societaria'}
        size="xl"
      >
        <SpeseForm
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
        title="Elimina spesa"
        message={`Sei sicuro di voler eliminare la spesa di ${deleteTarget?.fornitore} (${formatCurrency(deleteTarget?.importo)})? L'operazione non può essere annullata.`}
      />
    </div>
  )
}
