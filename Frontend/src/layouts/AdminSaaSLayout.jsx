import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ThemeScope from '../components/ThemeScope'

const navItems = [
  { key: 'dashboard', label: 'Vue d\'ensemble', icon: 'space_dashboard', path: '/admin/dashboard' },
  { key: 'agences_demandes', label: 'Demandes agences', icon: 'pending_actions', path: '/admin/agences_demandes' },
  { key: 'agences_liste', label: 'Agences actives', icon: 'apartment', path: '/admin/agences_liste' },
  { key: 'freelances_demandes', label: 'Demandes freelances', icon: 'badge', path: '/admin/freelances_demandes' },
  { key: 'freelances_liste', label: 'Freelances actifs', icon: 'hail', path: '/admin/freelances_liste' },
]

export default function AdminSaaSLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const activeKey = (() => {
    const segments = location.pathname.split('/')
    const last = segments.pop() || segments.pop() || ''
    const knownKeys = navItems.map(i => i.key)
    if (knownKeys.includes(last)) return last
    if (last === 'agence_detail' || (segments.includes('admin') && last !== 'admin')) {
      return 'agences_demandes'
    }
    if (last === 'freelance_detail') return 'freelances_demandes'
    return 'dashboard'
  })()

  const userInfo = user ? {
    name: user.name || 'Utilisateur',
    title: user.role || 'Administrateur',
    initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  } : { name: 'Utilisateur', title: 'Administrateur', initials: 'U' }

  return (
    <ThemeScope theme="light" className="flex min-h-screen text-on-surface" style={{ backgroundColor: '#F7F7F8' }}>
      <Sidebar
        navItems={navItems}
        activePage={activeKey}
        onNavigate={(key) => {
          const item = navItems.find(i => i.key === key)
          if (item) navigate(item.path)
        }}
        branding={{ subtitle: 'Admin Plateforme' }}
      />
      <Header searchPlaceholder="Rechercher agence, chauffeur..." user={userInfo} onLogout={async () => { await logout(); navigate('/') }} />
      <main className="mt-16 min-h-screen w-full overflow-y-auto pb-20 lg:ml-[280px] lg:pb-0" style={{ backgroundColor: '#F7F7F8' }}>
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </ThemeScope>
  )
}
