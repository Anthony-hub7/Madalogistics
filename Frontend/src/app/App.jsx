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

          {Object.entries(ROLE_CONFIG).map(([role, config]) => (
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
              {Object.entries(config.pages).map(([pageKey, page]) => {
                const PageComponent = page.component
                return (
                  <Route
                    key={pageKey}
                    path={pageKey}
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <PageComponent />
                      </Suspense>
                    }
                  />
                )
              })}
              <Route index element={<Navigate to={config.defaultPage} replace />} />
            </Route>
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
