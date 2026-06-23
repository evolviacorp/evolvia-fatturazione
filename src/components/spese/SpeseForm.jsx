import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { SOCI, SOCIO_LABELS, SOCIO_COLORS, formatCurrency } from '../../utils/format'
import { useCategorieSpese } from '../../hooks/useCategorieSpese'
import { useBanche } from '../../hooks/useBanche'
import { useAliquoteIva } from '../../hooks/useAliquoteIva'

const schema = z.object({
  data_documento:    z.string().min(1, 'Data obbligatoria'),
  data_pagamento:    z.string().optional().or(z.literal('')),
  numero_documento:  z.string().optional().or(z.literal('')),
  fornitore:         z.string().min(1, 'Fornitore obbligatorio'),
  descrizione:       z.string().optional().or(z.literal('')),
  categoria:         z.string().min(1, 'Seleziona una categoria'),
  importo:           z.number({ invalid_type_error: 'Importo obbligatorio' }).positive('Importo deve essere > 0'),
  banca:             z.string().optional().or(z.literal('')),
  link_drive:        z.string().optional().or(z.literal('')),
  pagata:            z.boolean(),
  nota_di_credito:   z.boolean(),
  iva_personalizzata: z.boolean(),
  iva_pct:           z.number().min(0).max(100),
  iva_importo:       z.number().min(0),
  ripartizione_tipo: z.enum(['uguale', 'custom']),
  quote_riccardo:    z.number().min(0).optional(),
  quote_mattia:      z.number().min(0).optional(),
  quote_sergio:      z.number().min(0).optional(),
  // Fattura allegata
  ha_fattura_allegata:  z.boolean(),
  ritenuta_acconto:     z.number().min(0).optional().or(z.nan()),
  contributo_albo:      z.number().min(0).optional().or(z.nan()),
  contributo_albo_nome: z.string().optional().or(z.literal('')),
})

// ── UI helpers ────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-2 pb-1 border-b border-slate-100">
      {children}
    </div>
  )
}

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function Input({ hasError, className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
        hasError ? 'border-red-400 bg-red-50' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  )
}

