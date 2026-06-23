import { useState } from 'react'
import { useAgenti } from '../hooks/useAgenti'
import { useToast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import AgenteForm from '../components/agenti/AgenteForm'
import Badge from '../components/ui/Badge'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3">🤝</div>
      <p className="text-slate-600 font-medium">Nessun agente registrato</p>
      <p className="text-slate-400 text-sm mt-1">Aggiungi il primo agente con il pulsante in alto a destra</p>
    </div>
  )
}

export default function Agenti() {
  const { agenti, loading, error, createAgente, updateAgente, deleteAgente, toggleAttivo } = useAgenti()
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(agente) {
    setEditing(agente)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSubmit(values) {
    setSaving(true)
    try {
      if (editing) {
        await updateAgente(editing.id, values)
        toast('Agente aggiornato')
      } else {
        await createAgente(values)
        toast('Agente creato')
      }
      closeModal()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAgente(deleteTarget.id)
      toast('Agente eliminato')
      setDeleteTarget(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggle(agente) {
    try {
      await toggleAttivo(agente.id, agente.attivo)
      toast(agente.attivo ? 'Agente disattivato' : 'Agente riattivato')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agenti</h1>
          <p className="text-slate-500 text-sm mt-0.5">Anagrafica e storico compensi</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nuovo agente
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          Errore nel caricamento: {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Caricamento…
          </div>
        ) : agenti.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nominativo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Codice Fiscale</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">IBAN</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">% Trattenuta</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Stato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agenti.map(agente => (
                <tr key={agente.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {agente.cognome} {agente.nome}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {agente.codice_fiscale || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {agente.iban ? (
                      <span title={agente.iban}>
                        {agente.iban.slice(0, 4)}…{agente.iban.slice(-4)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {agente.percentuale_trattenuta}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(agente)}
                      className="cursor-pointer"
                      title={agente.attivo ? 'Clicca per disattivare' : 'Clicca per attivare'}
                    >
                      <Badge color={agente.attivo ? 'green' : 'slate'}>
                        {agente.attivo ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(agente)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteTarget(agente)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!loading && agenti.length > 0 && (
        <p className="text-xs text-slate-400 mt-3">
          {agenti.filter(a => a.attivo).length} attivi · {agenti.filter(a => !a.attivo).length} inattivi
        </p>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Modifica — ${editing.cognome} ${editing.nome}` : 'Nuovo agente'}
      >
        <AgenteForm
          defaultValues={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Elimina agente"
        message={`Sei sicuro di voler eliminare ${deleteTarget?.cognome} ${deleteTarget?.nome}? L'operazione non può essere annullata.`}
      />
    </div>
  )
}
