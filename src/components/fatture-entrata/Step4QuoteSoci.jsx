import { formatCurrency, SOCI, SOCIO_LABELS, SOCIO_COLORS } from '../../utils/format'

function n(v) { return parseFloat(v) || 0 }

export default function Step4QuoteSoci({ data, imponibile, totaleGiratoAgenti, onChange, errors }) {
  const baseSoci = Math.round((imponibile - totaleGiratoAgenti) * 100) / 100
  const somma = SOCI.reduce((s, socio) => s + n(data.quote_soci[socio]), 0)
  const rimanente = Math.round((baseSoci - somma) * 100) / 100
  const ok = Math.abs(rimanente) < 0.01

  function updateSocio(socio, value) {
    onChange('quote_soci', { ...data.quote_soci, [socio]: value })
  }

  function distribuisciEquamente() {
    const quota = Math.round(baseSoci / 3 * 100) / 100
    const resto = Math.round((baseSoci - quota * 3) * 100) / 100
    onChange('quote_soci', {
      riccardo: String(quota + resto),
      mattia: String(quota),
      sergio: String(quota),
    })
  }

  return (
    <div className="space-y-5">
      {/* Riepilogo struttura fattura */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Riepilogo fattura
        </div>
        <div className="divide-y divide-slate-100">
          <div className="px-4 py-2.5 flex justify-between text-sm">
            <span className="text-slate-600">Imponibile totale</span>
            <span className="font-medium">{formatCurrency(imponibile)}</span>
          </div>
          {totaleGiratoAgenti > 0 && (
            <div className="px-4 py-2.5 flex justify-between text-sm">
              <span className="text-slate-600">− Quota agenti (girato)</span>
              <span className="font-medium text-red-600">− {formatCurrency(totaleGiratoAgenti)}</span>
            </div>
          )}
          <div className="px-4 py-2.5 flex justify-between text-sm font-semibold bg-blue-50">
            <span className="text-blue-700">Base distribuibile ai soci</span>
            <span className="text-blue-900">{formatCurrency(baseSoci)}</span>
          </div>
        </div>
      </div>

      {/* Distribuzione rapida */}
      <button
        type="button"
        onClick={distribuisciEquamente}
        className="w-full py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors"
      >
        Distribuisci equamente ({formatCurrency(Math.round(baseSoci / 3 * 100) / 100)} cad.)
      </button>

      {/* Input per socio */}
      <div className="space-y-3">
        {SOCI.map(socio => {
          const val = data.quote_soci[socio]
          const pct = baseSoci > 0 ? Math.round(n(val) / baseSoci * 1000) / 10 : 0
          return (
            <div key={socio} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: SOCIO_COLORS[socio] }}
              />
              <label className="w-24 text-sm font-medium text-slate-700">{SOCIO_LABELS[socio]}</label>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={val}
                  onChange={e => updateSocio(socio, e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 pr-6 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
              </div>
              {n(val) > 0 && (
                <div className="w-14 text-right text-xs text-slate-500 flex-shrink-0">
                  {pct}%
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stato somma */}
      <div className={`rounded-xl px-4 py-3 border ${ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Somma inserita</span>
          <span className={`font-bold ${ok ? 'text-green-700' : 'text-amber-700'}`}>
            {formatCurrency(somma)}
          </span>
        </div>
        {!ok && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-amber-600">
              {rimanente > 0 ? `Mancano ${formatCurrency(rimanente)}` : `Eccedenza di ${formatCurrency(-rimanente)}`}
            </span>
            <span className="text-xs text-slate-500">
              Base soci: {formatCurrency(baseSoci)}
            </span>
          </div>
        )}
        {ok && (
          <p className="text-xs text-green-600 mt-1">✓ Distribuzione completa — premi "Salva" per confermare</p>
        )}
      </div>

      {errors.somma && (
        <p className="text-xs text-red-600">{errors.somma}</p>
      )}
    </div>
  )
}
