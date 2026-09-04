import { useState } from 'react'

const freelanceData = {
  id: 'FR-001',
  nom: 'Tsiresy Andriamihaja',
  email: 'tsiresy@gmail.com',
  telephone: '+261 34 56 789 01',
  dateInscription: '10 Jan 2026',
  permis: 'B',
  vehicule: 'Toyota Hilux 2020',
  plaque: 'T-7890-F',
  assurance: true,
  visiteTechnique: true,
  anciennete: '3 ans',
  missions: 34,
  note: 4.8,
  statut: 'actif',
  disponibilite: 'disponible',
  zone: 'Antananarivo — Antsirabe',
  distanceMax: '200 km',
}

const historique = [
  { date: '28 Août 2026', dest: 'Antsirabe', statut: 'Livrée', duree: '2h15', distance: '167 km' },
  { date: '27 Août 2026', dest: 'Ambatolampy', statut: 'Livrée', duree: '1h30', distance: '68 km' },
  { date: '25 Août 2026', dest: 'Antsirabe', statut: 'Livrée', duree: '2h20', distance: '167 km' },
  { date: '22 Août 2026', dest: 'Antananarivo', statut: 'Livrée', duree: '3h10', distance: '167 km' },
  { date: '20 Août 2026', dest: 'Ambatolampy', statut: 'Annulée', duree: '—', distance: '—' },
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

export default function FreelanceDetailPage({ onNavigate, freelance }) {
  const data = freelance || freelanceData
  const [showSuspendModal, setShowSuspendModal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('freelances_liste')}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:opacity-80"
          style={{ backgroundColor: '#F7F7F8' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#8A8A92' }}>arrow_back</span>
        </button>
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            {data.nom}
          </h1>
          <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            Fiche chauffeur freelance — {data.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Email</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.email}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Téléphone</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.telephone}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Date d'inscription</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.dateInscription}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Ancienneté</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.anciennete}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Zone d'intervention</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.zone}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Distance max</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.distanceMax}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Véhicule
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Véhicule</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.vehicule}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Plaque</p>
                <span className="inline-block rounded px-3 py-1 font-stamp text-[14px] font-bold tracking-wider" style={{ fontFamily: "'Chakra Petch', sans-serif", backgroundColor: '#1A1A1E', color: '#FFFFFF' }}>
                  {data.plaque}
                </span>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Permis</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>Catégorie {data.permis}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Documents</p>
                <div className="mt-1 flex gap-2">
                  {data.assurance && (
                    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#F7F7F8', color: '#1A1A1E' }}>
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Assurance
                    </span>
                  )}
                  {data.visiteTechnique && (
                    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#F7F7F8', color: '#1A1A1E' }}>
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Visite tech.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Historique des missions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#ECECEC', backgroundColor: '#F7F7F8' }}>
                    <th className="px-4 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Date</th>
                    <th className="px-4 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Destination</th>
                    <th className="hidden px-4 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Durée</th>
                    <th className="hidden px-4 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Distance</th>
                    <th className="px-4 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((h, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: '#ECECEC' }}>
                      <td className="px-4 py-3 font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{h.date}</td>
                      <td className="px-4 py-3 font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{h.dest}</td>
                      <td className="hidden px-4 py-3 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{h.duree}</td>
                      <td className="hidden px-4 py-3 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{h.distance}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          backgroundColor: h.statut === 'Livrée' ? '#F7F7F8' : '#FDE8E6',
                          color: h.statut === 'Livrée' ? '#1A1A1E' : '#E8433D',
                          border: `1px solid ${h.statut === 'Livrée' ? '#ECECEC' : '#E8433D'}`,
                        }}>
                          {h.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Statistiques
            </h2>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="font-label text-label-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Missions effectuées</span>
                  <span className="font-display text-body-md font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>{data.missions}</span>
                </div>
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: '#F7F7F8' }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#E8433D', width: `${Math.min((data.missions / 50) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Note moyenne</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-display text-headline-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{data.note}</p>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>star</span>
                  <span className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>/5</span>
                </div>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Disponibilité</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dispoConfig[data.disponibilite]?.color || '#8A8A92' }} />
                  <span className="font-body text-body-md font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: dispoConfig[data.disponibilite]?.color || '#1A1A1E' }}>
                    {dispoConfig[data.disponibilite]?.label || 'Indisponible'}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Statut</p>
                <div className="mt-1">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: statutConfig[data.statut]?.bg || '#F7F7F8', color: statutConfig[data.statut]?.color || '#1A1A1E', border: `1px solid ${statutConfig[data.statut]?.border || '#ECECEC'}` }}>
                    {statutConfig[data.statut]?.label || 'ACTIF'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Actions
            </h2>
            <div className="space-y-3">
              <button className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all hover:opacity-80" style={{ borderColor: '#ECECEC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#8A8A92' }}>edit</span>
                <span className="font-body text-body-sm" style={{ color: '#1A1A1E' }}>Modifier les informations</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all hover:opacity-80" style={{ borderColor: '#ECECEC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#8A8A92' }}>history</span>
                <span className="font-body text-body-sm" style={{ color: '#1A1A1E' }}>Voir l'historique complet</span>
              </button>
              <button
                onClick={() => setShowSuspendModal(true)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all hover:opacity-80"
                style={{ borderColor: '#E8433D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>block</span>
                <span className="font-body text-body-sm font-bold" style={{ color: '#E8433D' }}>Suspendre le chauffeur</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSuspendModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowSuspendModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 pb-10 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="mx-auto mb-6 h-1 w-10 rounded-full" style={{ backgroundColor: '#ECECEC' }} />
            <h3 className="font-display text-headline-md mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Suspendre le chauffeur
            </h3>
            <p className="font-body text-body-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              {data.nom} — Cette action est réversible
            </p>
            <textarea
              className="mb-4 w-full rounded-xl border p-4 font-body text-body-md outline-none focus:ring-2 focus:ring-red-500/20"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
              placeholder="Motif de la suspension..."
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 rounded-lg border py-3 text-[13px] font-bold transition-all hover:opacity-80"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}
              >
                Annuler
              </button>
              <button
                className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white transition-all hover:opacity-90"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}
              >
                Confirmer la suspension
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
