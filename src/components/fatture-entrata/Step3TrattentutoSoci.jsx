import { formatCurrency, SOCI, SOCIO_LABELS, SOCIO_COLORS } from '../../utils/format'

function n(v) { return parseFloat(v) || 0 }

export default function Step3TrattentutoSoci({ data, totaleTrattenuto, onChange, errors }) {
  const somma = SOCI.reduce((s, socio) => s + n(data.trattenuto_soci[socio]), 0)
  const rimanente = Math.round((totaleTrattenuto - somma) * 100) / 100
  const ok = Math.abs(rimanente) < 0.01

  function updateSocio(socio, value) {
    onChange('trattenuto_soci', { ...data.trattenuto_soci, [socio]: value })
  }

  function distribuisciEquamente() {
    const quota = Math.round(totaleTrattenuto / 3 * 100) / 100
    const resto = Math.round((totaleTrattenuto - quota * 3) * 100) / 100
    onChange('trattenuto_soci', {
      riccardo: String(quota + resto),
      mattia: String(quota),
      sergio: String(quota),
    })
  }

  return (
    <div className="space-y-5">
      {/* Contesto */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-4">
        <div className="text-sm text-orange-700 mb-1 font-medium">Trattenuto agenti da distribuire</div>
        <div className="text-2xl font-bold text-orange-900">{formatCurrency(totaleTrattenuto)}</div>
        <div className="text-xs text-orange-600 mt-1">
          Questo importo rimane alla SRL e va ripartito tra i soci
        </div>
      </div>

      {/* Pulsante distribuzione rapida */}
      <button
        type="button"
        onClick={distribuisciEquamente}
        className="w-full py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors"
      >
        Distribuisci equamente ({formatCurrency(Math.round(totaleTrattenuto / 3 * 100) / 100)} cad.)
      </button>

      {/* Input per socio */}
      <div className="space-y-3">
        {SOCI.map(socio => {
          const val = data.trattenuto_soci[socio]
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
              Totale da distribuire: {formatCurrency(totaleTrattenuto)}
            </span>
          </div>
        )}
        {ok && (
          <p className="text-xs text-green-600 mt-1">✓ La somma corrisponde al trattenuto</p>
        )}
      </div>

      {errors.somma && (
        <p className="text-xs text-red-600">{errors.somma}</p>
      )}
    </div>
  )
}
