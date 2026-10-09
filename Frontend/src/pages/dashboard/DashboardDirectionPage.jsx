import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../../components/StatCard'
import { directionService } from '../../services/directionService'

const COMMANDE_LABELS = {
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

const SAC_LABELS = {
  CONSTITUE: 'Constitué',
  AFFECTE: 'Affecté',
  EN_TRANSIT: 'En transit',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
}

const TOURNEE_LABELS = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
}

const VEHICULE_LABELS = {
  DISPONIBLE: 'Disponible',
  AFFECTE: 'Affecté',
  EN_TOURNEE: 'En tournée',
  MAINTENANCE: 'Maintenance',
  HORS_SERVICE: 'Hors service',
}

const DOSSIER_LABELS = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  DESACTIVE: 'Désactivée',
}

const CHIP_COLORS = {
  LIVREE: 'bg-green-100 text-green-700',
  LIVRE: 'bg-green-100 text-green-700',
  TERMINEE: 'bg-green-100 text-green-700',
  VALIDEE: 'bg-primary/10 text-primary',
  DISPONIBLE: 'bg-primary/10 text-primary',
  REFUSEE: 'bg-error/10 text-error',
  ANNULEE: 'bg-outline-variant/30 text-on-surface-variant',
  ANNULE: 'bg-outline-variant/30 text-on-surface-variant',
  EN_TRANSIT: 'bg-primary/10 text-primary',
  EN_COURS: 'bg-tertiary/10 text-tertiary',
  EN_TOURNEE: 'bg-tertiary/10 text-tertiary',
  EN_ATTENTE: 'bg-tertiary/10 text-tertiary',
  GROUPEE: 'bg-secondary/10 text-secondary',
  AFFECTE: 'bg-secondary/10 text-secondary',
  HORS_SERVICE: 'bg-error/10 text-error',
  INCIDENT: 'bg-error/10 text-error',
}

const fmtAr = (n) => (n == null ? '—' : `${Math.round(Number(n)).toLocaleString('fr-FR')} Ar`)
const fmtNum = (n, max = 1) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: max })

