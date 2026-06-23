import { createContext, useContext, useEffect, useState } from 'react'

const SettingsContext = createContext(null)

function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback }
  catch { return fallback }
}

export function SettingsProvider({ children }) {
  const [annoFiscale, setAnnoFiscaleState] = useState(() =>
    ls('evolvia_anno_fiscale', new Date().getFullYear())
  )
  const [tema, setTemaState] = useState(() =>
    ls('evolvia_tema', 'light')
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
  }, [tema])

  function setAnnoFiscale(anno) {
    localStorage.setItem('evolvia_anno_fiscale', JSON.stringify(anno))
    setAnnoFiscaleState(anno)
  }

  function setTema(t) {
    localStorage.setItem('evolvia_tema', JSON.stringify(t))
    setTemaState(t)
  }

  return (
    <SettingsContext.Provider value={{ annoFiscale, setAnnoFiscale, tema, setTema }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings deve essere usato dentro SettingsProvider')
  return ctx
}
