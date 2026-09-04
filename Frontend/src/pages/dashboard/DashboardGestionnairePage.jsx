const stats = [
  {
    label: 'Livraisons aujourd\'hui',
    value: '142',
    trend: '+12%',
    icon: 'local_shipping',
    iconBg: 'bg-primary/10 text-primary border border-primary/20',
    trendColor: 'text-primary font-bold',
  },
  {
    label: 'Véhicules disponibles',
    value: '28 / 34',
    sub: '85%',
    icon: 'verified',
    iconBg: 'bg-surface-light text-on-surface border border-outline-variant',
    trendColor: 'text-on-surface-variant font-bold',
  },
  {
    label: 'Commandes en attente',
    value: '12',
    trend: '+4 urgent',
    icon: 'pending_actions',
    iconBg: 'bg-primary/10 text-primary border border-primary/30',
    trendColor: 'text-primary font-bold',
  },
  {
    label: 'Taux remplissage',
    value: '92%',
    trend: 'Optimal',
    icon: 'inventory_2',
    iconBg: 'bg-surface-light text-primary border border-outline-variant',
    trendColor: 'text-primary font-bold',
  },
  {
    label: 'Coût estimé (Daily)',
    value: '3.850 €',
    trend: 'Moy: 4.2k€',
    icon: 'payments',
    iconBg: 'bg-primary/10 text-primary border border-primary/20',
    trendColor: 'text-on-surface-variant font-medium',
  },
]

const chartDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const chartHeights = [40, 65, 50, 85, 60, 75, 55]

const recentOrders = [
  { id: '#ANT-9402', destination: 'Antananarivo (Analakely)', status: 'En route', isGreen: false, priority: 'Élevée', priorityIcon: 'priority_high', priorityColor: 'text-primary font-bold', vehicle: 'V-012 (Actros)' },
  { id: '#ANT-9398', destination: 'Toamasina (Port)', status: 'Chargement', isGreen: false, priority: 'Moyenne', priorityIcon: '', priorityColor: 'text-on-surface-variant', vehicle: 'V-045 (Isuzu)' },
  { id: '#ANT-9395', destination: 'Antsirabe (Centre)', status: 'Livré', isGreen: true, priority: 'Normale', priorityIcon: '', priorityColor: 'text-on-surface-variant', vehicle: 'V-022 (Scania)' },
  { id: '#ANT-9391', destination: 'Mahajanga', status: 'Retardé', isGreen: false, priority: 'Critique', priorityIcon: 'priority_high', priorityColor: 'text-primary font-bold', vehicle: 'V-009 (Man)' },
]

