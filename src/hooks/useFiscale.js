import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useFiscale() {
  const [fattureEntrata,     setFattureEntrata]     = useState([])
  const [spese,              setSpese]              = useState([])
  const [fattureSoci,        setFattureSoci]        = useState([])
  const [versamentiIva,      setVersamentiIva]      = useState([])
  const [versamentiRitenute, setVersamentiRitenute] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('fatture_entrata').select('id, data, imponibile, iva_pct'),
      supabase.from('spese').select('id, data_documento, iva_importo, ritenuta_acconto'),
      supabase.from('fatture_soci').select('id, data, socio, iva_importo, fatturato_da_sergio'),
      supabase.from('versamenti_iva').select('*').order('data_versamento', { ascending: false }),
      supabase.from('versamenti_ritenute').select('*').order('data_versamento', { ascending: false }),
    ])
    const err = [r1, r2, r3, r4, r5].map(r => r.error?.message).filter(Boolean).join('; ')
    if (err) {
      setError(err)
    } else {
      setFattureEntrata(r1.data     ?? [])
      setSpese(r2.data             ?? [])
      setFattureSoci(r3.data       ?? [])
      setVersamentiIva(r4.data     ?? [])
      setVersamentiRitenute(r5.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createVersamentiIva(payload) {
    const { error } = await supabase.from('versamenti_iva').insert(payload)
    if (error) throw new Error(error.message)
    await fetchAll()
  }

  async function deleteVersamentiIva(id) {
    const { error } = await supabase.from('versamenti_iva').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setVersamentiIva(prev => prev.filter(v => v.id !== id))
  }

  async function createVersamentiRitenute(payload) {
    const { error } = await supabase.from('versamenti_ritenute').insert(payload)
    if (error) throw new Error(error.message)
    await fetchAll()
  }

  async function deleteVersamentiRitenute(id) {
    const { error } = await supabase.from('versamenti_ritenute').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setVersamentiRitenute(prev => prev.filter(v => v.id !== id))
  }

  return {
    fattureEntrata, spese, fattureSoci,
    versamentiIva, versamentiRitenute,
    loading, error, refresh: fetchAll,
    createVersamentiIva, deleteVersamentiIva,
    createVersamentiRitenute, deleteVersamentiRitenute,
  }
}
