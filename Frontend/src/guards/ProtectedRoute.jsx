import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLE_TO_PATH = {
  ADMIN_SAAS: 'admin',
  GESTIONNAIRE: 'logistics',
  CLIENT_FINAL: 'client',
  CHAUFFEUR: 'driver',
  DIRECTION: 'direction',
}

function getRolePath(role) {
  return ROLE_TO_PATH[role] || role
}

export function ProtectedRoute({ allowedRoles, children }) {
  const { user, isTokenExpired } = useAuth()

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (isTokenExpired()) {
    return <Navigate to="/" replace />
  }

  const rolePath = getRolePath(user.role)

  if (allowedRoles && !allowedRoles.includes(rolePath)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8]">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-[#E8433D]">block</span>
          <h2 className="font-display text-xl font-bold uppercase tracking-wider text-[#1A1A1E]">
            Accès refusé
          </h2>
          <p className="font-body text-sm text-[#64646E]">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded bg-[#E8433D] px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white hover:bg-[#B82823] transition-colors"
          >
            Retour à la connexion
          </a>
        </div>
      </div>
    )
  }

  return children
}
