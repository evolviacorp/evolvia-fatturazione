function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
        props['aria-invalid'] ? 'border-red-400 bg-red-50' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  )
}

export default function Step1DatiFattura({ data, onChange, errors }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data *" error={errors.data}>
          <Input
            type="date"
            value={data.data}
            onChange={e => onChange('data', e.target.value)}
            aria-invalid={!!errors.data}
          />
        </Field>
        <Field label="N. Fattura" error={errors.numero_fattura} hint="Opzionale">
          <Input
            type="text"
            value={data.numero_fattura}
            onChange={e => onChange('numero_fattura', e.target.value)}
            placeholder="es. 001/2025"
          />
        </Field>
      </div>

      <Field label="Cliente *" error={errors.cliente}>
        <Input
          type="text"
          value={data.cliente}
          onChange={e => onChange('cliente', e.target.value)}
          placeholder="es. IREN SPA"
          aria-invalid={!!errors.cliente}
        />
      </Field>

      <Field label="Descrizione">
        <textarea
          rows={2}
          value={data.descrizione}
          onChange={e => onChange('descrizione', e.target.value)}
          placeholder="Dettagli aggiuntivi (opzionale)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Imponibile (€) *" error={errors.imponibile}>
          <div className="relative">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={data.imponibile}
              onChange={e => onChange('imponibile', e.target.value)}
              placeholder="0.00"
              className="pr-6"
              aria-invalid={!!errors.imponibile}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
          </div>
        </Field>
        <Field label="IVA %" error={errors.iva_pct}>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={data.iva_pct}
              onChange={e => onChange('iva_pct', e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
          </div>
        </Field>
      </div>

      {/* Preview totale */}
      {parseFloat(data.imponibile) > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Imponibile</div>
            <div className="font-semibold text-slate-900">
              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(data.imponibile) || 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">IVA {data.iva_pct}%</div>
            <div className="font-semibold text-slate-900">
              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                (parseFloat(data.imponibile) || 0) * (parseFloat(data.iva_pct) || 0) / 100
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Totale lordo</div>
            <div className="font-bold text-blue-700">
              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                (parseFloat(data.imponibile) || 0) * (1 + (parseFloat(data.iva_pct) || 0) / 100)
              )}
            </div>
          </div>
        </div>
      )}

      <Field label="Note" error={errors.note}>
        <textarea
          rows={2}
          value={data.note}
          onChange={e => onChange('note', e.target.value)}
          placeholder="Note aggiuntive (opzionale)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </Field>
    </div>
  )
}
