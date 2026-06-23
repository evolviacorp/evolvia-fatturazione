import { useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns'
import { useReport } from '../hooks/useReport'
import { SOCI, SOCIO_LABELS, CATEGORIE_SPESE, formatCurrency } from '../utils/format'

// ── Period helpers ────────────────────────────────────────────

function fmtISO(date) { return date.toISOString().slice(0, 10) }

function inRange(dateStr, from, to) {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= fmtISO(from) && d <= fmtISO(to)
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

// ── CSV export ────────────────────────────────────────────────

function fmtNum(v) {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v ?? 0)
}

function exportCsv(headers, rows, filename) {
  const bom   = '﻿'
  const lines = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
  )
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Constants ─────────────────────────────────────────────────

const PERIODI = [
  { key: 'mese',      label: 'Mese corrente' },
  { key: 'trimestre', label: 'Trimestre'     },
  { key: 'anno',      label: 'Anno'          },
  { key: 'custom',    label: 'Custom'        },
]

const FILTRI_SOCIO = [
  { key: 'tutti',    label: 'Tutti'    },
  { key: 'riccardo', label: 'Riccardo' },
  { key: 'mattia',   label: 'Mattia'   },
  { key: 'sergio',   label: 'Sergio'   },
]

// ── Shared table components ───────────────────────────────────

function SectionHeader({ title, onExport }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h2>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        ↓ Esporta CSV
      </button>
    </div>
  )
}

function Th({ children, right }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, right, bold, color }) {
  return (
    <td className={`px-4 py-3 border-b border-slate-50 tabular-nums ${right ? 'text-right' : ''} ${bold ? 'font-semibold' : ''} ${color ?? 'text-slate-700'}`}>
      {children}
    </td>
  )
}

function TotalRow({ cells }) {
  return (
    <tr className="bg-slate-50 border-t-2 border-slate-200">
      {cells.map((cell, i) => (
        <td
          key={i}
          className={`px-4 py-3 font-bold tabular-nums ${cell.right ? 'text-right' : ''} ${cell.color ?? 'text-slate-700'} ${i === 0 ? 'text-xs text-slate-500 uppercase tracking-wider' : ''}`}
        >
          {cell.value}
        </td>
      ))}
    </tr>
  )
}

function EmptyRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-slate-400 text-sm">
        Nessun dato nel periodo selezionato
      </td>
    </tr>
  )
}

function SkeletonRows({ cols, rows = 3 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-3 bg-slate-100 rounded" />
        </td>
      ))}
    </tr>
  ))
}

// ── Report ────────────────────────────────────────────────────

