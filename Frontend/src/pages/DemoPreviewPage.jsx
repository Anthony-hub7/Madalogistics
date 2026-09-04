import { useState } from 'react'
import ThemeScope from '../components/ThemeScope'

const roles = [
  {
    key: 'direction',
    label: 'Direction / Logistics',
    theme: 'light',
    description: 'Thème Light (White/Red) — Cockpit opérationnel dense',
    stats: [
      { label: 'Livraisons aujourd\'hui', value: '142', trend: '+12%', icon: 'local_shipping', color: 'text-secondary' },
      { label: 'Véhicules disponibles', value: '28 / 34', sub: '85%', icon: 'verified', color: 'text-on-secondary-container' },
      { label: 'Commandes en attente', value: '12', trend: '+4 urgent', icon: 'pending_actions', color: 'text-error' },
      { label: 'Taux remplissage', value: '92%', trend: 'Optimal', icon: 'inventory_2', color: 'text-primary' },
      { label: 'Coût estimé', value: '3.850 €', trend: 'Moy: 4.2k€', icon: 'payments', color: 'text-on-surface-variant' },
    ],
    orders: [
      { id: '#ANT-9402', dest: 'Antananarivo', status: 'En route', statusBg: 'bg-secondary-container text-on-secondary-container', priority: 'Élevée', priorityColor: 'text-error' },
      { id: '#ANT-9398', dest: 'Toamasina', status: 'Chargement', statusBg: 'bg-surface-container-highest text-on-surface-variant', priority: 'Moyenne', priorityColor: 'text-on-surface-variant' },
      { id: '#ANT-9395', dest: 'Antsirabe', status: 'En route', statusBg: 'bg-secondary-container text-on-secondary-container', priority: 'Normale', priorityColor: 'text-tertiary-container' },
      { id: '#ANT-9391', dest: 'Mahajanga', status: 'Retardé', statusBg: 'bg-error-container text-error', priority: 'Critique', priorityColor: 'text-error' },
    ],
  },
  {
    key: 'client',
    label: 'Client',
    theme: 'light',
    description: 'Thème Light (White/Red) — Interface rassurante',
    stats: [
      { label: 'Expéditions actives', value: '3', trend: 'En cours', icon: 'local_shipping', color: 'text-secondary' },
      { label: 'Livrées ce mois', value: '8', trend: '+2', icon: 'check_circle', color: 'text-on-secondary-container' },
      { label: 'En préparation', value: '2', trend: 'Prochainement', icon: 'inventory_2', color: 'text-primary' },
    ],
    orders: [
      { id: 'CMD-2024-8932', dest: 'Toamasina Port', status: 'EN LIVRAISON', statusBg: 'bg-secondary-container text-on-secondary-container' },
      { id: 'CMD-2024-9104', dest: 'Mahajanga', status: 'PRÉPARATION', statusBg: 'bg-surface-container-highest text-on-surface-variant' },
    ],
  },
  {
    key: 'chauffeur',
    label: 'Chauffeur',
    theme: 'light-simple',
    description: 'Light simplifié — Une seule card, boutons XXL',
    mission: {
      client: 'Pharmacie Centrale',
      address: "12 Rue de l'Indépendance, Analakely",
      weight: '120 kg',
      volume: '2.4 m³',
      status: 'en_cours',
      date: '26 Août 2026',
    },
  },
]

