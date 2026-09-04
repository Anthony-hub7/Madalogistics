import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ThemeScope from '../components/ThemeScope'

const navItems = [
  { key: 'nouvelle_demande', label: 'Nouvelle expédition', icon: 'add_box', path: '/client/nouvelle_demande' },
  { key: 'mes_commandes', label: 'Mes expéditions', icon: 'local_shipping', path: '/client/mes_commandes' },
]

export default function ClientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const activeKey = location.pathname.split('/').pop() || 'nouvelle_demande'

  const userInfo = user ? {
    name: user.name || 'Utilisateur',
    title: user.role || 'Client',
    initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  } : { name: 'Utilisateur', title: 'Client', initials: 'U' }

  return (
    <ThemeScope theme="light" className="flex min-h-screen bg-page text-on-surface">
      <Sidebar
        navItems={navItems}
        activePage={activeKey}
        onNavigate={(key) => {
          const item = navItems.find(i => i.key === key)
          if (item) navigate(item.path)
        }}
        branding={{ subtitle: 'Client Space' }}
      />
      <Header searchPlaceholder="Rechercher une expédition..." user={userInfo} onLogout={async () => { await logout(); navigate('/') }} />
      <main className="mt-16 min-h-screen w-full bg-page pb-20 lg:ml-[280px] lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </ThemeScope>
  )
}
