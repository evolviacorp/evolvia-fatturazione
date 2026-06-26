import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachMonthOfInterval, format, parseISO,
} from 'date-fns'
import { it } from 'date-fns/locale'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { SOCI, SOCIO_LABELS, SOCIO_COLORS, formatCurrency } from '../utils/format'

// ── Date helpers ─────────────────────────────────────────────

function fmtD(date) { return format(date, 'yyyy-MM-dd') }

function inRange(dateStr, from, to) {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= fmtD(from) && d <= fmtD(to)
}

function getPeriodRange(periodo, customFrom, customTo) {
  const now = new Date()
  switch (periodo) {
    case 'mese':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'trimestre': {
      const q = Math.floor(now.getMonth() / 3)
      return {
        from: new Date(now.getFullYear(), q * 3, 1),
        to:   endOfMonth(new Date(now.getFullYear(), q * 3 + 2, 1)),
      }
    }
    case 'anno':
      return { from: startOfYear(now), to: endOfYear(now) }
    case 'custom':
      return {
        from: customFrom ? parseISO(customFrom) : startOfMonth(now),
        to:   customTo   ? parseISO(customTo)   : endOfMonth(now),
      }
    default:
      return { from: startOfYear(now), to: endOfYear(now) }
  }
}

// ── Computation helpers ───────────────────────────────────────

function computeResiduoSocio(socio, fattureEntrata, spese, fattureSoci, from, to) {
  let entrata = 0
  for (const f of fattureEntrata) {
    if (!inRange(f.data, from, to)) continue
    const q = (f.fatture_entrata_quote_soci ?? []).find(x => x.socio === socio)
    if (q) entrata += q.importo ?? 0
  }

  let speseQuota = 0
  for (const s of spese) {
    if (!inRange(s.data_documento, from, to)) continue
    if (s.escludi_da_residuo) continue
    const q = (s.spese_quote_soci ?? []).find(x => x.socio === socio)
    if (q) speseQuota += q.importo ?? 0
  }

  let fattureEmesse = 0
  for (const f of fattureSoci) {
    if (f.socio !== socio || !inRange(f.data, from, to)) continue
    fattureEmesse += f.imponibile ?? 0
  }

  return { entrata, speseQuota, fattureEmesse,
    totale: Math.round((entrata - speseQuota - fattureEmesse) * 100) / 100 }
}

function computeIva(fattureEntrata, spese, fattureSoci, from, to) {
  let debito = 0
  for (const f of fattureEntrata) {
    if (!inRange(f.data, from, to)) continue
    debito += (f.imponibile ?? 0) * (f.iva_pct ?? 0) / 100
  }

  let credito = 0
  for (const s of spese) {
    if (!inRange(s.data_documento, from, to)) continue
    credito += s.iva_importo ?? 0
  }
  for (const f of fattureSoci) {
    const isOrdinario = f.socio === 'sergio' || f.fatturato_da_sergio
    if (!isOrdinario || !inRange(f.data, from, to)) continue
    credito += f.iva_importo ?? 0
  }

  debito  = Math.round(debito  * 100) / 100
  credito = Math.round(credito * 100) / 100
  return { debito, credito, netta: Math.round((debito - credito) * 100) / 100 }
}

function computeRitenute(spese, from, to) {
  let total = 0
  for (const s of spese) {
    if (!inRange(s.data_documento, from, to)) continue
    total += s.ritenuta_acconto ?? 0
  }
  return Math.round(total * 100) / 100
}

// Chart: cumulative residuo from beginning-of-time to end of each month in current year
const EPOCH = new Date('2000-01-01')

function buildChartData(fattureEntrata, spese, fattureSoci) {
  const now      = new Date()
  const months   = eachMonthOfInterval({ start: new Date(now.getFullYear(), 0, 1), end: now })
  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart)
    const row = { mese: format(monthStart, 'MMM', { locale: it }) }
    for (const socio of SOCI) {
      const r = computeResiduoSocio(socio, fattureEntrata, spese, fattureSoci, EPOCH, monthEnd)
      row[socio] = r.totale
    }
    return row
  })
}

// ── UI components ─────────────────────────────────────────────

function SkeletonCard({ rows = 4 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-2/5 mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  )
}

function DetailRow({ label, value, sign }) {
  const neg = sign === '−'
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className="text-slate-500 flex items-center gap-1.5">
        <span className={`text-xs font-bold ${neg ? 'text-rose-400' : 'text-emerald-500'}`}>{sign}</span>
        {label}
      </span>
      <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(value)}</span>
    </div>
  )
}

