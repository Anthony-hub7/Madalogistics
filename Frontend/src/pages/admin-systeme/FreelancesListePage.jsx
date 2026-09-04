const freelances = [
  {
    id: 'FR-001',
    nom: 'Tsiresy Andriamihaja',
    permis: 'B',
    vehicule: 'Toyota Hilux 2020',
    plaque: 'T-7890-F',
    statut: 'actif',
    missions: 34,
    note: 4.8,
    zone: 'Antananarivo — Antsirabe',
    dateInscription: '10 Jan 2026',
    disponibilite: 'disponible',
  },
  {
    id: 'FR-002',
    nom: 'Jean Razafindrabe',
    permis: 'C',
    vehicule: 'Nissan NP300 2019',
    plaque: 'T-5678-E',
    statut: 'actif',
    missions: 52,
    note: 4.5,
    zone: 'Antananarivo — Ambatolampy',
    dateInscription: '5 Fév 2026',
    disponibilite: 'en_mission',
  },
  {
    id: 'FR-003',
    nom: 'Harena Andrianjafy',
    permis: 'B',
    vehicule: 'Mitsubishi L200 2021',
    plaque: 'T-9012-K',
    statut: 'actif',
    missions: 18,
    note: 4.9,
    zone: 'Ambatolampy — Antsirabe',
    dateInscription: '20 Mar 2026',
    disponibilite: 'disponible',
  },
  {
    id: 'FR-004',
    nom: 'Njaka Raharison',
    permis: 'B',
    vehicule: 'Toyota Hilux 2018',
    plaque: 'T-3456-L',
    statut: 'actif',
    missions: 41,
    note: 4.3,
    zone: 'Antananarivo',
    dateInscription: '12 Avr 2026',
    disponibilite: 'indisponible',
  },
  {
    id: 'FR-005',
    nom: 'Faneva Ratsimbazafy',
    permis: 'C',
    vehicule: 'Renault Duster 2022',
    plaque: 'T-6789-M',
    statut: 'suspendu',
    missions: 27,
    note: 4.1,
    zone: 'Antsirabe',
    dateInscription: '8 Mai 2026',
    disponibilite: 'indisponible',
  },
]

const statutConfig = {
  actif: { label: 'ACTIF', bg: '#F7F7F8', color: '#1A1A1E', border: '#ECECEC' },
  suspendu: { label: 'SUSPENDU', bg: '#FDE8E6', color: '#E8433D', border: '#E8433D' },
}

const dispoConfig = {
  disponible: { label: 'Disponible', color: '#1A1A1E' },
  en_mission: { label: 'En mission', color: '#E8433D' },
  indisponible: { label: 'Indisponible', color: '#8A8A92' },
}

export default function FreelancesListePage({ onNavigate }) {
  const actifs = freelances.filter(f => f.statut === 'actif').length
  const totalMissions = freelances.reduce((sum, f) => sum + f.missions, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Chauffeurs freelance actifs
          </h1>
          <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            {actifs} freelance{actifs > 1 ? 's' : ''} actif{actifs > 1 ? 's' : ''} — {totalMissions} missions effectuées
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
              <span className="material-symbols-outlined" style={{ color: '#E8433D' }}>hail</span>
            </div>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Total freelances</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{freelances.length}</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#1A1A1E' }}>local_shipping</span>
            </div>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Missions totales</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{totalMissions}</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
              <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>star</span>
            </div>
          </div>
          <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Note moyenne</p>
          <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>4.5/5</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#ECECEC' }}>
          <h2 className="font-display text-headline-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>Répertoire freelances</h2>
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
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Chauffeur</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Véhicule</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Plaque</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Zone</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Missions</th>
                <th className="hidden px-6 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Note</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Dispo.</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Statut</th>
                <th className="px-6 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {freelances.map((fr) => (
                <tr key={fr.id} className="border-b transition-colors hover:opacity-90" style={{ borderColor: '#ECECEC' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: '#F7F7F8', color: '#8A8A92' }}>
                        {fr.nom.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{fr.nom}</p>
                        <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{fr.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{fr.vehicule}</td>
                  <td className="hidden px-6 py-4 md:table-cell">
                    <span className="inline-block rounded px-2 py-0.5 font-stamp text-[12px] font-bold tracking-wider" style={{ fontFamily: "'Chakra Petch', sans-serif", backgroundColor: '#1A1A1E', color: '#FFFFFF' }}>
                      {fr.plaque}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{fr.zone}</td>
                  <td className="px-6 py-4 font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{fr.missions}</td>
                  <td className="hidden px-6 py-4 md:table-cell">
                    <span className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{fr.note}</span>
                    <span className="material-symbols-outlined text-[14px] align-middle" style={{ color: '#E8433D' }}>star</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: dispoConfig[fr.disponibilite].color }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dispoConfig[fr.disponibilite].color }} />
                      {dispoConfig[fr.disponibilite].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: statutConfig[fr.statut].bg, color: statutConfig[fr.statut].color, border: `1px solid ${statutConfig[fr.statut].border}` }}>
                      {statutConfig[fr.statut].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onNavigate('freelance_detail', { freelance: fr })}
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
