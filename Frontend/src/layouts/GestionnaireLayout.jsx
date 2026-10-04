import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ThemeScope from '../components/ThemeScope'

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/logistics/dashboard' },
  { key: 'commandes', label: 'Commandes', icon: 'calendar_today', path: '/logistics/commandes' },
  {
    key: 'logistique',
    label: 'Logistique',
    icon: 'local_shipping',
    children: [
      { key: 'chauffeurs_rattaches', label: 'Chauffeurs', icon: 'badge', path: '/logistics/chauffeurs_rattaches' },
      { key: 'sacs', label: 'Sacs', icon: 'inventory_2', path: '/logistics/sacs' },
      { key: 'flotte', label: 'Véhicules', icon: 'directions_car', path: '/logistics/flotte' },
      { key: 'tournees', label: 'Tournées', icon: 'route', path: '/logistics/tournees' },
    ],
  },
  { key: 'optimisation', label: 'Optimisation', icon: 'auto_graph', path: '/logistics/optimisation' },
  { key: 'simulation', label: 'Simulation', icon: 'science', path: '/logistics/simulation' },
  { key: 'carte_optimisation', label: 'Carte', icon: 'map', path: '/logistics/carte_optimisation' },
  { key: 'historique', label: 'Historique', icon: 'history', path: '/logistics/historique' },
]

// Aplatit les groupes pour résoudre une clé (parent ou enfant) vers son path
const flatItems = navItems.flatMap(item => (item.children ? item.children : [item]))

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
          const item = flatItems.find(i => i.key === key)
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
