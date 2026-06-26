import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, parseISO } from 'date-fns'
import { useFiscale } from '../hooks/useFiscale'
import { useToast } from '../components/ui/Toast'
import { useSettings } from '../lib/SettingsContext'
import { formatCurrency, formatDate } from '../utils/format'
import Modal from '../components/ui/Modal'

// ── Constants ─────────────────────────────────────────────────

const MESI_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

// scadMese: 0-indexed month for new Date() constructor
const QUARTER_INFO = {
  1: { label: '1° Trimestre (Gen – Mar)', short: 'Q1', scadMese: 4  }, // 16 maggio
  2: { label: '2° Trimestre (Apr – Giu)', short: 'Q2', scadMese: 7  }, // 16 agosto
  3: { label: '3° Trimestre (Lug – Set)', short: 'Q3', scadMese: 10 }, // 16 novembre
  4: { label: '4° Trimestre (Ott – Dic)', short: 'Q4', scadMese: 1  }, // 16 febbraio (anno+1)
}

// ── Helpers ───────────────────────────────────────────────────

function fmtD(date) { return format(date, 'yyyy-MM-dd') }

function inRange(dateStr, from, to) {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= fmtD(from) && d <= fmtD(to)
}

function r2(v) { return Math.round((v ?? 0) * 100) / 100 }

function getStato(daVersare, nettoOMaturato, scadenza) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (nettoOMaturato <= 0.005)
    return { label: 'A credito',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (daVersare <= 0.005)
    return { label: 'Saldato',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (scadenza < today)
    return { label: 'Scaduto',    cls: 'bg-rose-50    text-rose-700    border-rose-200'    }
  return   { label: 'Da versare', cls: 'bg-amber-50   text-amber-700   border-amber-200'   }
}

// ── Shared UI ─────────────────────────────────────────────────

function Th({ children, right, center }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 whitespace-nowrap
      ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, right, center, bold, muted, color, noBorder }) {
  return (
    <td className={`px-4 py-3 tabular-nums ${noBorder ? '' : 'border-b border-slate-50'}
      ${right ? 'text-right' : center ? 'text-center' : ''}
      ${bold  ? 'font-semibold' : ''}
      ${muted ? 'text-slate-400' : ''}
      ${color ?? 'text-slate-700'}`}>
      {children}
    </td>
  )
}

function Badge({ label, cls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color ?? 'text-slate-800'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function DeleteBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Elimina"
      className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded">
      ✕
    </button>
  )
}

