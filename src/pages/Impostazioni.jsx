import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useSettings } from '../lib/SettingsContext'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useToast } from '../components/ui/Toast'
import { CATEGORIE_SPESE } from '../utils/format'

// ── Shared UI ─────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-slate-700 mb-4">{children}</h3>
}

function Lbl({ children }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>
}

function Inp({ ...props }) {
  return (
    <input
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      {...props}
    />
  )
}

function Btn({ children, variant = 'primary', size = 'md', disabled, onClick, type = 'button', ...props }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50'
  const sz   = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
  const v = {
    primary:  'bg-blue-600 text-white hover:bg-blue-700',
    ghost:    'text-slate-600 border border-slate-200 hover:bg-slate-50',
    danger:   'text-rose-600 border border-rose-200 hover:bg-rose-50',
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`${base} ${sz} ${v[variant]}`} {...props}>
      {children}
    </button>
  )
}

function InlineForm({ placeholder, onAdd, saving }) {
  const [val, setVal] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!val.trim()) return
    await onAdd(val)
    setVal('')
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Inp value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} required />
      <Btn type="submit" disabled={saving || !val.trim()}>+ Aggiungi</Btn>
    </form>
  )
}

function DeleteBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Elimina"
      className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors">
      ✕
    </button>
  )
}

// ── Sezione 1: Account ────────────────────────────────────────

function SezAccount() {
  const { user } = useAuth()
  const toast    = useToast()
  const [pw,  setPw]   = useState('')
  const [pw2, setPw2]  = useState('')
  const [err, setErr]  = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (pw.length < 6)  { setErr('La password deve avere almeno 6 caratteri'); return }
    if (pw !== pw2)     { setErr('Le password non coincidono'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) { setErr(error.message) }
    else { toast('Password aggiornata con successo'); setPw(''); setPw2('') }
  }

  return (
    <Card>
      <SectionTitle>Gestione account</SectionTitle>
      <p className="text-sm text-slate-500 mb-5">
        Account: <span className="font-medium text-slate-700">{user?.email}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <Lbl>Nuova password</Lbl>
          <Inp type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Min. 6 caratteri" minLength={6} required autoComplete="new-password" />
        </div>
        <div>
          <Lbl>Conferma nuova password</Lbl>
          <Inp type="password" value={pw2} onChange={e => setPw2(e.target.value)}
            placeholder="Ripeti la password" required autoComplete="new-password" />
        </div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <Btn type="submit" disabled={saving}>
          {saving ? 'Salvataggio…' : 'Aggiorna password'}
        </Btn>
      </form>
    </Card>
  )
}

// ── Sezione 2: Categorie spese ────────────────────────────────

