import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { chauffeursService } from '../services/chauffeursService'
import Logo from '../components/Logo'
import ThemeScope from '../components/ThemeScope'
import ProfilModal from '../components/ProfilModal'
import ParametresModal from '../components/ParametresModal'

const allNavItems = [
  { key: 'missions_proposees', label: 'Proposées', icon: 'inbox_customize', path: '/driver/missions_proposees' },
  { key: 'missions', label: 'Mes missions', icon: 'route', path: '/driver/missions' },
  { key: 'carte_missions', label: 'Ma tournée', icon: 'map', path: '/driver/carte_missions' },
]

export default function ChauffeurLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [typeChauffeur, setTypeChauffeur] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profilOuvert, setProfilOuvert] = useState(false)
  const [params, setParams] = useState(null)
  const dropdownRef = useRef(null)

  const activeKey = location.pathname.split('/').pop() || 'missions'

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Recuperer le type de chauffeur au montage
  useEffect(() => {
    chauffeursService.monStatutDossier()
      .then(data => {
        setTypeChauffeur(data?.typeChauffeur || null)
      })
      .catch(() => {
        // Fallback sur user du contexte
        setTypeChauffeur(user?.typeChauffeur || null)
      })
  }, [user])

  // Gate : si chauffeur non active, rediriger vers en_attente
  useEffect(() => {
    if (user?.statutDossier && user.statutDossier !== 'VALIDEE'
        && location.pathname !== '/driver/en_attente') {
      navigate('/driver/en_attente', { replace: true })
    }
  }, [user, location.pathname, navigate])

  // Si rattaché, masquer proposées et rediriger si sur cette page
  useEffect(() => {
    if (typeChauffeur === 'RATTACHE' && activeKey === 'missions_proposees') {
      navigate('/driver/missions', { replace: true })
    }
  }, [typeChauffeur, activeKey, navigate])

  // Si on est sur la page en_attente, pas de layout avec nav
  if (location.pathname === '/driver/en_attente') {
    return <Outlet />
  }

  // Filtrer les nav items selon le type de chauffeur
  const navItems = typeChauffeur === 'RATTACHE'
    ? allNavItems.filter(item => item.key !== 'missions_proposees')
    : allNavItems

  return (
    <ThemeScope theme="light" className="min-h-screen bg-page text-on-surface">
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between border-b border-outline-variant px-margin-mobile h-16">
        <Logo size={32} showText={true} branding={{ subtitle: 'Chauffeur' }} />
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant transition-transform hover:scale-105"
          >
            <span className="material-symbols-outlined text-on-secondary-container">person</span>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded border-2 border-outline-variant bg-surface shadow-xl">
                <div className="border-b border-outline-variant bg-surface-light px-4 py-3">
                  <p className="font-display text-sm font-bold text-on-surface">{user?.name || 'Chauffeur'}</p>
                  <p className="font-body text-xs text-on-surface-variant">{user?.role || 'CHAUFFEUR'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); setProfilOuvert(true) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-light"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    Mon profil
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); setParams({ tab: 'securite' }) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-light"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">settings</span>
                    Paramètres
                  </button>
                </div>
                <div className="border-t border-outline-variant py-1">
                  <button
                    onClick={async () => { await logout(); navigate('/') }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-margin-mobile py-6 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-surface border-t border-outline-variant shadow-lg flex justify-around items-center px-2">
        {navItems.map((item) => {
          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center px-6 py-2 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <ProfilModal
        open={profilOuvert}
        onClose={() => setProfilOuvert(false)}
        onOpenParametres={(tab) => { setProfilOuvert(false); setParams({ tab }) }}
      />
      <ParametresModal
        open={Boolean(params)}
        initialTab={params?.tab}
        onClose={() => setParams(null)}
      />
    </ThemeScope>
  )
}
