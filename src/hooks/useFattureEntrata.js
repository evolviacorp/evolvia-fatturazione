import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SOCI } from '../utils/format'

export function useFattureEntrata() {
  const [fatture, setFatture] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFatture = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('fatture_entrata')
      .select(`
        *,
        fatture_entrata_quote_soci(*),
        fatture_entrata_quote_agenti(*, agenti(nome, cognome)),
        fatture_entrata_trattenuto_soci(*)
      `)
      .order('data', { ascending: false })
    if (error) setError(error.message)
    else setFatture(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFatture() }, [fetchFatture])

  async function _writeChildren(fatturaId, { quote_agenti, trattenuto_soci, quote_soci }) {
    if (quote_agenti.length > 0) {
      const { error } = await supabase
        .from('fatture_entrata_quote_agenti')
        .insert(quote_agenti.map(q => ({ ...q, fattura_id: fatturaId })))
      if (error) throw new Error(error.message)
    }

    const tsRows = SOCI
      .filter(s => (trattenuto_soci[s] ?? 0) > 0)
      .map(s => ({ fattura_id: fatturaId, socio: s, importo: trattenuto_soci[s] }))
    if (tsRows.length > 0) {
      const { error } = await supabase.from('fatture_entrata_trattenuto_soci').insert(tsRows)
      if (error) throw new Error(error.message)
    }

    const qsRows = SOCI
      .filter(s => (quote_soci[s] ?? 0) > 0)
      .map(s => ({ fattura_id: fatturaId, socio: s, importo: quote_soci[s] }))
    if (qsRows.length > 0) {
      const { error } = await supabase.from('fatture_entrata_quote_soci').insert(qsRows)
      if (error) throw new Error(error.message)
    }
  }

  async function createFattura(payload) {
    const { data: created, error } = await supabase
      .from('fatture_entrata')
      .insert(payload.fattura)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    await _writeChildren(created.id, payload)
    await fetchFatture()
    return created.id
  }

  async function updateFattura(id, payload) {
    const { error } = await supabase
      .from('fatture_entrata')
      .update(payload.fattura)
      .eq('id', id)
    if (error) throw new Error(error.message)

    await Promise.all([
      supabase.from('fatture_entrata_quote_agenti').delete().eq('fattura_id', id),
      supabase.from('fatture_entrata_trattenuto_soci').delete().eq('fattura_id', id),
      supabase.from('fatture_entrata_quote_soci').delete().eq('fattura_id', id),
    ])
    await _writeChildren(id, payload)
    await fetchFatture()
  }

  async function deleteFattura(id) {
    const { error } = await supabase.from('fatture_entrata').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setFatture(prev => prev.filter(f => f.id !== id))
  }

  return { fatture, loading, error, refresh: fetchFatture, createFattura, updateFattura, deleteFattura }
}
