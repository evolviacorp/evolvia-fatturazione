import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIE_SPESE } from '../utils/format'

export function useCategorieSpese() {
  const [extra, setExtra] = useState([])

  useEffect(() => {
    supabase.from('categorie_spese').select('gruppo, voce').order('ordine').order('voce')
      .then(({ data }) => { if (data) setExtra(data) })
  }, [])

  return useMemo(() => {
    const merged = CATEGORIE_SPESE.map(g => ({ gruppo: g.gruppo, voci: [...g.voci] }))

    for (const item of extra) {
      const existing = merged.find(g => g.gruppo === item.gruppo)
      if (existing) {
        if (!existing.voci.includes(item.voce)) existing.voci.push(item.voce)
      } else {
        merged.push({ gruppo: item.gruppo, voci: [item.voce] })
      }
    }

    return merged
  }, [extra])
}
