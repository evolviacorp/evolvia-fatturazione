import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { SOCIO_LABELS, formatCurrency } from '../../utils/format'

// Riccardo & Mattia → forfettari (no IVA). Sergio → ordinario (IVA 22%).
const REGIME = {
  riccardo: 'forfettario',
  mattia:   'forfettario',
  sergio:   'ordinario',
}

const schema = z.object({
  socio:          z.enum(['riccardo', 'mattia', 'sergio'], { required_error: 'Seleziona un socio' }),
  data:           z.string().min(1, 'Data obbligatoria'),
  numero_fattura: z.string().optional().or(z.literal('')),
  imponibile:     z.number({ invalid_type_error: 'Imponibile obbligatorio' }).positive('Importo deve essere > 0'),
  descrizione:    z.string().optional().or(z.literal('')),
  note:           z.string().optional().or(z.literal('')),
})

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

function buildDefaults(editing) {
  return {
    socio:          editing?.socio          ?? '',
    data:           editing?.data           ?? format(new Date(), 'yyyy-MM-dd'),
    numero_fattura: editing?.numero_fattura ?? '',
    imponibile:     editing?.imponibile     ?? undefined,
    descrizione:    editing?.descrizione    ?? '',
    note:           editing?.note           ?? '',
  }
}

export default function FatturaSocioForm({ editing, onSubmit, onCancel, loading }) {
  const {
    register, handleSubmit, watch, reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(editing),
  })

  useEffect(() => { reset(buildDefaults(editing)) }, [editing?.id, reset])

  const socio     = watch('socio')
  const imponibile = parseFloat(watch('imponibile')) || 0
  const isOrdinario = socio && REGIME[socio] === 'ordinario'
  const ivaPct    = isOrdinario ? 22 : 0
  const ivaImporto = Math.round(imponibile * ivaPct / 100 * 100) / 100
  const totaleFattura = imponibile + ivaImporto

  function submitHandler(values) {
    onSubmit({
      socio:          values.socio,
      data:           values.data,
      numero_fattura: values.numero_fattura || null,
      imponibile:     values.imponibile,
      iva_pct:        REGIME[values.socio] === 'ordinario' ? 22 : 0,
      descrizione:    values.descrizione || null,
      note:           values.note || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-5">

      {/* Socio */}
      <Field label="Socio *" error={errors.socio?.message}>
        <select
          {...register('socio')}
          className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.socio ? 'border-red-400 bg-red-50' : 'border-slate-300'
          }`}
        >
          <option value="">Seleziona socio…</option>
          <option value="riccardo">Riccardo — forfettario</option>
          <option value="mattia">Mattia — forfettario</option>
          <option value="sergio">Sergio — regime ordinario (IVA 22%)</option>
        </select>
      </Field>

      {/* Data e numero */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data fattura *" error={errors.data?.message}>
          <Input type="date" hasError={!!errors.data} {...register('data')} />
        </Field>
        <Field label="N. Fattura">
          <Input type="text" placeholder="es. 01/2025" {...register('numero_fattura')} />
        </Field>
      </div>

      {/* Importi */}
      <div className={`grid gap-4 ${isOrdinario ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <Field label="Imponibile (€) *" error={errors.imponibile?.message}>
          <div className="relative">
            <Input
              type="number" min="0" step="0.01" placeholder="0.00"
              hasError={!!errors.imponibile}
              className="pr-6"
              {...register('imponibile', { valueAsNumber: true })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
          </div>
        </Field>

        {isOrdinario && (
          <>
            <Field label="IVA 22% (auto)">
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium">
                {imponibile > 0 ? formatCurrency(ivaImporto) : '—'}
              </div>
            </Field>
            <Field label="Totale fattura">
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800">
                {imponibile > 0 ? formatCurrency(totaleFattura) : '—'}
              </div>
            </Field>
          </>
        )}
      </div>

      {/* Riepilogo regime */}
      {socio && (
        <div className={`rounded-xl px-4 py-3 border text-sm ${
          isOrdinario
            ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
            : 'bg-green-50 border-green-100 text-green-700'
        }`}>
          <span className="font-medium">{SOCIO_LABELS[socio]}</span>
          {' '}—{' '}
          {isOrdinario
            ? 'Regime ordinario: IVA 22% applicata. Il totale da pagare è imponibile + IVA.'
            : 'Regime forfettario: nessuna IVA, nessuna ritenuta. Il totale corrisponde all\'imponibile.'}
          {imponibile > 0 && (
            <span className="block mt-1 font-semibold">
              Scala dal residuo di {SOCIO_LABELS[socio]}: −{formatCurrency(imponibile)}
            </span>
          )}
        </div>
      )}

      {/* Descrizione */}
      <Field label="Descrizione">
        <textarea
          rows={2}
          placeholder="Descrizione della prestazione (opzionale)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          {...register('descrizione')}
        />
      </Field>

      {/* Note */}
      <Field label="Note">
        <textarea
          rows={2}
          placeholder="Note aggiuntive (opzionale)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          {...register('note')}
        />
      </Field>

      {/* Azioni */}
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Annulla
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
          {loading ? 'Salvataggio…' : editing ? 'Aggiorna fattura' : 'Registra fattura'}
        </button>
      </div>
    </form>
  )
}
