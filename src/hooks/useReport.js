import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useReport() {
  const [fattureEntrata, setFattureEntrata] = useState([])
  const [spese, setSpese]                   = useState([])
  const [fattureSoci, setFattureSoci]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from('fatture_entrata')
        .select(`
          *,
          fatture_entrata_quote_soci(*),
          fatture_entrata_trattenuto_soci(*),
          fatture_entrata_quote_agenti(*, agenti(nome, cognome))
        `)
        .order('data', { ascending: false }),
      supabase
        .from('spese')
        .select('*, spese_quote_soci(*)')
        .order('data_documento', { ascending: false }),
      supabase
        .from('fatture_soci')
        .select('*')
        .order('data', { ascending: false }),
    ])
    const err = [r1.error?.message, r2.error?.message, r3.error?.message].filter(Boolean).join('; ')
    if (err) {
      setError(err)
    } else {
      setFattureEntrata(r1.data ?? [])
      setSpese(r2.data ?? [])
      setFattureSoci(r3.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { fattureEntrata, spese, fattureSoci, loading, error, refresh: fetchAll }
}