function DashboardGestionnairePage() {
  return (
    <div className="space-y-8">
      {/* Header section with operational transport title */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">POSTE DE GESTION RN7</span>
            <span className="text-xs font-mono text-on-surface-variant">RN7-LOG-2026</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-on-surface uppercase tracking-tight mt-1">Tableau de bord opérationnel</h2>
          <p className="font-body text-sm text-on-surface-variant">
            Vue d'ensemble de vos opérations logistiques et du corridor aujourd'hui.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded border border-outline-variant bg-surface-light px-4 py-2 font-display text-sm font-semibold uppercase tracking-wider text-on-surface transition-all hover:border-primary hover:text-primary">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtrer
          </button>
          <button className="flex items-center gap-2 rounded border border-outline-variant bg-surface-light px-4 py-2 font-display text-sm font-semibold uppercase tracking-wider text-on-surface transition-all hover:border-primary hover:text-primary">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Exporter
          </button>
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="waybill-card flex flex-col justify-between p-5 border-l-4 border-l-primary relative overflow-hidden transition-all duration-150 hover:border-primary">
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded p-2 ${stat.iconBg}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              {stat.trend && (
                <span className={`font-display text-xs font-bold uppercase tracking-wider ${stat.trendColor}`}>{stat.trend}</span>
              )}
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant font-semibold">{stat.label}</p>
              <p className="font-display text-2xl font-bold mt-1 text-on-surface tabular-nums">{stat.value}</p>
              {stat.sub && <p className="font-body text-xs text-on-surface-variant mt-0.5">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="waybill-card p-6">
          <div className="mb-6 flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Livraisons par jour</h3>
            <select className="border border-outline-variant rounded bg-surface-light px-3 py-1 font-display text-xs uppercase text-on-surface-variant focus:border-primary focus:outline-none">
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
            </select>
          </div>
          <div className="flex items-end justify-between gap-2 px-2 h-48">
            {chartDays.map((day, i) => (
              <div key={day} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                <div
                  className={`w-full rounded-t transition-colors ${
                    i === 3 ? 'bg-primary' : 'bg-surface-light border-t border-outline-variant hover:bg-primary/80'
                  }`}
                  style={{ height: `${chartHeights[i]}%`, minHeight: '24px' }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between px-2 font-display text-xs uppercase tracking-wider text-on-surface-variant border-t border-outline-variant/30 pt-3">
            {chartDays.map((day, i) => (
              <span key={day} className={i === 3 ? 'font-bold text-primary' : ''}>{day}</span>
            ))}
          </div>
        </div>

        <div className="waybill-card p-6">
          <div className="mb-6 flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Taux d'utilisation de la flotte</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-display text-xs uppercase">
                <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                <span>Réel</span>
              </div>
              <div className="flex items-center gap-1.5 font-display text-xs uppercase">
                <span className="h-2.5 w-2.5 rounded-full bg-outline-variant"></span>
                <span>Objectif</span>
              </div>
            </div>
          </div>
          <div className="relative h-48 overflow-hidden rounded border border-outline-variant/60 bg-surface-light">
            <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
              <path d="M0,80 L50,75 L100,60 L150,65 L200,40 L250,30 L300,45 L350,20 L400,25 V100 H0 Z" fill="rgba(232, 67, 61, 0.12)" />
              <path d="M0,80 L50,75 L100,60 L150,65 L200,40 L250,30 L300,45 L350,20 L400,25" fill="none" stroke="#E8433D" strokeWidth="2.5" />
              <line x1="0" y1="50" x2="400" y2="50" stroke="#8A8A92" strokeDasharray="4" opacity="0.4" />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 font-display text-xs font-bold text-on-surface-variant">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
          </div>
          <p className="mt-4 text-center font-display text-xs uppercase tracking-wider text-on-surface-variant border-t border-outline-variant/30 pt-3">
            Utilisation moyenne ce mois-ci : <span className="font-bold text-primary font-mono text-sm">82.4%</span>
          </p>
        </div>
      </div>

      {/* Table Section: Recent Orders with Stamp Badges */}
      <div className="waybill-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-light px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Dernières commandes & bordereaux</h3>
          </div>
          <button className="font-display text-xs uppercase font-bold tracking-wider text-primary hover:underline">Voir tout</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-light/60">
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">ID Commande</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Destination</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Statut Stamp</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Priorité</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Plaque / Véhicule</th>
                <th className="px-6 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {recentOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface-light/70">
                  <td className="px-6 py-4 font-stamp font-bold text-sm text-on-surface">{order.id}</td>
                  <td className="px-6 py-4 font-body text-sm font-medium text-on-surface">{order.destination}</td>
                  <td className="px-6 py-4">
                    <span className={`stamp-badge text-xs ${order.isGreen ? 'stamp-badge-green' : 'stamp-badge-red'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 font-display text-xs uppercase tracking-wider ${order.priorityColor}`}>
                      {order.priorityIcon && <span className="material-symbols-outlined text-[16px]">{order.priorityIcon}</span>}
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="license-plate-tag text-xs">{order.vehicle}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-on-surface-variant transition-colors hover:text-primary">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DashboardGestionnairePage