function SezCategorie({ categorie, addCategoria, deleteCategoria, loading }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [gruppo, setGruppo] = useState('')
  const [voce,   setVoce]   = useState('')

  // Tutti i gruppi esistenti (default + DB)
  const gruppiDefault = CATEGORIE_SPESE.map(g => g.gruppo)
  const gruppiDB      = [...new Set(categorie.map(c => c.gruppo))]
  const tuttiGruppi   = [...new Set([...gruppiDefault, ...gruppiDB])]

  async function handleAdd(e) {
    e.preventDefault()
    if (!gruppo.trim() || !voce.trim()) return
    setSaving(true)
    try {
      await addCategoria({ gruppo: gruppo.trim(), voce: voce.trim() })
      toast('Categoria aggiunta')
      setVoce('')
    } catch (err) {
      toast(err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await deleteCategoria(id); toast('Categoria eliminata') }
    catch (err) { toast(err.message, 'error') }
  }

  return (
    <Card>
      <SectionTitle>Categorie spese</SectionTitle>

      {/* Categorie predefinite (read-only) */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Predefinite (non modificabili)
        </p>
        <div className="space-y-2">
          {CATEGORIE_SPESE.map(g => (
            <div key={g.gruppo}>
              <p className="text-xs font-semibold text-slate-500 mb-1">{g.gruppo}</p>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {g.voci.map(v => (
                  <span key={v} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categorie personalizzate */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Personalizzate
      </p>

      {!loading && categorie.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Gruppo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Voce</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {categorie.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-600">{c.gruppo}</td>
                  <td className="px-3 py-2 text-slate-800 font-medium">{c.voce}</td>
                  <td className="px-3 py-2"><DeleteBtn onClick={() => handleDelete(c.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <input
            list="gruppi-list"
            value={gruppo}
            onChange={e => setGruppo(e.target.value)}
            placeholder="Gruppo"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="gruppi-list">
            {tuttiGruppi.map(g => <option key={g} value={g} />)}
          </datalist>
        </div>
        <div className="flex-1 min-w-[160px]">
          <Inp value={voce} onChange={e => setVoce(e.target.value)} placeholder="Voce" required />
        </div>
        <Btn type="submit" disabled={saving || !gruppo.trim() || !voce.trim()}>
          + Aggiungi
        </Btn>
      </form>
    </Card>
  )
}

// ── Sezione 3: Banche ─────────────────────────────────────────

function SezBanche({ banche, addBanca, updateBanca, deleteBanca, loading }) {
  const toast    = useToast()
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]   = useState(null)
  const [editVal, setEditVal] = useState('')

  async function handleAdd(nome) {
    setSaving(true)
    try { await addBanca(nome); toast('Banca aggiunta') }
    catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleUpdate(id) {
    if (!editVal.trim()) return
    try {
      await updateBanca(id, editVal)
      toast('Banca aggiornata')
      setEditId(null)
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleDelete(id) {
    try { await deleteBanca(id); toast('Banca eliminata') }
    catch (err) { toast(err.message, 'error') }
  }

  return (
    <Card>
      <SectionTitle>Banche</SectionTitle>
      <p className="text-sm text-slate-500 mb-4">
        Le banche qui configurate appaiono come suggerimenti nel campo "Banca" delle Spese Societarie.
      </p>

      {!loading && banche.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <tbody>
              {banche.map(b => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    {editId === b.id ? (
                      <Inp value={editVal} onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(b.id); if (e.key === 'Escape') setEditId(null) }}
                        autoFocus />
                    ) : (
                      <span className="font-medium text-slate-800">{b.nome}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editId === b.id ? (
                        <>
                          <Btn size="sm" onClick={() => handleUpdate(b.id)}>✓ Salva</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>Annulla</Btn>
                        </>
                      ) : (
                        <>
                          <Btn size="sm" variant="ghost"
                            onClick={() => { setEditId(b.id); setEditVal(b.nome) }}>
                            Modifica
                          </Btn>
                          <DeleteBtn onClick={() => handleDelete(b.id)} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {banche.length === 0 && !loading && (
        <p className="text-sm text-slate-400 mb-4">Nessuna banca configurata.</p>
      )}

      <InlineForm placeholder="es. Unicredit, Intesa Sanpaolo…" onAdd={handleAdd} saving={saving} />
    </Card>
  )
}

// ── Sezione 4: Aliquote IVA ───────────────────────────────────

function SezAliquote({ aliquote, addAliquota, deleteAliquota, loading }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [pct, setPct]       = useState('')
  const [desc, setDesc]     = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    const p = parseFloat(pct.replace(',', '.'))
    if (isNaN(p) || p < 0 || p > 100) return
    setSaving(true)
    try {
      await addAliquota({ percentuale: p, descrizione: desc })
      toast('Aliquota aggiunta')
      setPct(''); setDesc('')
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, predefinita) {
    if (predefinita) { toast('Le aliquote standard non possono essere eliminate', 'warning'); return }
    try { await deleteAliquota(id); toast('Aliquota eliminata') }
    catch (err) { toast(err.message, 'error') }
  }

  return (
    <Card>
      <SectionTitle>Aliquote IVA</SectionTitle>
      <p className="text-sm text-slate-500 mb-4">
        Le aliquote configurate appaiono nel selettore IVA delle Spese Societarie.
      </p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">%</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrizione</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4].map(i => (
                <tr key={i} className="animate-pulse border-b border-slate-50">
                  <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-12" /></td>
                  <td className="px-3 py-2"><div className="h-3 bg-slate-100 rounded w-32" /></td>
                  <td />
                </tr>
              ))
            ) : aliquote.map(a => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  <span className="font-bold text-slate-800 tabular-nums">{a.percentuale}%</span>
                  {a.predefinita && (
                    <span className="ml-2 text-xs text-blue-500 font-medium">predefinita</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{a.descrizione || '—'}</td>
                <td className="px-3 py-2">
                  {!a.predefinita && <DeleteBtn onClick={() => handleDelete(a.id, a.predefinita)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <div className="w-28">
          <Inp value={pct} onChange={e => setPct(e.target.value)}
            placeholder="% (es. 5)" type="number" min="0" max="100" step="0.01" required />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Inp value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrizione (opzionale)" />
        </div>
        <Btn type="submit" disabled={saving || !pct}>+ Aggiungi</Btn>
      </form>
    </Card>
  )
}

// ── Sezione 5: Anno fiscale ───────────────────────────────────

function SezAnnoFiscale() {
  const { annoFiscale, setAnnoFiscale } = useSettings()
  const toast = useToast()
  const [val, setVal] = useState(annoFiscale)

  function handleSave(e) {
    e.preventDefault()
    const anno = parseInt(val)
    if (isNaN(anno) || anno < 2000 || anno > 2100) return
    setAnnoFiscale(anno)
    toast(`Anno fiscale impostato a ${anno}`)
  }

  return (
    <Card>
      <SectionTitle>Anno fiscale corrente</SectionTitle>
      <p className="text-sm text-slate-500 mb-4">
        Anno di default usato come punto di partenza nei filtri di Fiscale e Report. Salvato localmente nel browser.
      </p>

      <form onSubmit={handleSave} className="flex gap-3 items-end">
        <div>
          <Lbl>Anno</Lbl>
          <Inp type="number" value={val} onChange={e => setVal(e.target.value)}
            min="2000" max="2100" className="w-32" required />
        </div>
        <Btn type="submit">Salva anno</Btn>
      </form>

      <p className="text-xs text-slate-400 mt-3">
        Anno corrente impostato: <span className="font-semibold tabular-nums">{annoFiscale}</span>
      </p>
    </Card>
  )
}

// ── Sezione 6: Tema ───────────────────────────────────────────

function SezTema() {
  const { tema, setTema } = useSettings()

  return (
    <Card>
      <SectionTitle>Tema</SectionTitle>
      <p className="text-sm text-slate-500 mb-5">
        Scegli il tema dell'interfaccia. La preferenza viene salvata nel browser.
      </p>

      <div className="flex gap-3">
        {[
          { key: 'light', label: '☀️ Chiaro',   desc: 'Sfondo bianco, testo scuro'  },
          { key: 'dark',  label: '🌙 Scuro',    desc: 'Sfondo scuro, testo chiaro'  },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTema(t.key)}
            className={`flex-1 max-w-[200px] flex flex-col gap-1 px-5 py-4 rounded-xl border-2 text-left transition-all ${
              tema === t.key
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-base font-semibold text-slate-800">{t.label}</span>
            <span className="text-xs text-slate-500">{t.desc}</span>
            {tema === t.key && (
              <span className="text-xs font-medium text-blue-600 mt-0.5">✓ Attivo</span>
            )}
          </button>
        ))}
      </div>
    </Card>
  )
}

// ── Impostazioni (main) ───────────────────────────────────────

const SEZIONI = [
  { key: 'account',   label: 'Account',         icon: '👤' },
  { key: 'categorie', label: 'Categorie spese',  icon: '🏷️' },
  { key: 'banche',    label: 'Banche',           icon: '🏦' },
  { key: 'iva',       label: 'Aliquote IVA',     icon: '📊' },
  { key: 'anno',      label: 'Anno fiscale',     icon: '📅' },
  { key: 'tema',      label: 'Tema',             icon: '🎨' },
]

export default function Impostazioni() {
  const [sezione, setSezione] = useState('account')
  const {
    categorie, banche, aliquote, loading,
    addCategoria, deleteCategoria,
    addBanca, updateBanca, deleteBanca,
    addAliquota, deleteAliquota,
  } = useImpostazioni()

  function renderContent() {
    switch (sezione) {
      case 'account':
        return <SezAccount />
      case 'categorie':
        return (
          <SezCategorie
            categorie={categorie}
            addCategoria={addCategoria}
            deleteCategoria={deleteCategoria}
            loading={loading}
          />
        )
      case 'banche':
        return (
          <SezBanche
            banche={banche}
            addBanca={addBanca}
            updateBanca={updateBanca}
            deleteBanca={deleteBanca}
            loading={loading}
          />
        )
      case 'iva':
        return (
          <SezAliquote
            aliquote={aliquote}
            addAliquota={addAliquota}
            deleteAliquota={deleteAliquota}
            loading={loading}
          />
        )
      case 'anno':
        return <SezAnnoFiscale />
      case 'tema':
        return <SezTema />
      default:
        return null
    }
  }

  return (
    <div className="p-6 max-w-screen-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Impostazioni</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configurazione account e preferenze</p>
      </div>

      <div className="flex gap-6">
        {/* Nav verticale */}
        <nav className="w-48 flex-shrink-0">
          <ul className="space-y-0.5">
            {SEZIONI.map(s => (
              <li key={s.key}>
                <button
                  onClick={() => setSezione(s.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    sezione === s.key
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