function ResidualCard({ socio, data }) {
  const pos = data.totale >= 0
  return (
    <div className={`bg-white rounded-xl border p-5 ${pos ? 'border-slate-200' : 'border-rose-200 bg-rose-50/30'}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: SOCIO_COLORS[socio] }} />
        <span className="font-semibold text-slate-800">{SOCIO_LABELS[socio]}</span>
      </div>
      <div className="space-y-2.5">
        <DetailRow label="Quota entrate"    value={data.entrata}       sign="+" />
        <DetailRow label="Quota spese soc." value={data.speseQuota}   sign="−" />
        <DetailRow label="Fatture emesse"   value={data.fattureEmesse} sign="−" />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">Residuo</span>
        <span className={`text-2xl font-bold tabular-nums ${pos ? 'text-emerald-600' : 'text-rose-600'}`}>
          {formatCurrency(data.totale)}
        </span>
      </div>
    </div>
  )
}

function IvaCard({ iva }) {
  const daVersare = iva.netta >= 0
  return (
    <div className={`rounded-xl border p-5 ${daVersare ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
      <div className={`text-sm font-semibold mb-1 flex items-center gap-1.5 ${daVersare ? 'text-amber-700' : 'text-emerald-700'}`}>
        <span>⚖️</span> IVA netta del periodo
      </div>
      <div className={`text-2xl font-bold mt-2 tabular-nums ${daVersare ? 'text-amber-900' : 'text-emerald-800'}`}>
        {formatCurrency(Math.abs(iva.netta))}
        <span className="text-sm font-medium ml-2">{daVersare ? 'da versare' : 'a credito'}</span>
      </div>
      <div className={`mt-3 pt-3 border-t space-y-1.5 text-xs ${daVersare ? 'border-amber-200 text-amber-700' : 'border-emerald-200 text-emerald-700'}`}>
        <div className="flex justify-between">
          <span>IVA a debito (fatture attive)</span>
          <span className="font-semibold tabular-nums">{formatCurrency(iva.debito)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA a credito (spese + regime ordinario)</span>
          <span className="font-semibold tabular-nums">{formatCurrency(iva.credito)}</span>
        </div>
      </div>
    </div>
  )
}

function RitenuteCard({ ritenute }) {
  const hasRit = ritenute > 0
  return (
    <div className={`rounded-xl border p-5 ${hasRit ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`text-sm font-semibold mb-1 flex items-center gap-1.5 ${hasRit ? 'text-rose-700' : 'text-slate-500'}`}>
        <span>🏛️</span> Ritenute d'acconto da versare
      </div>
      <div className={`text-2xl font-bold mt-2 tabular-nums ${hasRit ? 'text-rose-900' : 'text-slate-400'}`}>
        {formatCurrency(ritenute)}
      </div>
      <p className={`mt-3 text-xs ${hasRit ? 'text-rose-600' : 'text-slate-400'}`}>
        Trattenute su compensi a professionisti esterni nel periodo selezionato
      </p>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[180px]">
      <div className="font-semibold text-slate-700 mb-2 capitalize">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between items-center gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600">{SOCIO_LABELS[p.dataKey]}</span>
          </span>
          <span className={`font-bold tabular-nums ${p.value < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function yFmt(v) {
  const a = Math.abs(v)
  const s = v < 0 ? '-' : ''
  return a >= 1000 ? `${s}€${(a / 1000).toFixed(0)}k` : `${s}€${a.toFixed(0)}`
}

const PERIODI = [
  { key: 'mese',      label: 'Mese corrente' },
  { key: 'trimestre', label: 'Trimestre'     },
  { key: 'anno',      label: 'Anno'          },
  { key: 'custom',    label: 'Custom'        },
]

// ── Dashboard ─────────────────────────────────────────────────

export default function Dashboard() {
  const { fattureEntrata, spese, fattureSoci, loading, error, refresh } = useDashboard()
  const [periodo,    setPeriodo]    = useState('anno')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const { from, to } = useMemo(
    () => getPeriodRange(periodo, customFrom, customTo),
    [periodo, customFrom, customTo]
  )

  const residui = useMemo(() => {
    const r = {}
    for (const s of SOCI)
      r[s] = computeResiduoSocio(s, fattureEntrata, spese, fattureSoci, from, to)
    return r
  }, [fattureEntrata, spese, fattureSoci, from, to])

  const iva = useMemo(
    () => computeIva(fattureEntrata, spese, fattureSoci, from, to),
    [fattureEntrata, spese, fattureSoci, from, to]
  )

  const ritenute = useMemo(
    () => computeRitenute(spese, from, to),
    [spese, from, to]
  )

  const chartData = useMemo(
    () => buildChartData(fattureEntrata, spese, fattureSoci),
    [fattureEntrata, spese, fattureSoci]
  )

  const ZERO = { entrata: 0, speseQuota: 0, fattureEmesse: 0, totale: 0 }

  return (
    <div className="p-6 space-y-7 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Situazione finanziaria Evolvia SRL</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ⟳ Aggiorna
        </button>
      </div>

      {/* Filtro periodo */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-500">Periodo:</span>
        <div className="flex gap-1.5 flex-wrap">
          {PERIODI.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                periodo === p.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date" value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Errore */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          Errore nel caricamento: {error}
        </div>
      )}

      {/* Residui soci */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Residuo disponibile per socio
        </h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {SOCI.map(s => <SkeletonCard key={s} rows={5} />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {SOCI.map(socio => (
              <ResidualCard key={socio} socio={socio} data={residui[socio] ?? ZERO} />
            ))}
          </div>
        )}
      </section>

      {/* Posizione fiscale */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Posizione fiscale del periodo
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={2} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <IvaCard iva={iva} />
            <RitenuteCard ritenute={ritenute} />
          </div>
        )}
      </section>

      {/* Grafico andamento */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Andamento residui — {new Date().getFullYear()} (cumulativo da inizio anno)
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-300 text-sm animate-pulse">
              Caricamento grafico…
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              Nessun dato per l'anno corrente
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="mese"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={yFmt}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                <Legend
                  formatter={key => <span className="text-xs text-slate-600">{SOCIO_LABELS[key]}</span>}
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ paddingTop: 12 }}
                />
                {SOCI.map(socio => (
                  <Line
                    key={socio}
                    type="monotone"
                    dataKey={socio}
                    stroke={SOCIO_COLORS[socio]}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: SOCIO_COLORS[socio], strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

    </div>
  )
}