function AmountInput({ suffix = '€', hasError, className = '', ...props }) {
  return (
    <div className="relative">
      <Input hasError={hasError} className={`pr-6 ${className}`} {...props} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
        {suffix}
      </span>
    </div>
  )
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

// ── Defaults ─────────────────────────────────────────────

function buildDefaults(editing) {
  const findQ = socio => (editing?.spese_quote_soci ?? []).find(q => q.socio === socio)?.importo ?? 0
  const hasFat = editing
    ? (editing.ritenuta_acconto > 0 || editing.contributo_albo > 0 || !!editing.contributo_albo_nome)
    : false

  return {
    data_documento:    editing?.data_documento    ?? format(new Date(), 'yyyy-MM-dd'),
    data_pagamento:    editing?.data_pagamento    ?? '',
    numero_documento:  editing?.numero_documento  ?? '',
    fornitore:         editing?.fornitore         ?? '',
    descrizione:       editing?.descrizione       ?? '',
    categoria:         editing?.categoria         ?? '',
    importo:           editing?.importo           ?? undefined,
    banca:             editing?.banca             ?? '',
    link_drive:        editing?.link_drive        ?? '',
    pagata:            editing?.pagata            ?? false,
    nota_di_credito:   editing?.nota_di_credito   ?? false,
    iva_personalizzata: editing?.iva_personalizzata ?? false,
    iva_pct:           editing?.iva_pct           ?? 22,
    iva_importo:       editing?.iva_importo       ?? 0,
    ripartizione_tipo: editing?.ripartizione_tipo ?? 'uguale',
    quote_riccardo: findQ('riccardo'),
    quote_mattia:   findQ('mattia'),
    quote_sergio:   findQ('sergio'),
    ha_fattura_allegata:  hasFat,
    ritenuta_acconto:     editing?.ritenuta_acconto     ?? 0,
    contributo_albo:      editing?.contributo_albo      ?? 0,
    contributo_albo_nome: editing?.contributo_albo_nome ?? '',
  }
}

// ── Componente ────────────────────────────────────────────

export default function SpeseForm({ editing, onSubmit, onCancel, loading }) {
  const categorieSpese = useCategorieSpese()
  const banche         = useBanche()
  const aliquoteIva    = useAliquoteIva()

  const {
    register, handleSubmit, watch, setValue, setError, clearErrors,
    formState: { errors }, reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(editing),
  })

  useEffect(() => { reset(buildDefaults(editing)) }, [editing?.id, reset])

  // Watched values
  const importo          = parseFloat(watch('importo')) || 0
  const ivaPct           = parseFloat(watch('iva_pct')) || 0
  const ivaPersonalizzata = watch('iva_personalizzata')
  const ripartizioneTipo = watch('ripartizione_tipo')
  const haFattura        = watch('ha_fattura_allegata')
  const datDocumento     = watch('data_documento')

  const ivaComputed = ivaPersonalizzata
    ? parseFloat(watch('iva_importo')) || 0
    : Math.round(importo * ivaPct / 100 * 100) / 100

  const dateParsed = datDocumento ? new Date(datDocumento) : null
  const meseDerived = dateParsed ? dateParsed.getMonth() + 1 : null
  const annoDerived = dateParsed ? dateParsed.getFullYear() : null

  // Quote uguale
  const q = Math.round(importo / 3 * 100) / 100
  const r = Math.round((importo - q * 3) * 100) / 100
  const quoteUguali = { riccardo: q + r, mattia: q, sergio: q }

  // Custom sum
  const qR = parseFloat(watch('quote_riccardo')) || 0
  const qM = parseFloat(watch('quote_mattia'))   || 0
  const qS = parseFloat(watch('quote_sergio'))   || 0
  const sommaCustom = Math.round((qR + qM + qS) * 100) / 100
  const customOk = Math.abs(sommaCustom - importo) < 0.01

  function switchRipartizione(tipo) {
    setValue('ripartizione_tipo', tipo)
    clearErrors('_quoteSum')
    if (tipo === 'custom' && importo > 0) {
      setValue('quote_riccardo', quoteUguali.riccardo)
      setValue('quote_mattia',   quoteUguali.mattia)
      setValue('quote_sergio',   quoteUguali.sergio)
    }
  }

  function submitHandler(values) {
    // Validazione quote custom
    if (values.ripartizione_tipo === 'custom') {
      const sum = (values.quote_riccardo || 0) + (values.quote_mattia || 0) + (values.quote_sergio || 0)
      if (Math.abs(sum - values.importo) > 0.01) {
        setError('_quoteSum', {
          message: `La somma (${formatCurrency(sum)}) deve essere uguale all'importo (${formatCurrency(values.importo)})`,
        })
        return
      }
    }

    const date = new Date(values.data_documento)
    const spesa = {
      data_documento:   values.data_documento,
      data_pagamento:   values.data_pagamento || null,
      numero_documento: values.numero_documento || null,
      fornitore:        values.fornitore.trim(),
      descrizione:      values.descrizione || null,
      categoria:        values.categoria,
      importo:          values.importo,
      mese:             date.getMonth() + 1,
      anno:             date.getFullYear(),
      banca:            values.banca || null,
      link_drive:       values.link_drive || null,
      pagata:           values.pagata,
      nota_di_credito:  values.nota_di_credito,
      iva_pct:          values.iva_pct,
      iva_personalizzata: values.iva_personalizzata,
      iva_importo:      values.iva_personalizzata
        ? values.iva_importo
        : Math.round(values.importo * values.iva_pct / 100 * 100) / 100,
      ripartizione_tipo: values.ripartizione_tipo,
      ritenuta_acconto:     values.ha_fattura_allegata ? (parseFloat(values.ritenuta_acconto)     || 0) : 0,
      contributo_albo:      values.ha_fattura_allegata ? (parseFloat(values.contributo_albo)      || 0) : 0,
      contributo_albo_nome: values.ha_fattura_allegata ? (values.contributo_albo_nome || null)        : null,
    }

    const quoteCustom = {
      riccardo: values.quote_riccardo || 0,
      mattia:   values.quote_mattia   || 0,
      sergio:   values.quote_sergio   || 0,
    }

    onSubmit({ spesa, ripartizione_tipo: values.ripartizione_tipo, quoteCustom })
  }

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-5">

      {/* ── DATI DOCUMENTO ── */}
      <SectionTitle>Dati documento</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data documento *" error={errors.data_documento?.message}>
          <Input type="date" hasError={!!errors.data_documento} {...register('data_documento')} />
        </Field>
        <Field label="Data pagamento">
          <Input type="date" {...register('data_pagamento')} />
        </Field>
        <Field label="Fornitore *" error={errors.fornitore?.message} className="col-span-2">
          <Input type="text" hasError={!!errors.fornitore} placeholder="Ragione sociale o nome"
            {...register('fornitore')} />
        </Field>
        <Field label="N. Documento">
          <Input type="text" placeholder="es. FT-001/2025" {...register('numero_documento')} />
        </Field>
        <Field label="Banca">
          <Input type="text" list="banche-list" placeholder="es. Unicredit" {...register('banca')} />
          <datalist id="banche-list">
            {banche.map(nome => <option key={nome} value={nome} />)}
          </datalist>
        </Field>
      </div>

      {/* ── CLASSIFICAZIONE ── */}
      <SectionTitle>Classificazione</SectionTitle>
      <Field label="Categoria *" error={errors.categoria?.message}>
        <select
          {...register('categoria')}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
            errors.categoria ? 'border-red-400 bg-red-50' : 'border-slate-300'
          }`}
        >
          <option value="">Seleziona una categoria…</option>
          {categorieSpese.map(gruppo => (
            <optgroup key={gruppo.gruppo} label={gruppo.gruppo}>
              {gruppo.voci.map(voce => (
                <option key={voce} value={voce}>{voce}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Descrizione">
        <textarea
          rows={2}
          placeholder="Dettagli aggiuntivi (opzionale)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          {...register('descrizione')}
        />
      </Field>

      {/* ── IMPORTO E IVA ── */}
      <SectionTitle>Importo e IVA</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Importo (€) *" error={errors.importo?.message}>
          <AmountInput type="number" min="0" step="0.01" placeholder="0.00"
            hasError={!!errors.importo}
            {...register('importo', { valueAsNumber: true })} />
        </Field>
        <div className="flex gap-3">
          <Field label="Mese" className="flex-1">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              {meseDerived ?? '—'}
            </div>
          </Field>
          <Field label="Anno" className="flex-1">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              {annoDerived ?? '—'}
            </div>
          </Field>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">IVA</span>
          <div className="flex gap-1.5">
            <ToggleBtn active={!ivaPersonalizzata} onClick={() => setValue('iva_personalizzata', false)}>
              % percentuale
            </ToggleBtn>
            <ToggleBtn active={ivaPersonalizzata} onClick={() => setValue('iva_personalizzata', true)}>
              € importo fisso
            </ToggleBtn>
          </div>
        </div>
        {!ivaPersonalizzata ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Aliquota IVA">
              <select
                {...register('iva_pct', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {aliquoteIva.map(a => (
                  <option key={a.percentuale} value={a.percentuale}>
                    {a.percentuale}% {a.descrizione ? `— ${a.descrizione}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="IVA calcolata">
              <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                {importo > 0 ? formatCurrency(ivaComputed) : '—'}
              </div>
            </Field>
          </div>
        ) : (
          <Field label="Importo IVA (€)" className="max-w-[50%]">
            <AmountInput type="number" min="0" step="0.01" placeholder="0.00"
              {...register('iva_importo', { valueAsNumber: true })} />
          </Field>
        )}
        {importo > 0 && (
          <div className="flex justify-end text-xs text-slate-500">
            Totale documento:{' '}
            <span className="font-semibold text-slate-800 ml-1">{formatCurrency(importo + ivaComputed)}</span>
          </div>
        )}
      </div>

      {/* ── RIPARTIZIONE SOCI ── */}
      <SectionTitle>Ripartizione soci</SectionTitle>
      <div className="space-y-3">
        <div className="flex gap-2">
          <ToggleBtn active={ripartizioneTipo === 'uguale'} onClick={() => switchRipartizione('uguale')}>
            ⅓ Uguale tra i soci
          </ToggleBtn>
          <ToggleBtn active={ripartizioneTipo === 'custom'} onClick={() => switchRipartizione('custom')}>
            Personalizzata
          </ToggleBtn>
        </div>

        {ripartizioneTipo === 'uguale' ? (
          <div className="grid grid-cols-3 gap-3">
            {SOCI.map(socio => (
              <div key={socio} className="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-2.5 h-2.5 rounded-full mb-1.5" style={{ backgroundColor: SOCIO_COLORS[socio] }} />
                <div className="text-xs text-slate-500 mb-1">{SOCIO_LABELS[socio]}</div>
                <div className="text-sm font-semibold text-slate-800">
                  {importo > 0 ? formatCurrency(quoteUguali[socio]) : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {SOCI.map(socio => (
              <div key={socio} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: SOCIO_COLORS[socio] }} />
                <label className="w-20 text-sm font-medium text-slate-700">{SOCIO_LABELS[socio]}</label>
                <AmountInput type="number" min="0" step="0.01" placeholder="0.00"
                  {...register(`quote_${socio}`, { valueAsNumber: true })} />
              </div>
            ))}
            <div className={`rounded-xl px-4 py-3 border text-sm flex items-center justify-between ${
              customOk ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <span className="text-slate-600">Somma inserita</span>
              <div className="flex items-center gap-3">
                {!customOk && importo > 0 && (
                  <span className="text-xs text-amber-600">
                    {sommaCustom < importo
                      ? `Mancano ${formatCurrency(Math.round((importo - sommaCustom) * 100) / 100)}`
                      : `Eccedenza ${formatCurrency(Math.round((sommaCustom - importo) * 100) / 100)}`}
                  </span>
                )}
                <span className={`font-bold ${customOk ? 'text-green-700' : 'text-amber-700'}`}>
                  {formatCurrency(sommaCustom)}
                </span>
                {customOk && <span className="text-green-600">✓</span>}
              </div>
            </div>
            {errors._quoteSum && <p className="text-xs text-red-600">{errors._quoteSum.message}</p>}
          </div>
        )}
      </div>

      {/* ── FATTURA FORNITORE ── */}
      <SectionTitle>Fattura del fornitore</SectionTitle>
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          {...register('ha_fattura_allegata')}
        />
        <span className="text-sm font-medium text-slate-700">Ritenuta d'acconto / Contributo albo</span>
        <span className="text-xs text-slate-400">(applicati su questa spesa)</span>
      </label>

      {haFattura && (
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ritenuta d'acconto (€)" error={errors.ritenuta_acconto?.message}>
              <AmountInput
                type="number" min="0" step="0.01" placeholder="0.00"
                {...register('ritenuta_acconto', { valueAsNumber: true })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Contributo albo (€)" error={errors.contributo_albo?.message}>
                <AmountInput
                  type="number" min="0" step="0.01" placeholder="0.00"
                  {...register('contributo_albo', { valueAsNumber: true })}
                />
              </Field>
              <Field label="Nome albo">
                <Input
                  type="text" placeholder="ENASARCO"
                  {...register('contributo_albo_nome')}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── OPZIONI ── */}
      <SectionTitle>Opzioni</SectionTitle>
      <Field label="Link Drive / Allegato">
        <Input type="url" placeholder="https://drive.google.com/…" {...register('link_drive')} />
      </Field>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            {...register('pagata')} />
          <span className="text-sm text-slate-700">Pagata</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            {...register('nota_di_credito')} />
          <span className="text-sm text-slate-700">Nota di credito</span>
        </label>
      </div>

      {/* ── AZIONI ── */}
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Annulla
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
          {loading ? 'Salvataggio…' : 'Salva spesa'}
        </button>
      </div>
    </form>
  )
}
