import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { SettingsProvider } from './lib/SettingsContext'
import { ToastProvider } from './components/ui/Toast'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FattureEntrata from './pages/FattureEntrata'
import Spese from './pages/Spese'
import FattureSoci from './pages/FattureSoci'
import Agenti from './pages/Agenti'
import Report from './pages/Report'
import Fiscale from './pages/Fiscale'
import Impostazioni from './pages/Impostazioni'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="fatture-entrata" element={<FattureEntrata />} />
              <Route path="spese" element={<Spese />} />
              <Route path="fatture-soci" element={<FattureSoci />} />
              <Route path="agenti" element={<Agenti />} />
              <Route path="report" element={<Report />} />
              <Route path="fiscale" element={<Fiscale />} />
              <Route path="impostazioni" element={<Impostazioni />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
