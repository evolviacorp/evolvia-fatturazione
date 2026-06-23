import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAgenti() {
  const [agenti, setAgenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('agenti')
      .select('*')
      .order('cognome', { ascending: true })
    if (error) setError(error.message)
    else setAgenti(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createAgente(values) {
    const { data, error } = await supabase
      .from('agenti')
      .insert(values)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setAgenti(prev => [...prev, data].sort((a, b) => a.cognome.localeCompare(b.cognome)))
    return data
  }

  async function updateAgente(id, values) {
    const { data, error } = await supabase
      .from('agenti')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setAgenti(prev => prev.map(a => (a.id === id ? data : a)))
    return data
  }

  async function deleteAgente(id) {
    const { error } = await supabase.from('agenti').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setAgenti(prev => prev.filter(a => a.id !== id))
  }

  async function toggleAttivo(id, attivo) {
    return updateAgente(id, { attivo: !attivo })
  }

  return { agenti, loading, error, refresh: fetch, createAgente, updateAgente, deleteAgente, toggleAttivo }
}
