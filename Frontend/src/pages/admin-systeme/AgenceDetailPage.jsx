import { useState } from 'react'

const agenceData = {
  id: 'AG-001',
  nom: 'Transports Ramanantsoa',
  responsable: 'Hery Ramanantsoa',
  email: 'hery@tr-amanantsoa.mg',
  telephone: '+261 34 12 345 67',
  adresse: 'Avenue de l\'Indépendance, Antananarivo 101',
  route: 'RN7 — Tana → Antsirabe',
  zone: 'Antananarivo',
  dateInscription: '15 Jan 2026',
  statut: 'active',
  chauffeurs: 8,
  vehicules: 5,
  ca: '12,450,000 MGA',
  missions: 156,
  note: 4.6,
}

const chauffeurs = [
  { nom: 'Sitraka Niaina', permis: 'B', vehicule: 'Toyota Hilux', plaque: 'T-2345-A', missions: 34, statut: 'actif' },
  { nom: 'Lova Miandry', permis: 'B', vehicule: 'Nissan NP300', plaque: 'T-1892-B', missions: 28, statut: 'actif' },
  { nom: 'Andry Rakoto', permis: 'C', vehicule: 'Mitsubishi L200', plaque: 'T-3401-C', missions: 41, statut: 'actif' },
  { nom: 'Fara Ramanarivo', permis: 'B', vehicule: 'Toyota Hiace', plaque: 'T-5567-D', missions: 22, statut: 'en_mission' },
]

const historique = [
  { date: '28 Août 2026', action: 'Mission #ML-782 livrée', type: 'mission' },
  { date: '27 Août 2026', action: 'Nouveau chauffeur ajouté', type: 'ajout' },
  { date: '25 Août 2026', action: 'Mission #ML-770 livrée', type: 'mission' },
  { date: '20 Août 2026', action: 'Facture mensuelle générée', type: 'facture' },
  { date: '15 Août 2026', action: 'Suspension temporaire vehicule T-1234-E', type: 'alerte' },
]

const statutChauffeur = {
  actif: { label: 'ACTIF', bg: '#F7F7F8', color: '#1A1A1E', border: '#ECECEC' },
  en_mission: { label: 'EN MISSION', bg: '#FDE8E6', color: '#E8433D', border: '#E8433D' },
  inactif: { label: 'INACTIF', bg: '#F7F7F8', color: '#8A8A92', border: '#ECECEC' },
}

export default function AgenceDetailPage({ onNavigate, agence }) {
  const data = agence || agenceData
  const [showSuspendModal, setShowSuspendModal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('agences_liste')}
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
            Fiche agence — {data.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Informations générales
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Responsable</p>
                <p className="font-body text-body-md mt-1 font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.responsable}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Email</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.email}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Téléphone</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.telephone}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Adresse</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.adresse}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Route principale</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.route}</p>
              </div>
              <div>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Date d'inscription</p>
                <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{data.dateInscription}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Chauffeurs rattachés
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#ECECEC', backgroundColor: '#F7F7F8' }}>
                    <th className="px-4 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Nom</th>
                    <th className="hidden px-4 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Véhicule</th>
                    <th className="hidden px-4 py-3 font-label text-label-sm uppercase md:table-cell" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Plaque</th>
                    <th className="px-4 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Missions</th>
                    <th className="px-4 py-3 font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {chauffeurs.map((ch) => (
                    <tr key={ch.nom} className="border-b" style={{ borderColor: '#ECECEC' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: '#F7F7F8', color: '#8A8A92' }}>
                            {ch.nom.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{ch.nom}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 font-body text-body-sm md:table-cell" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{ch.vehicule}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="inline-block rounded px-2 py-0.5 font-stamp text-[12px] font-bold tracking-wider" style={{ fontFamily: "'Chakra Petch', sans-serif", backgroundColor: '#1A1A1E', color: '#FFFFFF' }}>
                          {ch.plaque}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-body-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{ch.missions}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: statutChauffeur[ch.statut].bg, color: statutChauffeur[ch.statut].color, border: `1px solid ${statutChauffeur[ch.statut].border}` }}>
                          {statutChauffeur[ch.statut].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <h2 className="font-display text-headline-md mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Historique
            </h2>
            <div className="space-y-3">
              {historique.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: '#F7F7F8' }}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: h.type === 'alerte' ? '#E8433D' : '#8A8A92' }}>
                    {h.type === 'mission' ? 'local_shipping' : h.type === 'ajout' ? 'person_add' : h.type === 'facture' ? 'receipt' : 'warning'}
                  </span>
                  <div className="flex-1">
                    <p className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A1A1E' }}>{h.action}</p>
                  </div>
                  <span className="font-body text-body-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>{h.date}</span>
                </div>
              ))}
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
                  <span className="font-label text-label-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Chauffeurs</span>
                  <span className="font-display text-body-md font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>{data.chauffeurs}</span>
                </div>
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: '#F7F7F8' }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#E8433D', width: `${(data.chauffeurs / 15) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="font-label text-label-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Véhicules</span>
                  <span className="font-display text-body-md font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>{data.vehicules}</span>
                </div>
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: '#F7F7F8' }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#1A1A1E', width: `${(data.vehicules / 10) * 100}%` }} />
                </div>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>CA mensuel</p>
                <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{data.ca}</p>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Missions totales</p>
                <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{data.missions}</p>
              </div>
              <div className="border-t pt-4" style={{ borderColor: '#ECECEC' }}>
                <p className="font-label text-label-sm uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Note moyenne</p>
                <p className="font-display text-headline-lg mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>{data.note}/5</p>
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
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#8A8A92' }}>receipt</span>
                <span className="font-body text-body-sm" style={{ color: '#1A1A1E' }}>Consulter la facturation</span>
              </button>
              <button
                onClick={() => setShowSuspendModal(true)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all hover:opacity-80"
                style={{ borderColor: '#E8433D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#E8433D' }}>block</span>
                <span className="font-body text-body-sm font-bold" style={{ color: '#E8433D' }}>Suspendre l'agence</span>
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
              Suspendre l'agence
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
