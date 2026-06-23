import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useImpostazioni() {
  const [categorie,  setCategorie]  = useState([])
  const [banche,     setBanche]     = useState([])
  const [aliquote,   setAliquote]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('categorie_spese').select('*').order('ordine').order('voce'),
      supabase.from('banche').select('*').order('ordine').order('nome'),
      supabase.from('aliquote_iva').select('*').order('percentuale'),
    ])
    const err = [r1, r2, r3].map(r => r.error?.message).filter(Boolean).join('; ')
    if (err) setError(err)
    else {
      setCategorie(r1.data  ?? [])
      setBanche(r2.data     ?? [])
      setAliquote(r3.data   ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Categorie ─────────────────────────────────────────────

  async function addCategoria({ gruppo, voce }) {
    const { error } = await supabase.from('categorie_spese').insert({ gruppo: gruppo.trim(), voce: voce.trim() })
    if (error) throw new Error(error.message)
    await fetchAll()
  }

  async function deleteCategoria(id) {
    const { error } = await supabase.from('categorie_spese').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCategorie(prev => prev.filter(c => c.id !== id))
  }

  // ── Banche ────────────────────────────────────────────────

  async function addBanca(nome) {
    const { error } = await supabase.from('banche').insert({ nome: nome.trim() })
    if (error) throw new Error(error.message)
    await fetchAll()
  }

  async function updateBanca(id, nome) {
    const { error } = await supabase.from('banche').update({ nome: nome.trim() }).eq('id', id)
    if (error) throw new Error(error.message)
    setBanche(prev => prev.map(b => b.id === id ? { ...b, nome: nome.trim() } : b))
  }

  async function deleteBanca(id) {
    const { error } = await supabase.from('banche').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setBanche(prev => prev.filter(b => b.id !== id))
  }

  // ── Aliquote IVA ──────────────────────────────────────────

  async function addAliquota({ percentuale, descrizione }) {
    const { error } = await supabase.from('aliquote_iva').insert({ percentuale: parseFloat(percentuale), descrizione: descrizione?.trim() || null })
    if (error) throw new Error(error.message)
    await fetchAll()
  }

  async function deleteAliquota(id) {
    const { error } = await supabase.from('aliquote_iva').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setAliquote(prev => prev.filter(a => a.id !== id))
  }

  return {
    categorie, banche, aliquote,
    loading, error, refresh: fetchAll,
    addCategoria, deleteCategoria,
    addBanca, updateBanca, deleteBanca,
    addAliquota, deleteAliquota,
  }
}
