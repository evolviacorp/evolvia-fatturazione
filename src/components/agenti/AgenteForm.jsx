import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Campo obbligatorio'),
  cognome: z.string().min(1, 'Campo obbligatorio'),
  codice_fiscale: z.string().optional().or(z.literal('')),
  iban: z.string().optional().or(z.literal('')),
  percentuale_trattenuta: z
    .number({ invalid_type_error: 'Inserisci un numero' })
    .min(0, 'Min 0')
    .max(100, 'Max 100'),
  attivo: z.boolean(),
})

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 ${className}`}
      {...props}
    />
  )
}

export default function AgenteForm({ defaultValues, onSubmit, onCancel, loading }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      nome: '',
      cognome: '',
      codice_fiscale: '',
      iban: '',
      percentuale_trattenuta: 10,
      attivo: true,
    },
  })

  useEffect(() => {
    if (defaultValues) reset(defaultValues)
  }, [defaultValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome *" error={errors.nome?.message}>
          <Input {...register('nome')} placeholder="Mario" />
        </Field>
        <Field label="Cognome *" error={errors.cognome?.message}>
          <Input {...register('cognome')} placeholder="Rossi" />
        </Field>
      </div>

      <Field label="Codice Fiscale" error={errors.codice_fiscale?.message}>
        <Input
          {...register('codice_fiscale')}
          placeholder="RSSMRA80A01H501Z"
          className="uppercase"
        />
      </Field>

      <Field label="IBAN" error={errors.iban?.message}>
        <Input {...register('iban')} placeholder="IT60X0542811101000000123456" />
      </Field>

      <Field label="% Trattenuta SRL *" error={errors.percentuale_trattenuta?.message}>
        <div className="relative">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('percentuale_trattenuta', { valueAsNumber: true })}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
        </div>
      </Field>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="attivo"
          {...register('attivo')}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="attivo" className="text-sm text-slate-700">Agente attivo</label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          {loading ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </form>
  )
}
