import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useFattureSoci() {
  const [fatture, setFatture] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchFatture = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('fatture_soci')
      .select('*')
      .order('data', { ascending: false })
    if (error) setError(error.message)
    else setFatture(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFatture() }, [fetchFatture])

  async function createFattura(payload) {
    const { data: created, error } = await supabase
      .from('fatture_soci')
      .insert(payload)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    await fetchFatture()
    return created.id
  }

  async function updateFattura(id, payload) {
    const { error } = await supabase
      .from('fatture_soci')
      .update(payload)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetchFatture()
  }

  async function deleteFattura(id) {
    const { error } = await supabase
      .from('fatture_soci')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    setFatture(prev => prev.filter(f => f.id !== id))
  }

  return { fatture, loading, error, refresh: fetchFatture, createFattura, updateFattura, deleteFattura }
}