function SkeletonRows({ cols, rows = 4 }) {
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

// ── VersamentoModal ───────────────────────────────────────────

function VersamentoModal({ open, onClose, tipo, context, onSubmit, saving }) {
  const [importo, setImporto] = useState('')
  const [data,    setData]    = useState('')
  const [note,    setNote]    = useState('')

  useEffect(() => {
    if (open) {
      setImporto('')
      setData(format(new Date(), 'yyyy-MM-dd'))
      setNote('')
    }
  }, [open])

  const periodoLabel = tipo === 'iva'
    ? `${QUARTER_INFO[context?.q]?.short ?? ''} ${context?.anno ?? ''}`
    : `${MESI_IT[(context?.mese ?? 1) - 1]} ${context?.anno ?? ''}`

  async function handleSubmit(e) {
    e.preventDefault()
    const imp = parseFloat(importo.replace(',', '.'))
    if (!imp || imp <= 0) return
    const base    = { importo: imp, data_versamento: data, note: note.trim() || null }
    const payload = tipo === 'iva'
      ? { ...base, anno: context.anno, trimestre: context.q }
      : { ...base, anno: context.anno, mese: context.mese }
    await onSubmit(payload)
  }

  return (
    <Modal open={open} onClose={onClose} title={`Registra versamento F24 — ${periodoLabel}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Importo versato (€)
          </label>
          <input
            type="number" step="0.01" min="0.01"
            value={importo} onChange={e => setImporto(e.target.value)}
            required placeholder="0.00" autoFocus
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Data versamento
          </label>
          <input
            type="date" value={data} onChange={e => setData(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Note <span className="text-slate-400 font-normal">(opzionale)</span>
          </label>
          <input
            type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="es. F24 telematico, numero riferimento…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Annulla
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? 'Salvataggio…' : 'Registra versamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── IVA Section ───────────────────────────────────────────────

function IvaSection({ fattureEntrata, spese, fattureSoci, versamentiIva, anno, createVers, deleteVers, loading }) {
  const toast = useToast()
  const [modal,  setModal]  = useState(null)
  const [saving, setSaving] = useState(false)

  const ivaData = useMemo(() => [1, 2, 3, 4].map(q => {
    const fromM = (q - 1) * 3
    const from  = new Date(anno, fromM, 1)
    const to    = endOfMonth(new Date(anno, fromM + 2, 1))

    let debito = 0
    for (const f of fattureEntrata) {
      if (!inRange(f.data, from, to)) continue
      debito += (f.imponibile ?? 0) * (f.iva_pct ?? 0) / 100
    }

    let creditoSpese = 0, creditoOrdinario = 0
    for (const s of spese) {
      if (!inRange(s.data_documento, from, to)) continue
      creditoSpese += s.iva_importo ?? 0
    }
    for (const fs of fattureSoci) {
      const isOrdinario = fs.socio === 'sergio' || fs.fatturato_da_sergio
      if (!isOrdinario || !inRange(fs.data, from, to)) continue
      creditoOrdinario += fs.iva_importo ?? 0
    }

    const credito   = r2(creditoSpese + creditoOrdinario)
    const debR      = r2(debito)
    const netta     = r2(debR - credito)
    const versato   = r2(versamentiIva
      .filter(v => v.anno === anno && v.trimestre === q)
      .reduce((s, v) => s + (v.importo ?? 0), 0))
    const daVersare = netta > 0.005 ? Math.max(0, r2(netta - versato)) : 0

    const info     = QUARTER_INFO[q]
    const scadAnno = q === 4 ? anno + 1 : anno
    const scadenza = new Date(scadAnno, info.scadMese, 16)

    return { q, from, to, debito: debR, creditoSpese: r2(creditoSpese), creditoOrdinario: r2(creditoOrdinario), credito, netta, versato, daVersare, scadenza }
  }), [fattureEntrata, spese, fattureSoci, versamentiIva, anno])

  const totals = useMemo(() => ivaData.reduce(
    (a, r) => ({
      debito:    r2(a.debito    + r.debito),
      credito:   r2(a.credito   + r.credito),
      netta:     r2(a.netta     + r.netta),
      versato:   r2(a.versato   + r.versato),
      daVersare: r2(a.daVersare + r.daVersare),
    }),
    { debito: 0, credito: 0, netta: 0, versato: 0, daVersare: 0 }
  ), [ivaData])

  const versamentiAnno = versamentiIva
    .filter(v => v.anno === anno)
    .sort((a, b) => b.data_versamento.localeCompare(a.data_versamento))

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      await createVers(payload)
      setModal(null)
      toast('Versamento IVA registrato')
    } catch (err) {
      toast('Errore: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteVers(id)
      toast('Versamento eliminato')
    } catch (err) {
      toast('Errore: ' + err.message, 'error')
    }
  }

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="IVA a debito"       value={formatCurrency(totals.debito)} />
        <StatCard label="IVA a credito"      value={formatCurrency(totals.credito)}   color="text-emerald-700" />
        <StatCard label="IVA netta"
          value={formatCurrency(Math.abs(totals.netta))}
          sub={totals.netta <= 0.005 ? 'a credito' : 'da versare'}
          color={totals.netta <= 0.005 ? 'text-emerald-700' : 'text-amber-700'}
        />
        <StatCard label="Ancora da versare"  value={formatCurrency(totals.daVersare)} color={totals.daVersare > 0.005 ? 'text-rose-600' : 'text-emerald-700'} />
      </div>

      {/* Quarterly table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <Th>Trimestre</Th>
              <Th right>IVA debito</Th>
              <Th right>IVA credito</Th>
              <Th right>IVA netta</Th>
              <Th right>Versato</Th>
              <Th right>Da versare</Th>
              <Th center>Scadenza F24</Th>
              <Th center>Stato</Th>
              <Th center></Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={9} />
            ) : ivaData.map(row => {
              const stato = getStato(row.daVersare, row.netta, row.scadenza)
              return (
                <tr key={row.q} className="hover:bg-slate-50/50 transition-colors">
                  <Td><span className="font-medium text-slate-800">{QUARTER_INFO[row.q].label}</span></Td>
                  <Td right>{formatCurrency(row.debito)}</Td>
                  <Td right color="text-emerald-700">{formatCurrency(row.credito)}</Td>
                  <Td right bold color={row.netta > 0.005 ? 'text-amber-700' : 'text-emerald-700'}>
                    {row.netta <= 0.005
                      ? <span className="text-emerald-600 font-medium text-xs">a credito</span>
                      : formatCurrency(row.netta)}
                  </Td>
                  <Td right>
                    {row.versato > 0
                      ? formatCurrency(row.versato)
                      : <span className="text-slate-300">—</span>}
                  </Td>
                  <Td right bold color={row.daVersare > 0.005 ? 'text-rose-600' : 'text-slate-300'}>
                    {row.daVersare > 0.005
                      ? formatCurrency(row.daVersare)
                      : <span className="text-slate-300">—</span>}
                  </Td>
                  <Td center>
                    <span className="text-slate-500 text-xs">{formatDate(fmtD(row.scadenza))}</span>
                  </Td>
                  <Td center><Badge {...stato} /></Td>
                  <Td center>
                    {row.netta > 0.005 && row.daVersare > 0.005 && (
                      <button
                        onClick={() => setModal({ q: row.q, anno })}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        + Registra
                      </button>
                    )}
                  </Td>
                </tr>
              )
            })}
            {!loading && (
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Totale anno</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700 tabular-nums">{formatCurrency(totals.debito)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{formatCurrency(totals.credito)}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums">{formatCurrency(Math.max(0, totals.netta))}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700 tabular-nums">{formatCurrency(totals.versato)}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums">{formatCurrency(totals.daVersare)}</td>
                <td colSpan={3} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 -mt-2">
        Scadenze per regime trimestrale. IVA credito = spese con IVA + fatture in regime ordinario (Sergio + fatturate da Sergio per altri soci).
        Per il regime trimestrale aggiungere lo 0,33% di interessi sull'IVA netta di ciascun trimestre.
      </p>

      {/* Versamenti registrati */}
      {!loading && versamentiAnno.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Versamenti registrati {anno}
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Data versamento</Th>
                  <Th>Periodo</Th>
                  <Th right>Importo</Th>
                  <Th>Note</Th>
                  <Th center></Th>
                </tr>
              </thead>
              <tbody>
                {versamentiAnno.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <Td>{formatDate(v.data_versamento)}</Td>
                    <Td><span className="text-slate-600">{QUARTER_INFO[v.trimestre]?.short} {v.anno}</span></Td>
                    <Td right bold>{formatCurrency(v.importo)}</Td>
                    <Td muted>{v.note || '—'}</Td>
                    <Td center><DeleteBtn onClick={() => handleDelete(v.id)} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <VersamentoModal
        open={!!modal} onClose={() => setModal(null)}
        tipo="iva" context={modal}
        onSubmit={handleSubmit} saving={saving}
      />
    </div>
  )
}

// ── Ritenute Section ──────────────────────────────────────────

function RitenuteSection({ spese, versamentiRitenute, anno, createVers, deleteVers, loading }) {
  const toast = useToast()
  const [modal,  setModal]  = useState(null)
  const [saving, setSaving] = useState(false)

  const ritData = useMemo(() => {
    const map = new Map()

    for (const s of spese) {
      const rit = s.ritenuta_acconto ?? 0
      if (!rit || !s.data_documento) continue
      const dt   = parseISO(s.data_documento)
      if (dt.getFullYear() !== anno) continue
      const mese = dt.getMonth() + 1
      const key  = `${anno}-${String(mese).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, { anno, mese, maturato: 0, versato: 0 })
      map.get(key).maturato += rit
    }

    for (const v of versamentiRitenute) {
      if (v.anno !== anno) continue
      const key = `${anno}-${String(v.mese).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, { anno, mese: v.mese, maturato: 0, versato: 0 })
      map.get(key).versato += v.importo ?? 0
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, row]) => {
        const maturato  = r2(row.maturato)
        const versato   = r2(row.versato)
        const daVersare = Math.max(0, r2(maturato - versato))
        // 16 del mese successivo: new Date(anno, mese, 16) — mese è 1-indexed,
        // il costruttore Date usa 0-indexed, quindi mese=1 → febbraio, mese=12 → gennaio anno+1
        const scadenza  = new Date(row.anno, row.mese, 16)
        return { ...row, maturato, versato, daVersare, scadenza }
      })
  }, [spese, versamentiRitenute, anno])

  const totals = useMemo(() => ritData.reduce(
    (a, r) => ({
      maturato:  r2(a.maturato  + r.maturato),
      versato:   r2(a.versato   + r.versato),
      daVersare: r2(a.daVersare + r.daVersare),
    }),
    { maturato: 0, versato: 0, daVersare: 0 }
  ), [ritData])

  const versamentiAnno = versamentiRitenute
    .filter(v => v.anno === anno)
    .sort((a, b) => b.data_versamento.localeCompare(a.data_versamento))

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      await createVers(payload)
      setModal(null)
      toast('Versamento ritenute registrato')
    } catch (err) {
      toast('Errore: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteVers(id)
      toast('Versamento eliminato')
    } catch (err) {
      toast('Errore: ' + err.message, 'error')
    }
  }

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Ritenute maturate"  value={formatCurrency(totals.maturato)} />
        <StatCard label="Versato"             value={formatCurrency(totals.versato)}   color="text-emerald-700" />
        <StatCard label="Ancora da versare"   value={formatCurrency(totals.daVersare)} color={totals.daVersare > 0.005 ? 'text-rose-600' : 'text-emerald-700'} />
      </div>

      {/* Monthly table */}
      {!loading && ritData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-400 text-sm">
          Nessuna ritenuta d'acconto per {anno}.
          <span className="block text-xs mt-1">Le ritenute si registrano nelle Spese Societarie nel campo "Ritenuta d'acconto".</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Mese competenza</Th>
                <Th right>Maturato</Th>
                <Th right>Versato</Th>
                <Th right>Da versare</Th>
                <Th center>Scadenza F24</Th>
                <Th center>Stato</Th>
                <Th center></Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} rows={3} />
              ) : ritData.map(row => {
                const stato = getStato(row.daVersare, row.maturato, row.scadenza)
                return (
                  <tr key={`${row.anno}-${row.mese}`} className="hover:bg-slate-50/50 transition-colors">
                    <Td>
                      <span className="font-medium text-slate-800">
                        {MESI_IT[row.mese - 1]} {row.anno}
                      </span>
                    </Td>
                    <Td right>{formatCurrency(row.maturato)}</Td>
                    <Td right>
                      {row.versato > 0
                        ? formatCurrency(row.versato)
                        : <span className="text-slate-300">—</span>}
                    </Td>
                    <Td right bold color={row.daVersare > 0.005 ? 'text-rose-600' : 'text-slate-300'}>
                      {row.daVersare > 0.005
                        ? formatCurrency(row.daVersare)
                        : <span className="text-slate-300">—</span>}
                    </Td>
                    <Td center>
                      <span className="text-slate-500 text-xs">{formatDate(fmtD(row.scadenza))}</span>
                    </Td>
                    <Td center><Badge {...stato} /></Td>
                    <Td center>
                      {row.maturato > 0 && row.daVersare > 0.005 && (
                        <button
                          onClick={() => setModal({ mese: row.mese, anno })}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          + Registra
                        </button>
                      )}
                    </Td>
                  </tr>
                )
              })}
              {!loading && ritData.length > 1 && (
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Totale</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700 tabular-nums">{formatCurrency(totals.maturato)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700 tabular-nums">{formatCurrency(totals.versato)}</td>
                  <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums">{formatCurrency(totals.daVersare)}</td>
                  <td colSpan={3} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 -mt-2">
        Scadenza versamento: 16 del mese successivo a quello in cui la ritenuta è maturata.
        Se il 16 cade di sabato o festivo, slitta al primo giorno lavorativo successivo.
      </p>

      {/* Versamenti registrati */}
      {!loading && versamentiAnno.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Versamenti registrati {anno}
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Data versamento</Th>
                  <Th>Mese di riferimento</Th>
                  <Th right>Importo</Th>
                  <Th>Note</Th>
                  <Th center></Th>
                </tr>
              </thead>
              <tbody>
                {versamentiAnno.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <Td>{formatDate(v.data_versamento)}</Td>
                    <Td><span className="text-slate-600">{MESI_IT[v.mese - 1]} {v.anno}</span></Td>
                    <Td right bold>{formatCurrency(v.importo)}</Td>
                    <Td muted>{v.note || '—'}</Td>
                    <Td center><DeleteBtn onClick={() => handleDelete(v.id)} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <VersamentoModal
        open={!!modal} onClose={() => setModal(null)}
        tipo="ritenute" context={modal}
        onSubmit={handleSubmit} saving={saving}
      />
    </div>
  )
}

// ── Fiscale (main) ────────────────────────────────────────────

export default function Fiscale() {
  const {
    fattureEntrata, spese, fattureSoci,
    versamentiIva, versamentiRitenute,
    loading, error, refresh,
    createVersamentiIva,      deleteVersamentiIva,
    createVersamentiRitenute, deleteVersamentiRitenute,
  } = useFiscale()

  const { annoFiscale } = useSettings()
  const [tab,  setTab]  = useState('iva')
  const [anno, setAnno] = useState(annoFiscale)

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fiscale</h1>
          <p className="text-slate-500 text-sm mt-0.5">IVA e ritenute d'acconto — registro versamenti</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          ⟳ Aggiorna
        </button>
      </div>

      {/* Year selector + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setAnno(a => a - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-lg">
            ‹
          </button>
          <span className="text-lg font-bold text-slate-800 tabular-nums w-14 text-center select-none">
            {anno}
          </span>
          <button onClick={() => setAnno(a => a + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-lg">
            ›
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {[
            { key: 'iva',      label: '⚖️ IVA'               },
            { key: 'ritenute', label: "🏛️ Ritenute d'acconto" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          Errore nel caricamento: {error}
        </div>
      )}

      {tab === 'iva' ? (
        <IvaSection
          fattureEntrata={fattureEntrata}
          spese={spese}
          fattureSoci={fattureSoci}
          versamentiIva={versamentiIva}
          anno={anno}
          createVers={createVersamentiIva}
          deleteVers={deleteVersamentiIva}
          loading={loading}
        />
      ) : (
        <RitenuteSection
          spese={spese}
          versamentiRitenute={versamentiRitenute}
          anno={anno}
          createVers={createVersamentiRitenute}
          deleteVers={deleteVersamentiRitenute}
          loading={loading}
        />
      )}

    </div>
  )
}
