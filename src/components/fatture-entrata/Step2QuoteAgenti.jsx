import { formatCurrency } from '../../utils/format'

function n(v) { return parseFloat(v) || 0 }

export default function Step2QuoteAgenti({ data, agentiList, imponibile, onChange, errors }) {
  const quote = data.quote_agenti

  const totaleGirato = quote.reduce((s, row) => s + n(row.importo_girato), 0)
  const baseSoci = imponibile - totaleGirato
  const overBudget = totaleGirato > imponibile + 0.01

  function addRow() {
    onChange('quote_agenti', [
      ...quote,
      { _key: Date.now(), agente_id: '', importo_girato: '' },
    ])
  }

  function removeRow(idx) {
    onChange('quote_agenti', quote.filter((_, i) => i !== idx))
  }

  function updateRow(idx, field, value) {
    onChange('quote_agenti', quote.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  const agentiUsati = new Set(quote.map(r => r.agente_id).filter(Boolean))

  return (
    <div className="space-y-4">
      {/* Contesto importo */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-blue-700">Imponibile fattura</span>
        <span className="font-bold text-blue-900">{formatCurrency(imponibile)}</span>
      </div>

      {/* Righe agenti */}
      {quote.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Nessun agente su questa fattura</p>
          <p className="text-xs mt-1">Premi "+ Aggiungi agente" oppure vai al passo successivo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_160px_36px] gap-2 px-1">
            {['Agente', 'Importo girato', ''].map(h => (
              <div key={h} className="text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</div>
            ))}
          </div>

          {quote.map((row, idx) => {
            const rowError = errors[`row_${idx}`]
            return (
              <div key={row._key ?? idx} className={`grid grid-cols-[1fr_160px_36px] gap-2 items-center p-2 rounded-lg ${rowError ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                {/* Agente select */}
                <select
                  value={row.agente_id}
                  onChange={e => updateRow(idx, 'agente_id', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleziona…</option>
                  {agentiList.filter(a => a.attivo || a.id === row.agente_id).map(a => (
                    <option
                      key={a.id}
                      value={a.id}
                      disabled={agentiUsati.has(a.id) && a.id !== row.agente_id}
                    >
                      {a.cognome} {a.nome}
                    </option>
                  ))}
                </select>

                {/* Importo girato */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.importo_girato}
                    onChange={e => updateRow(idx, 'importo_girato', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 pr-5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        disabled={agentiList.length === 0}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
      >
        + Aggiungi agente
      </button>

      {/* Totali */}
      {quote.length > 0 && (
        <div className={`rounded-xl p-4 border ${overBudget ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
          {overBudget && (
            <p className="text-xs text-red-600 font-medium mb-3">
              ⚠ Il totale girato agli agenti ({formatCurrency(totaleGirato)}) supera l'imponibile ({formatCurrency(imponibile)})
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Totale girato agenti</div>
              <div className="font-semibold text-green-700">{formatCurrency(totaleGirato)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Base soci</div>
              <div className={`font-bold ${baseSoci < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                {formatCurrency(baseSoci)}
              </div>
            </div>
          </div>
        </div>
      )}

      {errors.totale && (
        <p className="text-xs text-red-600">{errors.totale}</p>
      )}
    </div>
  )
}