function Section({ icon, title, action, children }) {
  return (
    <section className="waybill-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

function StatutsChips({ comptes, labels }) {
  const entrees = Object.entries(comptes || {})
  if (entrees.length === 0) {
    return <p className="font-body text-sm text-on-surface-variant">Aucune donnée.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entrees.map(([statut, nb]) => (
        <span
          key={statut}
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${CHIP_COLORS[statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}
        >
          {labels[statut] || statut}
          <span className="font-mono tabular-nums">{Number(nb)}</span>
        </span>
      ))}
    </div>
  )
}

export default function DashboardDirectionPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await directionService.tableauDeBord()
      setData(res)
    } catch (e) {
      setError(e?.message || 'Impossible de charger le tableau de bord.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activite = data?.activite
  const flotte = data?.flotte
  const tarif = data?.tarification
  const equipe = data?.equipe

  const chartCommandes = Object.entries(activite?.commandesParStatut || {}).map(([statut, nb]) => ({
    statut: COMMANDE_LABELS[statut] || statut,
    nb: Number(nb),
  }))

  const cardsActivite = [
    {
      label: 'Commandes',
      value: loading ? '…' : activite?.nbCommandes ?? 0,
      icon: 'receipt_long',
      sub: 'Demandes de transport',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: 'Sacs groupés',
      value: loading ? '…' : activite?.nbSacs ?? 0,
      icon: 'inventory_2',
      sub: `${activite?.nbColis ?? 0} colis embarqués`,
      iconBg: 'bg-secondary/10 text-secondary',
    },
    {
      label: 'Taux de remplissage moyen',
      value: loading ? '…' : activite?.tauxRemplissageMoyen != null ? `${fmtNum(activite.tauxRemplissageMoyen, 0)} %` : '—',
      icon: 'donut_small',
      sub: 'Moyenne des sacs constitués',
      iconBg: 'bg-surface-light text-on-surface border border-outline-variant',
    },
    {
      label: 'Tournées / distance',
      value: loading ? '…' : `${activite?.nbTournees ?? 0}`,
      icon: 'route',
      sub: `${fmtNum(activite?.kmTotal, 1)} km planifiés`,
      iconBg: 'bg-tertiary/10 text-tertiary',
    },
  ]

  const cardsFlotte = [
    {
      label: 'Véhicules disponibles',
      value: loading ? '…' : `${flotte?.nbDisponibles ?? 0} / ${flotte?.nbVehicules ?? 0}`,
      icon: 'local_shipping',
      sub: 'Flotte de l’agence',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: 'Incidents non lus',
      value: loading ? '…' : flotte?.incidentsNonLus ?? 0,
      icon: 'report',
      sub: 'Pannes / incidents à traiter',
      iconBg: 'bg-error/10 text-error',
    },
  ]

  const cardsTarif = [
    {
      label: 'Grilles tarifaires actives',
      value: loading ? '…' : tarif?.nbGrillesActives ?? 0,
      icon: 'payments',
      sub: 'Prix/kg moyen : ' + (tarif?.prixMoyenKg != null ? `${fmtAr(tarif.prixMoyenKg)} / kg` : '—'),
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: 'CA encaissé',
      value: loading ? '…' : fmtAr(tarif?.caPaye),
      icon: 'account_balance_wallet',
      sub: `${tarif?.nbFacturesPayees ?? 0} factures payées`,
      iconBg: 'bg-green-50 text-green-600 border border-green-200',
    },
    {
      label: 'CA à encaisser',
      value: loading ? '…' : fmtAr(tarif?.caEnAttente),
      icon: 'pending_actions',
      sub: `${tarif?.nbFacturesEmises ?? 0} factures émises`,
      iconBg: 'bg-tertiary/10 text-tertiary',
    },
    {
      label: 'CA annulé',
      value: loading ? '…' : fmtAr(tarif?.caAnnule),
      icon: 'cancel',
      sub: `${tarif?.nbFacturesAnnulees ?? 0} factures annulées`,
      iconBg: 'bg-surface-light text-on-surface border border-outline-variant',
    },
  ]

  const cardsEquipe = [
    {
      label: 'Chauffeurs',
      value: loading ? '…' : equipe?.nbChauffeurs ?? 0,
      icon: 'badge',
      sub: `${equipe?.nbDisponibles ?? 0} disponibles`,
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: 'Dossiers en attente',
      value: loading ? '…' : equipe?.nbDossiersEnAttente ?? 0,
      icon: 'how_to_reg',
      sub: 'À valider par le responsable logistique',
      iconBg: 'bg-tertiary/10 text-tertiary',
    },
    {
      label: 'Répartition des types',
      value: loading ? '…' : Object.entries(equipe?.parType || {}).map(([t, n]) => `${t} ${Number(n)}`).join(' · ') || 0,
      icon: 'groups',
      sub: 'Interne / freelance',
      iconBg: 'bg-surface-light text-on-surface border border-outline-variant',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">DIRECTION</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-on-surface uppercase tracking-tight mt-1">Vue d’ensemble</h2>
          <p className="font-body text-sm text-on-surface-variant">
            Résumé complet de l’activité gérée par le responsable logistique.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded border border-outline-variant bg-surface px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-light disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded border border-error/40 bg-error/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-error">error</span>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-wide text-error">Chargement impossible</p>
              <p className="font-body text-sm text-on-surface-variant">{error}</p>
            </div>
          </div>
          <button
            onClick={load}
            className="rounded bg-error px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 1. Activite */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cardsActivite.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          icon="bar_chart"
          title="Commandes par statut"
          action={
            <button
              onClick={() => navigate('/direction/decisions')}
              className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline"
            >
              Décisions
            </button>
          }
        >
          {loading ? (
            <p className="font-body text-sm text-on-surface-variant">Chargement…</p>
          ) : chartCommandes.length === 0 ? (
            <p className="font-body text-sm text-on-surface-variant">Aucune commande pour le moment.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCommandes} margin={{ top: 5, right: 8, left: -18, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="statut" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="nb" name="Commandes" fill="#e8433d" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section
          icon="inventory_2"
          title="Sacs & tournées"
          action={
            <span className="font-body text-xs text-on-surface-variant">
              {activite?.nbColis ?? 0} colis · {fmtNum(activite?.kmTotal, 1)} km
            </span>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">Sacs</p>
              <StatutsChips comptes={activite?.sacsParStatut} labels={SAC_LABELS} />
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">Tournées</p>
              <StatutsChips comptes={activite?.tourneesParStatut} labels={TOURNEE_LABELS} />
            </div>
          </div>
        </Section>
      </div>

      {/* Dernieres commandes */}
      <Section
        icon="receipt_long"
        title="Dernières commandes"
        action={
          <button
            onClick={() => navigate('/direction/decisions')}
            className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline"
          >
            Voir les décisions
          </button>
        }
      >
        <div className="overflow-x-auto -m-6">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">ID</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Destination</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Statut</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</td>
                </tr>
              ) : (activite?.dernieresCommandes || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Aucune commande.</td>
                </tr>
              ) : (
                activite.dernieresCommandes.map((c) => (
                  <tr key={c.demandeId} className="transition-colors hover:bg-surface-light/70">
                    <td className="px-6 py-4 font-mono font-bold text-sm text-on-surface">{String(c.demandeId).slice(0, 8)}</td>
                    <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">{c.destination || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${CHIP_COLORS[c.statut] || 'bg-outline-variant/30 text-on-surface-variant'}`}>
                        {COMMANDE_LABELS[c.statut] || c.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-on-surface-variant">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 2. Flotte + incidents */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cardsFlotte.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section icon="directions_car" title="État de la flotte">
          <StatutsChips comptes={flotte?.vehiculesParStatut} labels={VEHICULE_LABELS} />
        </Section>

        <Section
          icon="report"
          title="Incidents signalés"
          action={<span className="font-body text-xs text-on-surface-variant">{flotte?.incidentsNonLus ?? 0} non lus</span>}
        >
          {(flotte?.derniersIncidents || []).length === 0 && !loading ? (
            <p className="font-body text-sm text-on-surface-variant">Aucun incident signalé.</p>
          ) : loading ? (
            <p className="font-body text-sm text-on-surface-variant">Chargement…</p>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {flotte.derniersIncidents.map((i) => (
                <li key={i.notificationId} className="flex items-start gap-3 py-3">
                  <span className={`material-symbols-outlined ${i.lu ? 'text-on-surface-variant' : 'text-error'}`}>
                    {i.lu ? 'notifications' : 'report'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold text-on-surface">{i.titre}</p>
                    <p className="font-body text-xs text-on-surface-variant break-words">{i.message}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase ${i.lu ? 'bg-outline-variant/30 text-on-surface-variant' : 'bg-error/10 text-error'}`}>
                    {i.lu ? 'Lu' : 'Non lu'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* 3. Tarification + facturation */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cardsTarif.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          icon="payments"
          title="Tarifs & factures"
          action={
            <button
              onClick={() => navigate('/direction/parametres_tarifaires')}
              className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline"
            >
              Gérer les tarifs
            </button>
          }
        >
          <div className="overflow-x-auto -m-6">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-light/60">
                  <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Facture</th>
                  <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Client</th>
                  <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 bg-surface">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Chargement…</td>
                  </tr>
                ) : (tarif?.facturesEnAttente || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center font-body text-sm text-on-surface-variant">Aucune facture à encaisser.</td>
                  </tr>
                ) : (
                  tarif.facturesEnAttente.map((f) => (
                    <tr key={f.factureId} className="transition-colors hover:bg-surface-light/70">
                      <td className="px-6 py-4 font-mono font-bold text-sm text-on-surface">{String(f.factureId).slice(0, 8)}</td>
                      <td className="px-6 py-4 font-body text-sm text-on-surface">{f.clientNom || f.adresseLivraison || '—'}</td>
                      <td className="px-6 py-4 font-body text-sm font-semibold tabular-nums text-on-surface">{fmtAr(f.montantTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section icon="label" title="Catégories & seuils">
          <p className="font-body text-sm text-on-surface-variant mb-4">
            Les grilles actives s’appliquent par catégorie de produit ; le prix minimum et les seuils de
            remplissage pilotent le groupage automatique.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/direction/categories')}
              className="rounded border border-outline-variant bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-light"
            >
              Catégories
            </button>
            <button
              onClick={() => navigate('/direction/parametres_tarifaires')}
              className="rounded border border-outline-variant bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-light"
            >
              Paramètres tarifaires
            </button>
          </div>
        </Section>
      </div>

      {/* 4. Equipe */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cardsEquipe.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <Section
        icon="groups"
        title="Dossiers chauffeurs"
        action={
          <button
            onClick={() => navigate('/direction/equipe')}
            className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline"
          >
            Voir l’équipe
          </button>
        }
      >
        <StatutsChips comptes={equipe?.parStatutDossier} labels={DOSSIER_LABELS} />
      </Section>

      {/* 5. Gains : carte-lien (calcul sur la page dédiée) */}
      <div className="waybill-card relative overflow-hidden border-l-4 border-l-primary p-6">
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-md border border-outline-variant/40 bg-surface-light p-2.5">
              <span className="material-symbols-outlined text-primary">monitoring</span>
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-widest font-semibold text-on-surface-variant">Optimisation</p>
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Gains de l’optimisation</h3>
              <p className="font-body text-sm text-on-surface-variant max-w-xl">
                Comparaison chiffrée du scénario baseline (aller-retour individuel) et du scénario
                MadaLogistix (tournées groupées) : distance, carburant, CO₂ et coût. Le calcul est
                lancé sur la page dédiée, pas à chaque chargement de ce tableau de bord.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/direction/gains')}
            className="shrink-0 rounded bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white hover:opacity-90"
          >
            Ouvrir les gains
          </button>
        </div>
      </div>
    </div>
  )
}
