import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SOCI } from '../utils/format'

export function useSpese() {
  const [spese, setSpese] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSpese = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('spese')
      .select('*, spese_quote_soci(*)')
      .order('data_documento', { ascending: false })
    if (error) setError(error.message)
    else setSpese(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSpese() }, [fetchSpese])

  function _buildQuoteRows(spesaId, importo, ripartizione_tipo, quoteCustom) {
    if (ripartizione_tipo === 'uguale') {
      const q = Math.round(importo / 3 * 100) / 100
      const r = Math.round((importo - q * 3) * 100) / 100
      return [
        { spesa_id: spesaId, socio: 'riccardo', importo: q + r },
        { spesa_id: spesaId, socio: 'mattia',   importo: q },
        { spesa_id: spesaId, socio: 'sergio',   importo: q },
      ]
    }
    return SOCI
      .filter(s => (quoteCustom[s] ?? 0) > 0)
      .map(s => ({ spesa_id: spesaId, socio: s, importo: quoteCustom[s] }))
  }

  async function createSpesa({ spesa, ripartizione_tipo, quoteCustom }) {
    const { data: created, error } = await supabase
      .from('spese')
      .insert(spesa)
      .select('id')
      .single()
    if (error) throw new Error(error.message)

    const rows = _buildQuoteRows(created.id, spesa.importo, ripartizione_tipo, quoteCustom)
    if (rows.length > 0) {
      const { error: e2 } = await supabase.from('spese_quote_soci').insert(rows)
      if (e2) throw new Error(e2.message)
    }

    await fetchSpese()
    return created.id
  }

  async function updateSpesa(id, { spesa, ripartizione_tipo, quoteCustom }) {
    const { error } = await supabase.from('spese').update(spesa).eq('id', id)
    if (error) throw new Error(error.message)

    await supabase.from('spese_quote_soci').delete().eq('spesa_id', id)
    const rows = _buildQuoteRows(id, spesa.importo, ripartizione_tipo, quoteCustom)
    if (rows.length > 0) {
      const { error: e2 } = await supabase.from('spese_quote_soci').insert(rows)
      if (e2) throw new Error(e2.message)
    }

    await fetchSpese()
  }

  async function deleteSpesa(id) {
    const { error } = await supabase.from('spese').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setSpese(prev => prev.filter(s => s.id !== id))
  }

  async function togglePagata(id, current) {
    const { error } = await supabase
      .from('spese')
      .update({ pagata: !current })
      .eq('id', id)
    if (error) throw new Error(error.message)
    setSpese(prev => prev.map(s => s.id === id ? { ...s, pagata: !current } : s))
  }

  return { spese, loading, error, refresh: fetchSpese, createSpesa, updateSpesa, deleteSpesa, togglePagata }
}
