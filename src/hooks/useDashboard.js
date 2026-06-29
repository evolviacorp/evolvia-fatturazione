import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  const [fattureEntrata,     setFattureEntrata]     = useState([])
  const [spese,              setSpese]              = useState([])
  const [fattureSoci,        setFattureSoci]        = useState([])
  const [versamentiIva,      setVersamentiIva]      = useState([])
  const [versamentiRitenute, setVersamentiRitenute] = useState([])
  const [loading, setLoading]                       = useState(true)
  const [error, setError]                           = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('fatture_entrata').select('*, fatture_entrata_quote_soci(*)'),
      supabase.from('spese').select('*, spese_quote_soci(*)'),
      supabase.from('fatture_soci').select('*'),
      supabase.from('versamenti_iva').select('*'),
      supabase.from('versamenti_ritenute').select('*'),
    ])
    const err = [r1, r2, r3, r4, r5].map(r => r.error?.message).filter(Boolean).join('; ')
    if (err) {
      setError(err)
    } else {
      setFattureEntrata(r1.data     ?? [])
      setSpese(r2.data              ?? [])
      setFattureSoci(r3.data        ?? [])
      setVersamentiIva(r4.data      ?? [])
      setVersamentiRitenute(r5.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { fattureEntrata, spese, fattureSoci, versamentiIva, versamentiRitenute, loading, error, refresh: fetchAll }
}
