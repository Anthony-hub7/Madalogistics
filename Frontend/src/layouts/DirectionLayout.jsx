import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ThemeScope from '../components/ThemeScope'

const navItems = [
  { key: 'equipe', label: 'Équipe', icon: 'groups', path: '/direction/equipe' },
  { key: 'hubs', label: 'Hubs', icon: 'location_on', path: '/direction/hubs' },
  { key: 'carte_hubs', label: 'Carte Hubs', icon: 'map', path: '/direction/carte_hubs' },
  { key: 'decisions', label: 'Décisions', icon: 'insights', path: '/direction/decisions' },
  { key: 'categories', label: 'Catégories', icon: 'label', path: '/direction/categories' },
  { key: 'parametres_tarifaires', label: 'Tarifs', icon: 'payments', path: '/direction/parametres_tarifaires' },
]

export default function DirectionLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const activeKey = location.pathname.split('/').pop() || 'equipe'

  const userInfo = user ? {
    name: user.name || 'Utilisateur',
    title: user.role || 'Direction',
    initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  } : { name: 'Utilisateur', title: 'Direction', initials: 'U' }

  return (
    <ThemeScope theme="light" className="flex min-h-screen bg-page text-on-surface">
      <Sidebar
        navItems={navItems}
        activePage={activeKey}
        onNavigate={(key) => {
          const item = navItems.find(i => i.key === key)
          if (item) navigate(item.path)
        }}
        branding={{ subtitle: 'Direction PME' }}
      />
      <Header searchPlaceholder="Rechercher..." user={userInfo} onLogout={async () => { await logout(); navigate('/') }} />
      <main className="mt-16 min-h-screen w-full overflow-y-auto bg-page pb-20 lg:ml-[280px] lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </ThemeScope>
  )
}
