import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeScope from '../components/ThemeScope'

const navItems = [
  { key: 'missions_proposees', label: 'Proposées', icon: 'inbox_customize', path: '/driver/missions_proposees' },
  { key: 'missions', label: 'Mes missions', icon: 'route', path: '/driver/missions' },
  { key: 'carte_missions', label: 'Ma tournée', icon: 'map', path: '/driver/carte_missions' },
]

export default function ChauffeurLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeKey = location.pathname.split('/').pop() || 'missions_proposees'

  return (
    <ThemeScope theme="light" className="min-h-screen bg-page text-on-surface">
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between border-b border-outline-variant px-margin-mobile h-16">
        <Logo size={32} showText={true} branding={{ subtitle: 'Chauffeur' }} />
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-on-secondary-container">person</span>
          </div>
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
    </ThemeScope>
  )
}
