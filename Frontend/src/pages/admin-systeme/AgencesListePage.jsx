const agences = [
  {
    id: 'AG-001',
    nom: 'Transports Ramanantsoa',
    responsable: 'Hery Ramanantsoa',
    statut: 'active',
    dateInscription: '15 Jan 2026',
    chauffeurs: 8,
    vehicules: 5,
    route: 'RN7 — Tana → Antsirabe',
    zone: 'Antananarivo',
    ca: '12,450,000 MGA',
  },
  {
    id: 'AG-002',
    nom: 'Fret Malgache Express',
    responsable: 'Ny Hasina',
    statut: 'active',
    dateInscription: '3 Fév 2026',
    chauffeurs: 15,
    vehicules: 10,
    route: 'RN7 — Tana → Ambatolampy',
    zone: 'Antananarivo',
    ca: '28,900,000 MGA',
  },
  {
    id: 'AG-003',
    nom: 'Logistique du Vakinankaratra',
    responsable: 'Andry Rabearimanana',
    statut: 'active',
    dateInscription: '22 Fév 2026',
    chauffeurs: 6,
    vehicules: 4,
    route: 'RN7 — Ambatolampy → Antsirabe',
    zone: 'Antsirabe',
    ca: '8,200,000 MGA',
  },
  {
    id: 'AG-004',
    nom: 'Centre Logistique Antsirabe',
    responsable: 'Fara Razafindrabe',
    statut: 'active',
    dateInscription: '10 Mar 2026',
    chauffeurs: 10,
    vehicules: 6,
    route: 'RN7 — Antsirabe',
    zone: 'Antsirabe',
    ca: '15,800,000 MGA',
  },
  {
    id: 'AG-005',
    nom: 'Transports Andriba',
    responsable: 'Jean Rakotonarivo',
    statut: 'suspendue',
    dateInscription: '5 Avr 2026',
    chauffeurs: 3,
    vehicules: 2,
    route: 'RN7 — Ambatomanga',
    zone: 'Ambatolampy',
    ca: '3,100,000 MGA',
  },
]

const statutConfig = {
  active: { label: 'ACTIVE', bg: '#F7F7F8', color: '#1A1A1E', border: '#ECECEC' },
  suspendue: { label: 'SUSPENDUE', bg: '#FDE8E6', color: '#E8433D', border: '#E8433D' },
}

export default function AgencesListePage({ onNavigate }) {
  const agencesActives = agences.filter(a => a.statut === 'active').length
  const totalChauffeurs = agences.reduce((sum, a) => sum + a.chauffeurs, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Agences actives
          </h1>
          <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            {agencesActives} agence{agencesActives > 1 ? 's' : ''} active{agencesActives > 1 ? 's' : ''} — {totalChauffeurs} chauffeurs rattachés
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border px-4 py-2 font-label text-label-md transition-colors hover:opacity-80" style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}>
            <span className="material-symbols-outlined text-[20px]">download</span>
            Exporter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#E8433D' }}>apartment</span>
            </div>
            <span className="text-[13px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#E8433D' }}>+2 ce mois</span>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Total agences</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{agences.length}</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#1A1A1E' }}>hail</span>
            </div>
            <span className="text-[13px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>Total plateforme</span>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Chauffeurs rattachés</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{totalChauffeurs}</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>local_shipping</span>
            </div>
            <span className="text-[13px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>Total flotte</span>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Véhicules</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{agences.reduce((sum, a) => sum + a.vehicules, 0)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#ECECEC' }}>
          <h2 className="font-display text-headline-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>Répertoire des agences</h2>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: '#8A8A92' }}>search</span>
            <input
              type="text"
              placeholder="Rechercher..."
              className="rounded-lg border py-2 pl-10 pr-4 text-[13px] outline-none"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: '#ECECEC', backgroundColor: '#F7F7F8' }}>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Agence</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Responsable</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Route</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Chauffeurs</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>CA mensuel</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Statut</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agences.map((agence) => (
                <tr key={agence.id} className="border-b transition-colors hover:opacity-90" style={{ borderColor: '#ECECEC' }}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-body text-body-md font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{agence.nom}</p>
                      <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{agence.id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{agence.responsable}</td>
                  <td className="hidden px-6 py-4 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{agence.route}</td>
                  <td className="hidden px-6 py-4 font-body text-body-sm font-bold md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{agence.chauffeurs}</td>
                  <td className="hidden px-6 py-4 font-body text-body-sm font-bold md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{agence.ca}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: statutConfig[agence.statut].bg, color: statutConfig[agence.statut].color, border: `1px solid ${statutConfig[agence.statut].border}` }}>
                      {statutConfig[agence.statut].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onNavigate('agence_detail', { agence })}
                      className="rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all hover:opacity-80"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8433D' }}
                    >
                      Voir fiche
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
