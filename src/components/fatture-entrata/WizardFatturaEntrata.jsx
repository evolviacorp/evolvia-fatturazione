import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { SOCI, formatCurrency } from '../../utils/format'
import StepIndicator from './StepIndicator'
import Step1DatiFattura from './Step1DatiFattura'
import Step2QuoteAgenti from './Step2QuoteAgenti'
import Step4QuoteSoci from './Step4QuoteSoci'

function n(v) { return parseFloat(v) || 0 }

function buildInitialState(editing) {
  if (editing) {
    const findSocio = (arr, socio) =>
      String((arr ?? []).find(r => r.socio === socio)?.importo ?? '')

    return {
      data: editing.data,
      numero_fattura: editing.numero_fattura ?? '',
      cliente: editing.cliente,
      descrizione: editing.descrizione ?? '',
      imponibile: String(editing.imponibile),
      iva_pct: String(editing.iva_pct),
      note: editing.note ?? '',
      quote_agenti: (editing.fatture_entrata_quote_agenti ?? []).map(q => ({
        _key: q.id,
        agente_id: q.agente_id,
        importo_girato: String(q.importo_girato),
      })),
      quote_soci: {
        riccardo: findSocio(editing.fatture_entrata_quote_soci, 'riccardo'),
        mattia:   findSocio(editing.fatture_entrata_quote_soci, 'mattia'),
        sergio:   findSocio(editing.fatture_entrata_quote_soci, 'sergio'),
      },
    }
  }

  return {
    data: format(new Date(), 'yyyy-MM-dd'),
    numero_fattura: '',
    cliente: '',
    descrizione: '',
    imponibile: '',
    iva_pct: '22',
    note: '',
    quote_agenti: [],
    quote_soci: { riccardo: '', mattia: '', sergio: '' },
  }
}

export default function WizardFatturaEntrata({ editing, agentiList, onSave, onClose }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(() => buildInitialState(editing))
  const [stepErrors, setStepErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const imponibile = n(formData.imponibile)

  const totaleGirato = useMemo(
    () => formData.quote_agenti.reduce((s, row) => s + n(row.importo_girato), 0),
    [formData.quote_agenti]
  )

  const baseSoci = Math.round((imponibile - totaleGirato) * 100) / 100

  function onChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
    setStepErrors({})
  }

  function validateStep1() {
    const errs = {}
    if (!formData.data) errs.data = 'Data obbligatoria'
    if (!formData.cliente.trim()) errs.cliente = 'Cliente obbligatorio'
    if (!(n(formData.imponibile) > 0)) errs.imponibile = 'Importo deve essere maggiore di 0'
    return errs
  }

  function validateStep2() {
    const errs = {}
    if (totaleGirato > imponibile + 0.01) {
      errs.totale = `Il totale girato agli agenti (${formatCurrency(totaleGirato)}) supera l'imponibile (${formatCurrency(imponibile)})`
    }
    formData.quote_agenti.forEach((row, i) => {
      if (!row.agente_id) errs[`row_${i}`] = 'Seleziona un agente'
      else if (!(n(row.importo_girato) > 0)) errs[`row_${i}`] = 'Importo non valido'
    })
    return errs
  }

  function validateStep3() {
    const errs = {}
    const somma = SOCI.reduce((s, soc) => s + n(formData.quote_soci[soc]), 0)
    if (Math.abs(somma - baseSoci) > 0.01) {
      errs.somma = `La somma (${formatCurrency(somma)}) deve essere uguale alla base soci (${formatCurrency(baseSoci)})`
    }
    return errs
  }

  function goNext() {
    let errs = {}
    if (step === 1) errs = validateStep1()
    if (step === 2) errs = validateStep2()
    if (Object.keys(errs).length > 0) { setStepErrors(errs); return }
    setStep(s => Math.min(s + 1, 3))
    setStepErrors({})
  }

  function goPrev() {
    setStep(s => Math.max(s - 1, 1))
    setStepErrors({})
  }

  async function handleSave() {
    const errs = validateStep3()
    if (Object.keys(errs).length > 0) { setStepErrors(errs); return }

    setSaving(true)
    try {
      await onSave({
        fattura: {
          data: formData.data,
          numero_fattura: formData.numero_fattura || null,
          cliente: formData.cliente.trim(),
          descrizione: formData.descrizione || null,
          imponibile: n(formData.imponibile),
          iva_pct: n(formData.iva_pct),
          note: formData.note || null,
        },
        quote_agenti: formData.quote_agenti.map(q => ({
          agente_id: q.agente_id,
          importo_girato: n(q.importo_girato),
        })),
        quote_soci: Object.fromEntries(
          SOCI.map(s => [s, n(formData.quote_soci[s])])
        ),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const stepLabels = { 1: 'Dati fattura', 2: 'Agenti', 3: 'Quote soci' }

  return (
    <div>
      <StepIndicator currentStep={step} />

      {/* Mini barra di contesto */}
      {imponibile > 0 && (
        <div className="flex items-center gap-4 mb-5 px-4 py-2 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
          <span>Imponibile: <strong className="text-slate-900">{formatCurrency(imponibile)}</strong></span>
          {totaleGirato > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <span>Agenti: <strong className="text-slate-900">{formatCurrency(totaleGirato)}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Base soci: <strong className="text-blue-700">{formatCurrency(baseSoci)}</strong></span>
            </>
          )}
        </div>
      )}

      {/* Contenuto step */}
      <div className="min-h-[280px]">
        {step === 1 && (
          <Step1DatiFattura data={formData} onChange={onChange} errors={stepErrors} />
        )}
        {step === 2 && (
          <Step2QuoteAgenti
            data={formData}
            agentiList={agentiList}
            imponibile={imponibile}
            onChange={onChange}
            errors={stepErrors}
          />
        )}
        {step === 3 && (
          <Step4QuoteSoci
            data={formData}
            imponibile={imponibile}
            totaleGiratoAgenti={totaleGirato}
            onChange={onChange}
            errors={stepErrors}
          />
        )}
      </div>

      {/* Navigazione */}
      <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={step === 1 ? onClose : goPrev}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {step === 1 ? 'Annulla' : '← Indietro'}
        </button>

        <span className="text-xs text-slate-400">
          {stepLabels[step]}
        </span>

        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Avanti →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Salvataggio…' : '✓ Salva fattura'}
          </button>
        )}
      </div>
    </div>
  )
}
