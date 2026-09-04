const stats = [
  { label: 'Agences actives', value: '5', icon: 'apartment', trend: '+2 ce mois' },
  { label: 'Freelances actifs', value: '12', icon: 'hail', trend: '+3 ce mois' },
  { label: 'Demandes en attente', value: '6', icon: 'pending_actions', trend: '3 agences, 3 freelances' },
  { label: 'Missions ce mois', value: '284', icon: 'local_shipping', trend: '+18% vs mois dernier' },
]

const recentActivity = [
  { date: '28 Août 2026', action: 'Demande d\'agence reçue', detail: 'Transports Ramanantsoa — RN7 Tana→Antsirabe', icon: 'apartment' },
  { date: '28 Août 2026', action: 'Chauffeur freelance approuvé', detail: 'Tsiresy Andriamihaja — Toyota Hilux', icon: 'hail' },
  { date: '27 Août 2026', action: 'Agence suspendue', detail: 'Transports Andriba — Documents expirés', icon: 'block' },
  { date: '27 Août 2026', action: 'Demande freelance reçue', detail: 'Rojo Andrianarison — Nissan NP300', icon: 'badge' },
  { date: '25 Août 2026', action: 'Nouvelle agence inscrite', detail: 'Fret du Centre — RN7 Ambatolampy→Antsirabe', icon: 'apartment' },
]

const pendingDemandes = [
  { type: 'agence', nom: 'Transports Ramanantsoa', date: '28 Août', icon: 'apartment' },
  { type: 'agence', nom: 'Logistique Mamy & Fils', date: '27 Août', icon: 'apartment' },
  { type: 'agence', nom: 'Fret du Centre', date: '25 Août', icon: 'apartment' },
  { type: 'freelance', nom: 'Tsiresy Andriamihaja', date: '28 Août', icon: 'hail' },
  { type: 'freelance', nom: 'Rojo Andrianarison', date: '27 Août', icon: 'hail' },
  { type: 'freelance', nom: 'Miora Andriamampianina', date: '26 Août', icon: 'hail' },
]

export default function AdminDashboardPage({ onNavigate }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
          Vue d'ensemble
        </h1>
        <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
          Tableau de bord de la plateforme MadaLogistix — RN7 Tana–Ambatolampy–Antsirabe
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
                <span className="material-symbols-outlined" style={{ color: '#E8433D' }}>{s.icon}</span>
              </div>
              <span className="text-[12px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{s.trend}</span>
            </div>
            <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>{s.label}</p>
            <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-headline-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Demandes en attente
            </h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}>
              {pendingDemandes.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingDemandes.map((d, i) => (
              <button
                key={i}
                onClick={() => onNavigate(d.type === 'agence' ? 'agences_demandes' : 'freelances_demandes')}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:opacity-80"
                style={{ backgroundColor: '#F7F7F8' }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>{d.icon}</span>
                <div className="flex-1">
                  <p className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{d.nom}</p>
                  <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{d.date}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#FFFFFF', color: '#8A8A92', border: '1px solid #ECECEC' }}>
                  {d.type}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
            Activité récente
          </h2>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: '#F7F7F8' }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: a.icon === 'block' ? '#E8433D' : '#8A8A92' }}>{a.icon}</span>
                <div className="flex-1">
                  <p className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{a.action}</p>
                  <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{a.detail}</p>
                </div>
                <span className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