export default function Report() {
  const { fattureEntrata, spese, fattureSoci, loading, error, refresh } = useReport()

  const [periodo,    setPeriodo]    = useState('anno')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [filtroSocio, setFiltroSocio] = useState('tutti')

  const { from, to } = useMemo(
    () => getPeriodRange(periodo, customFrom, customTo),
    [periodo, customFrom, customTo]
  )

  // ── 1. Riepilogo per socio ────────────────────────────────

  const riepilogoSoci = useMemo(() => {
    const lista = filtroSocio === 'tutti' ? SOCI : [filtroSocio]
    return lista.map(socio => {
      let entrate = 0, trattenuto = 0, speseQuota = 0, fattureEmesse = 0

      for (const f of fattureEntrata) {
        if (!inRange(f.data, from, to)) continue
        const q = (f.fatture_entrata_quote_soci ?? []).find(x => x.socio === socio)
        if (q) entrate += q.importo ?? 0
        const t = (f.fatture_entrata_trattenuto_soci ?? []).find(x => x.socio === socio)
        if (t) trattenuto += t.importo ?? 0
      }

      for (const s of spese) {
        if (!inRange(s.data_documento, from, to)) continue
        const q = (s.spese_quote_soci ?? []).find(x => x.socio === socio)
        if (q) speseQuota += q.importo ?? 0
      }

      for (const f of fattureSoci) {
        if (f.socio !== socio || !inRange(f.data, from, to)) continue
        fattureEmesse += f.imponibile ?? 0
      }

      const residuo = Math.round((entrate + trattenuto - speseQuota - fattureEmesse) * 100) / 100
      return { socio, entrate, trattenuto, speseQuota, fattureEmesse, residuo }
    })
  }, [fattureEntrata, spese, fattureSoci, from, to, filtroSocio])

  const totRiepilogo = useMemo(() => riepilogoSoci.reduce(
    (a, r) => ({
      entrate:       a.entrate       + r.entrate,
      trattenuto:    a.trattenuto    + r.trattenuto,
      speseQuota:    a.speseQuota    + r.speseQuota,
      fattureEmesse: a.fattureEmesse + r.fattureEmesse,
      residuo:       a.residuo       + r.residuo,
    }),
    { entrate: 0, trattenuto: 0, speseQuota: 0, fattureEmesse: 0, residuo: 0 }
  ), [riepilogoSoci])

  // ── 2. Agenti ─────────────────────────────────────────────

  const agentiReport = useMemo(() => {
    const map = new Map()
    for (const f of fattureEntrata) {
      if (!inRange(f.data, from, to)) continue
      for (const qa of (f.fatture_entrata_quote_agenti ?? [])) {
        const id = qa.agente_id ?? '__sconosciuto__'
        if (!map.has(id)) {
          const ag   = qa.agenti
          const nome = ag ? `${ag.nome} ${ag.cognome}` : '(agente rimosso)'
          map.set(id, { nome, lordo: 0, trattenuto: 0, girato: 0 })
        }
        const row = map.get(id)
        row.lordo      += qa.importo_lordo      ?? 0
        row.trattenuto += qa.importo_trattenuto ?? 0
        row.girato     += qa.importo_girato     ?? 0
      }
    }
    return Array.from(map.values())
      .map(r => ({
        ...r,
        lordo:      Math.round(r.lordo      * 100) / 100,
        trattenuto: Math.round(r.trattenuto * 100) / 100,
        girato:     Math.round(r.girato     * 100) / 100,
      }))
      .sort((a, b) => b.lordo - a.lordo)
  }, [fattureEntrata, from, to])

  const totAgenti = useMemo(() => agentiReport.reduce(
    (a, r) => ({ lordo: a.lordo + r.lordo, trattenuto: a.trattenuto + r.trattenuto, girato: a.girato + r.girato }),
    { lordo: 0, trattenuto: 0, girato: 0 }
  ), [agentiReport])

  // ── 3. Spese per categoria ────────────────────────────────

  const categorieReport = useMemo(() => {
    const map = new Map()
    for (const s of spese) {
      if (!inRange(s.data_documento, from, to)) continue
      const cat = s.categoria || 'Altro'
      map.set(cat, (map.get(cat) ?? 0) + (s.importo ?? 0))
    }

    // Mantieni l'ordine definito in CATEGORIE_SPESE
    const ordered = []
    for (const { voci } of CATEGORIE_SPESE) {
      for (const v of voci) {
        if (map.has(v)) ordered.push(v)
      }
    }
    // Aggiungi eventuali categorie non previste
    for (const k of map.keys()) {
      if (!ordered.includes(k)) ordered.push(k)
    }

    return ordered.map(cat => ({
      categoria: cat,
      totale: Math.round((map.get(cat) ?? 0) * 100) / 100,
    }))
  }, [spese, from, to])

  const totSpese = useMemo(
    () => categorieReport.reduce((a, r) => a + r.totale, 0),
    [categorieReport]
  )

  // ── Export CSV ────────────────────────────────────────────

  const rangeLabel = `${fmtISO(from)}_${fmtISO(to)}`

  function exportRiepilogo() {
    exportCsv(
      ['Socio', 'Entrate', 'Trattenuto agenti', 'Quota spese soc.', 'Fatture emesse', 'Residuo'],
      riepilogoSoci.map(r => [
        SOCIO_LABELS[r.socio],
        fmtNum(r.entrate),
        fmtNum(r.trattenuto),
        fmtNum(r.speseQuota),
        fmtNum(r.fattureEmesse),
        fmtNum(r.residuo),
      ]),
      `evolvia_riepilogo_soci_${rangeLabel}.csv`
    )
  }

  function exportAgenti() {
    exportCsv(
      ['Agente', 'Totale lordo', 'Trattenuto', 'Girato'],
      agentiReport.map(r => [r.nome, fmtNum(r.lordo), fmtNum(r.trattenuto), fmtNum(r.girato)]),
      `evolvia_agenti_${rangeLabel}.csv`
    )
  }

  function exportCategorie() {
    exportCsv(
      ['Categoria', 'Totale', '% sul totale'],
      categorieReport.map(r => [
        r.categoria,
        fmtNum(r.totale),
        totSpese > 0 ? fmtNum(r.totale / totSpese * 100) : '0,00',
      ]),
      `evolvia_spese_categorie_${rangeLabel}.csv`
    )
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-8 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Riepilogo per periodo e socio, export CSV</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ⟳ Aggiorna
        </button>
      </div>

      {/* Barra filtri */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-slate-200">
        {/* Periodo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Periodo:</span>
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

        <div className="w-px h-6 bg-slate-200 hidden sm:block" />

        {/* Socio */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Socio:</span>
          <div className="flex gap-1.5 flex-wrap">
            {FILTRI_SOCIO.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroSocio(f.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  filtroSocio === f.key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          Errore nel caricamento: {error}
        </div>
      )}

      {/* ── Tabella 1: Riepilogo per socio ─────────────────── */}
      <section>
        <SectionHeader title="Riepilogo per socio" onExport={exportRiepilogo} />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Socio</Th>
                <Th right>Entrate</Th>
                <Th right>Trattenuto agenti</Th>
                <Th right>Quota spese soc.</Th>
                <Th right>Fatture emesse</Th>
                <Th right>Residuo</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} />
              ) : riepilogoSoci.length === 0 ? (
                <EmptyRow cols={6} />
              ) : (
                <>
                  {riepilogoSoci.map(r => (
                    <tr key={r.socio} className="hover:bg-slate-50/50 transition-colors">
                      <Td><span className="font-medium text-slate-800">{SOCIO_LABELS[r.socio]}</span></Td>
                      <Td right>{formatCurrency(r.entrate)}</Td>
                      <Td right>{formatCurrency(r.trattenuto)}</Td>
                      <Td right>{formatCurrency(r.speseQuota)}</Td>
                      <Td right>{formatCurrency(r.fattureEmesse)}</Td>
                      <Td right bold color={r.residuo >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatCurrency(r.residuo)}
                      </Td>
                    </tr>
                  ))}
                  {riepilogoSoci.length > 1 && (
                    <TotalRow cells={[
                      { value: 'Totale' },
                      { value: formatCurrency(totRiepilogo.entrate),       right: true },
                      { value: formatCurrency(totRiepilogo.trattenuto),    right: true },
                      { value: formatCurrency(totRiepilogo.speseQuota),    right: true },
                      { value: formatCurrency(totRiepilogo.fattureEmesse), right: true },
                      { value: formatCurrency(totRiepilogo.residuo),       right: true, color: totRiepilogo.residuo >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                    ]} />
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tabella 2: Agenti ──────────────────────────────── */}
      <section>
        <SectionHeader title="Agenti" onExport={exportAgenti} />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Agente</Th>
                <Th right>Totale lordo</Th>
                <Th right>Trattenuto</Th>
                <Th right>Girato</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={4} />
              ) : agentiReport.length === 0 ? (
                <EmptyRow cols={4} />
              ) : (
                <>
                  {agentiReport.map(r => (
                    <tr key={r.nome} className="hover:bg-slate-50/50 transition-colors">
                      <Td><span className="font-medium text-slate-800">{r.nome}</span></Td>
                      <Td right>{formatCurrency(r.lordo)}</Td>
                      <Td right>{formatCurrency(r.trattenuto)}</Td>
                      <Td right>{formatCurrency(r.girato)}</Td>
                    </tr>
                  ))}
                  <TotalRow cells={[
                    { value: 'Totale' },
                    { value: formatCurrency(totAgenti.lordo),      right: true },
                    { value: formatCurrency(totAgenti.trattenuto), right: true },
                    { value: formatCurrency(totAgenti.girato),     right: true },
                  ]} />
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tabella 3: Spese per categoria ─────────────────── */}
      <section>
        <SectionHeader title="Spese per categoria" onExport={exportCategorie} />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Categoria</Th>
                <Th right>Totale</Th>
                <Th right>% sul totale</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={3} />
              ) : categorieReport.length === 0 ? (
                <EmptyRow cols={3} />
              ) : (
                <>
                  {categorieReport.map(r => (
                    <tr key={r.categoria} className="hover:bg-slate-50/50 transition-colors">
                      <Td><span className="text-slate-700">{r.categoria}</span></Td>
                      <Td right>{formatCurrency(r.totale)}</Td>
                      <Td right>
                        <span className="text-slate-500">
                          {totSpese > 0
                            ? `${fmtNum(r.totale / totSpese * 100)} %`
                            : '—'}
                        </span>
                      </Td>
                    </tr>
                  ))}
                  <TotalRow cells={[
                    { value: 'Totale' },
                    { value: formatCurrency(totSpese), right: true },
                    { value: '100,00 %',               right: true },
                  ]} />
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
