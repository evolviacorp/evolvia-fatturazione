import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBanche() {
  const [banche, setBanche] = useState([])

  useEffect(() => {
    supabase.from('banche').select('nome').order('ordine').order('nome')
      .then(({ data }) => { if (data) setBanche(data.map(b => b.nome)) })
  }, [])

  return banche
}
