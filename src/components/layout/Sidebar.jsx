import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/fatture-entrata', label: 'Fatture Entrata', icon: '📥' },
  { to: '/spese', label: 'Spese Societarie', icon: '💸' },
  { to: '/fatture-soci', label: 'Fatture Soci', icon: '🧾' },
  { to: '/agenti', label: 'Agenti', icon: '🤝' },
  { to: '/report',      label: 'Report',      icon: '📈' },
  { to: '/fiscale',     label: 'Fiscale',     icon: '🏛️' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Evolvia</div>
            <div className="text-xs text-slate-400">Fatturazione</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span className="text-base leading-none">🚪</span>
          Esci
        </button>
      </div>
    </aside>
  )
}
