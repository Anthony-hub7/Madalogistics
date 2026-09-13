import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeScope from '../components/ThemeScope'

const clientMenuItems = [
  { num: '01', key: 'mes_commandes', label: 'Mes expéditions', path: '/client/mes_commandes' },
  { num: '02', key: 'nouvelle_demande', label: 'Nouvelle expédition', path: '/client/nouvelle_demande' },
  { num: '03', key: 'historique', label: 'Historique', path: '/client/historique' },
  { num: '04', key: 'support', label: 'Support', path: '/client/support' },
  { num: '05', key: 'parametres', label: 'Paramètres', path: '/client/parametres' },
]

export default function ClientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const currentPathSegment = location.pathname.split('/').pop() || 'mes_commandes'
  const activeKey = currentPathSegment === 'client' ? 'mes_commandes' : currentPathSegment

  const clientName = user?.name ? user.name.toUpperCase() : 'ANTHONY — CLIENT_FINAL'

  return (
    <ThemeScope theme="light" className="min-h-screen bg-[#F7F7F8] text-[#1A1A1E]">
      <div className="max-w-[1180px] mx-auto px-6 sm:px-8 pt-9 pb-24">
        
        {/* En-tête façon registre / en-tête de bordereau administratif */}
        <header className="flex justify-between items-end border-b-2 border-[#1A1A1E] pb-3.5 mb-1.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E8433D] rounded flex items-center justify-center font-display font-bold text-[15px] text-white select-none">
              M
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight text-[#1A1A1E]">
                MadaLogistix
              </div>
              <div className="font-body text-[10px] text-[#8A8A92] uppercase tracking-[0.5px] mt-0.5">
                ESPACE CLIENT
              </div>
            </div>
          </div>

          <div className="text-right text-[11px] text-[#8A8A92] leading-tight">
            COMPTE<br />
            <span className="font-mono text-xs text-[#1A1A1E] font-bold">
              {clientName}
            </span>
          </div>
        </header>

        {/* MENU façon table des matières / registre numéroté */}
        <nav className="flex flex-wrap items-center border-b border-[#ECECEC] mb-8 overflow-x-auto">
          {clientMenuItems.map((item) => {
            const isActive = activeKey === item.key || (activeKey === 'detail_commande' && item.key === 'mes_commandes')
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex items-baseline gap-2 py-4 pr-7 mr-4 cursor-pointer text-left transition-colors whitespace-nowrap bg-transparent border-0"
              >
                <span className={`font-mono font-bold text-xs ${isActive ? 'text-[#E8433D]' : 'text-[#8A8A92]'}`}>
                  {item.num}
                </span>
                <span
                  className={`font-display font-semibold text-[14.5px] transition-all tracking-[0.2px] ${
                    isActive
                      ? 'text-[#1A1A1E] border-b border-[#E8433D] pb-[2px]'
                      : 'text-[#8A8A92] hover:text-[#1A1A1E] border-b border-transparent pb-[2px]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}

          <div className="ml-auto py-4">
            <button
              onClick={async () => {
                await logout()
                navigate('/')
              }}
              className="font-display text-xs font-semibold text-[#8A8A92] hover:text-[#E8433D] uppercase tracking-wider transition-colors"
              title="Quitter la session"
            >
              [ Déconnexion ]
            </button>
          </div>
        </nav>

        {/* Contenu principal de la page sélectionnée */}
        <main className="w-full">
          <Outlet />
        </main>

        {/* Pied de page registre */}
        <footer className="mt-14 pt-4 border-t border-[#ECECEC] flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-[#8A8A92] font-mono">
          <div>MADALOGISTIX — CORRIDOR RN7</div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/client/support')}
              className="text-[#8A8A92] hover:text-[#1A1A1E] transition-colors"
            >
              Support
            </button>
            <button
              onClick={() => navigate('/client/parametres')}
              className="text-[#8A8A92] hover:text-[#1A1A1E] transition-colors"
            >
              Paramètres
            </button>
          </div>
        </footer>

      </div>
    </ThemeScope>
  )
}
