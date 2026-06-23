import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export function formatCurrency(value) {
  if (value == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value, decimals = 2) {
  if (value == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'dd/MM/yyyy', { locale: it })
  } catch {
    return dateStr
  }
}

export function formatDateLong(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, "d MMMM yyyy", { locale: it })
  } catch {
    return dateStr
  }
}

export function toInputDate(dateStr) {
  if (!dateStr) return ''
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export const SOCI = ['riccardo', 'mattia', 'sergio']

export const SOCIO_LABELS = {
  riccardo: 'Riccardo',
  mattia: 'Mattia',
  sergio: 'Sergio',
}

export const SOCIO_COLORS = {
  riccardo: '#3b82f6',
  mattia: '#10b981',
  sergio: '#f59e0b',
}

export const CATEGORIE_SPESE = [
  {
    gruppo: 'Compensi soci & collaboratori',
    voci: ['Compenso socio', 'Commissione agente/rete', 'Collaborazione occasionale', 'Stipendio dipendenti'],
  },
  {
    gruppo: 'Costi operativi fissi',
    voci: ['Affitto ufficio', 'Leasing auto', 'Telefonia & connettività', 'Software & abbonamenti', 'Banca & commissioni'],
  },
  {
    gruppo: 'Servizi professionali',
    voci: ['Commercialista / Consulenza fiscale', 'Consulenza legale', 'Marketing & pubblicità'],
  },
  {
    gruppo: 'Costi variabili',
    voci: ['Carburante & trasferte', 'Cene & rappresentanza', 'Materiale ufficio', 'Formazione'],
  },
  {
    gruppo: 'Fiscale',
    voci: ['F24 / IVA', 'Ritenute d\'acconto', 'INPS / contributi', 'Altre imposte'],
  },
  {
    gruppo: 'Altro',
    voci: ['Altro'],
  },
]
