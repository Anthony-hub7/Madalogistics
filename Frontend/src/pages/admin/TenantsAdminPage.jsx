const stats = [
  {
    label: 'Total Utilisateurs',
    value: '42,892',
    trend: '+12.5%',
    icon: 'group',
    color: 'bg-primary/10 text-primary',
    barColor: 'bg-primary',
    barWidth: '75%',
    trendIcon: 'trending_up',
    trendColor: 'text-secondary',
  },
  {
    label: 'Activité du service',
    value: '89.4k',
    unit: 'ops/h',
    trend: '+5.2%',
    icon: 'bolt',
    color: 'bg-secondary/10 text-secondary',
    barColor: 'bg-secondary',
    barWidth: '60%',
    trendIcon: 'trending_up',
    trendColor: 'text-secondary',
  },
  {
    label: 'Niveau SaaS',
    value: 'Enterprise',
    trend: 'Stable',
    icon: 'cloud_done',
    color: 'bg-tertiary-fixed-dim/20 text-tertiary',
    barColor: 'bg-tertiary-fixed-dim',
    barWidth: '92%',
    trendIcon: 'horizontal_rule',
    trendColor: 'text-on-surface-variant',
  },
]

const chartDays = [
  { day: 'Lun', ops: 12, users: 8, total: 32 },
  { day: 'Mar', ops: 24, users: 16, total: 48 },
  { day: 'Mer', ops: 20, users: 12, total: 40 },
  { day: 'Jeu', ops: 44, users: 28, total: 64 },
  { day: 'Ven', ops: 32, users: 20, total: 56 },
  { day: 'Sam', ops: 10, users: 6, total: 24 },
  { day: 'Dim', ops: 8, users: 4, total: 20 },
]

const logs = [
  { id: '#LOG-8291', actor: 'Rakoto Admin', initials: 'RA', bg: 'bg-primary-container text-on-primary-container', activity: 'Réallocation de flotte initiée', location: 'Antananarivo Hub', status: 'Succès', statusBg: 'bg-secondary-container text-on-secondary-fixed-variant' },
  { id: '#LOG-8290', actor: 'Mamy System', initials: 'MS', bg: 'bg-secondary-container text-on-secondary-fixed', activity: 'Mise à jour des identifiants sécurité', location: 'Auth Global', status: 'Succès', statusBg: 'bg-secondary-container text-on-secondary-fixed-variant' },
  { id: '#LOG-8289', actor: 'Tâche Automatisée', initials: '!', bg: 'bg-error-container text-on-error-container', activity: 'Sauvegarde BDD retardée', location: 'Cloud S3', status: 'Avertissement', statusBg: 'bg-error-container text-on-error-container' },
]

function TenantsAdminPage() {
  const maxValue = Math.max(...chartDays.map(d => d.total))

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Statistiques Globales</h1>
          <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
            Surveillance en temps réel de l'écosystème MadaLogistix.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline px-4 py-2 font-label-md text-label-md transition-colors hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            Derniers 30 jours
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary transition-all hover:opacity-90">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Exporter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 transition-shadow hover:shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <span className={`flex items-center gap-1 font-label-sm text-label-sm ${stat.trendColor}`}>
                <span className="material-symbols-outlined text-[14px]">{stat.trendIcon}</span>
                {stat.trend}
              </span>
            </div>
            <h3 className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{stat.label}</h3>
            <div className="font-headline-lg text-headline-lg mt-1 text-on-background">
              {stat.value}
              {stat.unit && <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">{stat.unit}</span>}
            </div>
            <div className="mt-4 h-1 w-full rounded-full bg-surface-container">
              <div className={`h-1 rounded-full ${stat.barColor}`} style={{ width: stat.barWidth }} />
            </div>
          </div>
        ))}

        <div className="relative overflow-hidden rounded-xl bg-primary p-6">
          <div className="relative z-10">
            <h3 className="font-label-md text-label-md uppercase tracking-wider text-primary-fixed">Santé Système</h3>
            <div className="font-headline-lg text-headline-lg mt-1 text-on-primary">99.98%</div>
            <p className="font-body-sm text-body-sm mt-2 text-primary-fixed opacity-90">
              Tous les nœuds opérationnels dans le Hub Madagascar Sud.
            </p>
            <button className="mt-6 flex items-center gap-2 border-b border-on-primary/30 pb-1 font-label-md text-label-md text-on-primary transition-all hover:border-on-primary">
              Voir le statut <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
          <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-on-primary/10 blur-2xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2 md:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="font-headline-md text-headline-md text-on-background">Activité dans le temps</h2>
            <div className="flex gap-4">
              <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <span className="h-3 w-3 rounded-full bg-primary"></span> Opérations
              </span>
              <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <span className="h-3 w-3 rounded-full bg-secondary"></span> Utilisateurs
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            {chartDays.map((d) => {
              const opsHeight = (d.ops / maxValue) * 100
              const usersHeight = (d.users / maxValue) * 100
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-col items-center justify-end" style={{ height: '200px' }}>
                    <div
                      className="w-full rounded-t-lg bg-primary/20 transition-colors hover:bg-primary/30"
                      style={{ height: `${opsHeight}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg bg-secondary/30 transition-colors hover:bg-secondary/40"
                      style={{ height: `${usersHeight}%` }}
                    />
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{d.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h2 className="font-headline-md text-headline-md text-on-background mb-4">Santé Organisationnelle</h2>
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant">Efficacité Flotte</span>
                  <span className="font-label-md text-label-md font-bold text-primary">92%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-container">
                  <div className="h-2 rounded-full bg-primary" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant">Utilisation Entrepôts</span>
                  <span className="font-label-md text-label-md font-bold text-secondary">78%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-container">
                  <div className="h-2 rounded-full bg-secondary" style={{ width: '78%' }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant">Latence Admin</span>
                  <span className="font-label-md text-label-md font-bold text-error">45ms</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-container">
                  <div className="h-2 rounded-full bg-error" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-outline-variant pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-primary">
                  <span className="material-symbols-outlined">security</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md font-bold text-on-background">Statut Conformité</p>
                  <p className="font-body-sm text-body-sm text-secondary">Vérifié & Sécurisé</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4 md:px-8">
          <h2 className="font-headline-md text-headline-md text-on-background">Journal Système</h2>
          <button className="font-label-md text-label-md text-primary hover:underline">Tout voir</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 md:px-8">Événement</th>
                <th className="px-6 py-4 md:px-8">Acteur</th>
                <th className="hidden px-6 py-4 md:table-cell md:px-8">Activité</th>
                <th className="hidden px-6 py-4 md:table-cell md:px-8">Localisation</th>
                <th className="px-6 py-4 md:px-8">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-surface">
                  <td className="px-6 py-4 font-label-md text-label-md text-on-surface-variant md:px-8">{log.id}</td>
                  <td className="px-6 py-4 md:px-8">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${log.bg}`}>
                        {log.initials}
                      </div>
                      <span className="font-body-sm text-body-sm">{log.actor}</span>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 font-body-sm text-body-sm md:table-cell md:px-8">{log.activity}</td>
                  <td className="hidden px-6 py-4 font-body-sm text-body-sm md:table-cell md:px-8">{log.location}</td>
                  <td className="px-6 py-4 md:px-8">
                    <span className={`rounded px-2 py-1 text-[11px] font-bold uppercase ${log.statusBg}`}>
                      {log.status}
                    </span>
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

export default TenantsAdminPage
