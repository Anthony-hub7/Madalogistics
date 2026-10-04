import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'
import { flotteService } from '../../services/flotteService'
import { sacsService } from '../../services/sacsService'

const STATUT_LABELS = {
  CREEE: 'Créée',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
  EN_ATTENTE_GROUPAGE: 'En attente',
  GROUPEE: 'Groupée',
  EN_TRANSIT: 'En transit',
  LIVREE: 'Livrée',
  INCIDENT: 'Incident',
}

const STATUT_COLORS = {
  CREEE: 'bg-outline-variant/30 text-on-surface-variant',
  VALIDEE: 'bg-primary/10 text-primary',
  REFUSEE: 'bg-error/10 text-error',
  ANNULEE: 'bg-outline-variant/30 text-on-surface-variant',
  EN_ATTENTE_GROUPAGE: 'bg-tertiary/10 text-tertiary',
  GROUPEE: 'bg-secondary/10 text-secondary',
  EN_TRANSIT: 'bg-primary/10 text-primary',
  LIVREE: 'bg-green-100 text-green-700',
  INCIDENT: 'bg-error/10 text-error',
}

export default function DashboardGestionnairePage() {
  const navigate = useNavigate()

  const [vehicules, setVehicules] = useState([])
  const [enAttente, setEnAttente] = useState([])
  const [livrees, setLivrees] = useState([])
  const [sacs, setSacs] = useState([])
  const [dernieresDemandes, setDernieresDemandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [vRes, aRes, lRes, sRes, dRes] = await Promise.allSettled([
        flotteService.getAll(),
        demandesService.getAll('CREEE'),
        demandesService.getAll('LIVREE'),
        sacsService.getAll(),
        demandesService.getAll(),
      ])

      if (cancelled) return

      if (vRes.status === 'fulfilled') setVehicules(vRes.value || [])
      if (aRes.status === 'fulfilled') setEnAttente(aRes.value || [])
      if (lRes.status === 'fulfilled') setLivrees(lRes.value || [])
      if (sRes.status === 'fulfilled') setSacs(sRes.value || [])
      if (dRes.status === 'fulfilled') {
        const sorted = [...(dRes.value || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
        setDernieresDemandes(sorted.slice(0, 5))
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const nbDispo = vehicules.filter(v => v.statut === 'DISPONIBLE').length
  const tauxRemplissage =
    sacs.length > 0
      ? Math.round(sacs.reduce((sum, s) => sum + (s.tauxRemplissage || 0), 0) / sacs.length)
      : null

  const stats = [
    {
      label: 'Véhicules disponibles',
      value: loading ? '…' : `${nbDispo} / ${vehicules.length}`,
      icon: 'local_shipping',
      iconBg: 'bg-primary/10 text-primary border border-primary/20',
    },
    {
      label: 'Commandes en attente',
      value: loading ? '…' : enAttente.length,
      icon: 'pending_actions',
      iconBg: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
    },
    {
      label: 'Commandes livrées',
      value: loading ? '…' : livrees.length,
      icon: 'check_circle',
      iconBg: 'bg-green-50 text-green-600 border border-green-200',
    },
    {
      label: 'Taux remplissage moyen',
      value: loading ? '…' : tauxRemplissage !== null ? `${tauxRemplissage}%` : '—',
      icon: 'inventory_2',
      iconBg: 'bg-surface-light text-on-surface border border-outline-variant',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">POSTE DE GESTION</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-on-surface uppercase tracking-tight mt-1">Tableau de bord opérationnel</h2>
          <p className="font-body text-sm text-on-surface-variant">
            Vue d'ensemble de vos opérations logistiques.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="waybill-card flex flex-col justify-between p-5 border-l-4 border-l-primary relative overflow-hidden transition-all duration-150 hover:border-primary">
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded p-2 ${stat.iconBg}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant font-semibold">{stat.label}</p>
              <p className="font-display text-2xl font-bold mt-1 text-on-surface tabular-nums">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="waybill-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Dernières commandes</h3>
          </div>
          <button
            onClick={() => navigate('/logistics/commandes')}
            className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline"
          >
            Voir tout
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">ID</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Destination</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">
                    Chargement…
                  </td>
                </tr>
              ) : dernieresDemandes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">
                    Aucune commande pour le moment.
                  </td>
                </tr>
              ) : (
                dernieresDemandes.map((d) => (
                  <tr key={d.demandeId} className="transition-colors hover:bg-surface-light/70">
                    <td className="px-6 py-4 font-mono font-bold text-sm text-on-surface">
                      {String(d.demandeId).slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">
                      {d.adresseLivraison || d.nomDestinataire || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUT_COLORS[d.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {STATUT_LABELS[d.statut] || d.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
