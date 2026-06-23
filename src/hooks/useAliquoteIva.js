import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FALLBACK = [
  { percentuale: 0,  descrizione: 'Esente / Escluso IVA' },
  { percentuale: 4,  descrizione: 'IVA agevolata 4%'     },
  { percentuale: 10, descrizione: 'IVA ridotta 10%'      },
  { percentuale: 22, descrizione: 'IVA ordinaria 22%'    },
]

export function useAliquoteIva() {
  const [aliquote, setAliquote] = useState(FALLBACK)

  useEffect(() => {
    supabase.from('aliquote_iva').select('percentuale, descrizione').order('percentuale')
      .then(({ data }) => { if (data?.length) setAliquote(data) })
  }, [])

  return aliquote
}