function DirectionPreview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Tableau de bord</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Vue d'ensemble de vos opérations logistiques aujourd'hui.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-highest px-4 py-2 font-label-md text-label-md text-on-surface">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>Filtrer
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-highest px-4 py-2 font-label-md text-label-md text-on-surface">
            <span className="material-symbols-outlined text-[18px]">download</span>Exporter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {roles[0].stats.map((stat) => (
          <div key={stat.label} className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg p-2.5 bg-surface-container text-primary"><span className="material-symbols-outlined">{stat.icon}</span></div>
              {stat.trend && <span className={`font-label-sm text-label-sm ${stat.color}`}>{stat.trend}</span>}
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{stat.label}</p>
              <p className="font-headline-md text-headline-md mt-1 text-on-surface">{stat.value}</p>
              {stat.sub && <p className="font-label-sm text-label-sm text-on-surface-variant">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">Dernières commandes</h3>
          <button className="font-label-md text-label-md text-primary hover:underline">Voir tout</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">ID Commande</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Destination</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Statut</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Priorité</th>
                <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Véhicule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {roles[0].orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface-container-lowest">
                  <td className="px-6 py-4 font-label-md text-label-md text-on-surface">{order.id}</td>
                  <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface">{order.dest}</td>
                  <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 font-label-sm text-label-sm ${order.statusBg}`}>{order.status}</span></td>
                  <td className="px-6 py-4"><span className={`flex items-center gap-1 font-label-md text-label-md ${order.priorityColor}`}><span className="material-symbols-outlined text-[16px]">priority_high</span>{order.priority}</span></td>
                  <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface-variant">V-012 (Actros)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ClientPreview() {
  const [activeOrder, setActiveOrder] = useState(0)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Mes Expéditions</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Gérez vos expéditions en cours.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>Nouvelle Expédition
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>switch_account</span>
          <h3 className="font-headline-md text-headline-md">Commandes Actives</h3>
          <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-label-sm text-label-sm">{roles[1].orders.length} en cours</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {roles[1].orders.map((order, i) => (
            <div key={order.id} onClick={() => setActiveOrder(i)} className={`rounded-xl border p-6 cursor-pointer transition-all duration-300 ${
              activeOrder === i
                ? 'bg-surface border-2 border-accent shadow-lg'
                : 'bg-surface-container-lowest border-outline-variant hover:border-primary'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary"><span className="material-symbols-outlined">{order.id.includes('8932') ? 'local_shipping' : 'inventory_2'}</span></div>
                  <div>
                    <h4 className="font-headline-md text-body-lg font-bold text-on-surface">{order.id}</h4>
                    <p className="font-label-md text-label-md text-on-surface-variant">Destination: {order.dest}</p>
                  </div>
                </div>
                <span className={`${order.statusBg} px-3 py-1 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-4 pt-4 border-b border-outline-variant flex justify-between items-center">
                <div className="flex gap-6">
                  <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Date</p><p className="font-label-md text-label-md text-on-surface">24 Oct, 2024</p></div>
                  <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Contenu</p><p className="font-label-md text-label-md text-on-surface">12x Palettes Textiles</p></div>
                </div>
                <button className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline">Voir détails <span className="material-symbols-outlined text-[16px]">arrow_forward</span></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChauffeurPreview() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="mb-6">
        <span className="font-label-md text-label-md text-primary uppercase tracking-wider">Aujourd'hui</span>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Mes missions</h2>
        <div className="bg-primary text-on-primary px-3 py-1 rounded-full font-label-md text-label-md mt-2 inline-block">1 Mission</div>
      </div>

      {/* Single giant card = current mission */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center ring-4 ring-surface">
            <span className="material-symbols-outlined text-2xl text-primary">local_shipping</span>
          </div>
          <div className="flex-grow">
            <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">#ML-782</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-1">Pharmacie Centrale</h3>
            <div className="flex items-start gap-2 mb-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">location_on</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">12 Rue de l'Indépendance, Analakely</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface-container-low rounded-lg p-2 border border-outline-variant/30">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Poids</p>
                <p className="font-body-md text-body-md font-bold text-on-surface">120 kg</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2 border border-outline-variant/30">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Volume</p>
                <p className="font-body-md text-body-md font-bold text-on-surface">2.4 m³</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-primary text-on-primary py-4 rounded-xl font-label-md font-bold text-lg active:scale-95">
                <span className="material-symbols-outlined">navigation</span>
                Démarrer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary banner */}
      <div className="bg-surface border border-outline-variant text-on-surface rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="font-headline-md text-headline-md mb-2">Résumé de tournée</h4>
          <div className="flex justify-between items-center">
            <div><p className="text-primary font-label-sm text-label-sm uppercase">Distance Totale</p><p className="font-headline-lg-mobile text-headline-lg-mobile">18.4 km</p></div>
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center border border-outline-variant"><span className="material-symbols-outlined text-primary text-3xl">route</span></div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="bg-surface-low rounded-lg px-3 py-2 border border-outline-variant"><p className="font-label-sm text-label-sm text-on-surface-variant">Stops</p><p className="font-label-md text-label-md font-bold text-on-surface">5</p></div>
            <div className="bg-surface-low rounded-lg px-3 py-2 border border-outline-variant"><p className="font-label-sm text-label-sm text-on-surface-variant">Durée est.</p><p className="font-label-md text-label-md font-bold text-on-surface">1h05</p></div>
          </div>
        </div>
      </div>

      {/* Next missions (collapsed) */}
      <div className="space-y-4">
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase px-1">Prochaines missions</h3>
        {[
          { id: 'ML-785', client: 'Supermaki Ivandry', status: 'À VENIR' },
          { id: 'ML-789', client: 'Dépôt Logistique Est', status: 'À VENIR' },
        ].map((m) => (
          <div key={m.id} className="flex gap-4 bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4">
            <div className="w-14 h-14 rounded-xl bg-surface-container-highest border-2 border-outline-variant flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl text-on-surface-variant">schedule</span>
            </div>
            <div className="flex-grow">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{m.client}</h3>
              <span className={`font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant`}>{m.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DemoPreviewPage() {
  const [activeRole, setActiveRole] = useState('direction')

  return (
    <ThemeScope theme="light" className="min-h-screen bg-page text-on-surface">
      {/* Role selector */}
      <div className="sticky top-0 z-30 bg-surface border-b border-outline-variant px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-label-md text-label-md text-on-surface-variant mr-2">Preview :</span>
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => setActiveRole(role.key)}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
                activeRole === role.key
                  ? 'bg-accent text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {role.label}
            </button>
          ))}
          <span className={`ml-auto font-label-sm text-label-sm px-2 py-0.5 rounded-full ${
            activeRole === 'direction' ? 'bg-secondary-container text-on-secondary-container' :
            activeRole === 'client' ? 'bg-secondary/10 text-secondary' :
            'bg-primary/20 text-primary'
          }`}>
            {roles.find(r => r.key === activeRole)?.theme}
          </span>
        </div>
      </div>

      {/* Demo content */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Design System — MadaLogistix
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {roles.find(r => r.key === activeRole)?.description}
          </p>
          <div className="flex gap-4 mt-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Couleur d'accent : <span className="inline-block w-3 h-3 rounded bg-accent align-middle"></span> #E8433D</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Fond : <span className="inline-block w-3 h-3 rounded align-middle" style={{ backgroundColor: '#FAFAF9' }}></span></span>
          </div>
        </div>

        {activeRole === 'direction' && <DirectionPreview />}
        {activeRole === 'client' && <ClientPreview />}
        {activeRole === 'chauffeur' && <ChauffeurPreview />}
      </div>
    </ThemeScope>
  )
}