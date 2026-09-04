import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ThemeScope from '../components/ThemeScope'

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/logistics/dashboard' },
  { key: 'commandes', label: 'Commandes', icon: 'calendar_today', path: '/logistics/commandes' },
  { key: 'chauffeurs_rattaches', label: 'Chauffeurs', icon: 'badge', path: '/logistics/chauffeurs_rattaches' },
  { key: 'optimisation', label: 'Optimisation', icon: 'auto_graph', path: '/logistics/optimisation' },
  { key: 'flotte', label: 'Flotte', icon: 'local_shipping', path: '/logistics/flotte' },
  { key: 'carte_optimisation', label: 'Carte', icon: 'map', path: '/logistics/carte_optimisation' },
]

export default function GestionnaireLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const activeKey = location.pathname.split('/').pop() || 'dashboard'

  const userInfo = user ? {
    name: user.name || 'Utilisateur',
    title: user.role || 'Gestionnaire',
    initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  } : { name: 'Utilisateur', title: 'Gestionnaire', initials: 'U' }

  return (
    <ThemeScope theme="light" className="flex min-h-screen bg-page text-on-surface">
      <Sidebar
        navItems={navItems}
        activePage={activeKey}
        onNavigate={(key) => {
          const item = navItems.find(i => i.key === key)
          if (item) navigate(item.path)
        }}
        branding={{ subtitle: 'Fleet Management' }}
      />
      <Header searchPlaceholder="Rechercher une livraison, un véhicule..." user={userInfo} onLogout={async () => { await logout(); navigate('/') }} />
      <main className="mt-16 min-h-screen w-full overflow-y-auto pb-20 lg:ml-[280px] lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </ThemeScope>
  )
}
