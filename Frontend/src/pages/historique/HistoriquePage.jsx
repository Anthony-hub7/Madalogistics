import { lazy, Suspense, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const HistoriqueDashboardTab = lazy(() => import('./HistoriqueDashboardTab'))
const FacturesTab = lazy(() => import('./FacturesTab'))
const SacsTab = lazy(() => import('./SacsTab'))

const ONGLETS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'space_dashboard' },
  { key: 'factures', label: 'Factures', icon: 'receipt_long' },
  { key: 'sacs', label: 'Sacs', icon: 'inventory_2' },
]

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
      <span className="ml-3 font-body text-sm text-on-surface-variant">Chargement...</span>
    </div>
  )
}

export default function HistoriquePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get('onglet')
  const onglet = ONGLETS.some(o => o.key === param) ? param : 'dashboard'

  useEffect(() => {
    document.title = 'Historique — MadaLogistix'
  }, [])

  const changerOnglet = (key) => {
    const next = new URLSearchParams(searchParams)
    next.set('onglet', key)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline-variant/60 pb-5">
        <div className="flex items-center gap-3">
          <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">HISTORIQUE</span>
        </div>
        <h2 className="font-display text-3xl font-bold text-on-surface uppercase tracking-tight mt-1">Historique &amp; facturation</h2>
        <p className="font-body text-sm text-on-surface-variant">
          Tableau de bord, factures et sacs livrés — tout le passé de vos opérations au même endroit.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-outline-variant" role="tablist" aria-label="Sections de l'historique">
        {ONGLETS.map((o) => {
          const actif = onglet === o.key
          return (
            <button
              key={o.key}
              role="tab"
              aria-selected={actif}
              onClick={() => changerOnglet(o.key)}
              className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 font-display text-sm uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                actif
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{o.icon}</span>
              {o.label}
            </button>
          )
        })}
      </div>

      <Suspense fallback={<TabLoader />}>
        {onglet === 'dashboard' && <HistoriqueDashboardTab />}
        {onglet === 'factures' && <FacturesTab />}
        {onglet === 'sacs' && <SacsTab />}
      </Suspense>
    </div>
  )
}
