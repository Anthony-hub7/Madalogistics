import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { AppStateProvider } from '../context/AppStateContext'
import { ProtectedRoute } from '../guards/ProtectedRoute'
import { ROLE_CONFIG } from './routes'
import LoginPage from '../pages/auth/LoginPage'

const InscriptionClientPage = lazy(() => import('../pages/auth/InscriptionClientPage'))
const AgenceInscriptionFlow = lazy(() => import('../pages/inscription/AgenceInscriptionFlow'))
const ChauffeurInscriptionFlow = lazy(() => import('../pages/inscription/ChauffeurInscriptionFlow'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="font-label-md text-label-md text-on-surface-variant">Chargement...</p>
      </div>
    </div>
  )
}

const ROLE_ROUTES = {
  admin: [
    { path: 'dashboard', element: lazy(() => import('../pages/admin-systeme/AdminDashboardPage')) },
    { path: 'agences_demandes', element: lazy(() => import('../pages/admin-systeme/AgencesDemandesPage')) },
    { path: 'agences_liste', element: lazy(() => import('../pages/admin-systeme/AgencesListePage')) },
    { path: 'agence_detail', element: lazy(() => import('../pages/admin-systeme/AgenceDetailPage')) },
    { path: 'freelances_demandes', element: lazy(() => import('../pages/admin-systeme/FreelancesDemandesPage')) },
    { path: 'freelances_liste', element: lazy(() => import('../pages/admin-systeme/FreelancesListePage')) },
    { path: 'freelance_detail', element: lazy(() => import('../pages/admin-systeme/FreelanceDetailPage')) },
    { path: 'tenants', element: lazy(() => import('../pages/admin/TenantsAdminPage')) },
  ],
  logistics: [
    { path: 'dashboard', element: lazy(() => import('../pages/dashboard/DashboardGestionnairePage')) },
    { path: 'commandes', element: lazy(() => import('../pages/demandes/DemandesListPage')) },
    { path: 'chauffeurs_rattaches', element: lazy(() => import('../pages/dashboard/ChauffeursRattachesPage')) },
    { path: 'chauffeur_detail', element: lazy(() => import('../pages/dashboard/ChauffeurDetailPage')) },
    { path: 'optimisation', element: lazy(() => import('../pages/optimisation/OptimisationPage')) },
    { path: 'flotte', element: lazy(() => import('../pages/flotte/FlottePage')) },
    { path: 'carte_optimisation', element: lazy(() => import('../pages/carte/CarteOptimisationPage')) },
  ],
  client: [
    { path: 'nouvelle_demande', element: lazy(() => import('../pages/demandes/NouvelleDemandePage')) },
    { path: 'mes_commandes', element: lazy(() => import('../pages/demandes/MesCommandesPage')) },
    { path: 'detail_commande', element: lazy(() => import('../pages/demandes/DetailCommandePage')) },
  ],
  driver: [
    { path: 'missions_proposees', element: lazy(() => import('../pages/chauffeur/MissionsProposeesPage')) },
    { path: 'missions', element: lazy(() => import('../pages/chauffeur/MesMissionsPage')) },
    { path: 'detail_livraison', element: lazy(() => import('../pages/chauffeur/DetailLivraisonPage')) },
    { path: 'carte_missions', element: lazy(() => import('../pages/carte/CarteMissionsPage')) },
  ],
  direction: [
    { path: 'equipe', element: lazy(() => import('../pages/dashboard/EquipePage')) },
    { path: 'hubs', element: lazy(() => import('../pages/dashboard/HubsPage')) },
    { path: 'carte_hubs', element: lazy(() => import('../pages/carte/CarteHubsPage')) },
    { path: 'decisions', element: lazy(() => import('../pages/dashboard/DecisionsPage')) },
    { path: 'parametres_tarifaires', element: lazy(() => import('../pages/dashboard/ParametresTarifairesPage')) },
  ],
}

function RoleLayout({ role }) {
  const config = ROLE_CONFIG[role]
  if (!config) return <Navigate to="/" replace />
  const { Layout } = config
  return <Layout />
}

function LoginPageWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginPage />
    </Suspense>
  )
}

function AgenceInscriptionWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AgenceInscriptionFlow />
    </Suspense>
  )
}

function ChauffeurInscriptionWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ChauffeurInscriptionFlow />
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPageWrapper />} />
          <Route path="/inscription/client" element={
            <Suspense fallback={<PageLoader />}>
              <InscriptionClientPage />
            </Suspense>
          } />
          <Route path="/inscription/agence" element={<AgenceInscriptionWrapper />} />
          <Route path="/inscription/chauffeur" element={<ChauffeurInscriptionWrapper />} />

          {Object.entries(ROLE_ROUTES).map(([role, pages]) => (
            <Route
              key={role}
              path={`/${role}`}
              element={
                <ProtectedRoute allowedRoles={[role]}>
                  <AppStateProvider>
                    <RoleLayout role={role} />
                  </AppStateProvider>
                </ProtectedRoute>
              }
            >
              {pages.map(({ path, element: Component }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Component />
                    </Suspense>
                  }
                />
              ))}
              <Route index element={<Navigate to={ROLE_CONFIG[role].defaultPage} replace />} />
            </Route>
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
