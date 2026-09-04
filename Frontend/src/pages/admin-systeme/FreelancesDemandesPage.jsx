import { useState } from 'react'

const demandes = [
  {
    id: 'DEM-FR-001',
    nom: 'Tsiresy Andriamihaja',
    email: 'tsiresy@gmail.com',
    telephone: '+261 34 56 789 01',
    dateDemande: '28 Août 2026',
    statut: 'en_attente',
    permis: 'B',
    vehicule: 'Toyota Hilux 2020',
    plaque: 'T-7890-F',
    assurance: true,
    visiteTechnique: true,
    anciennete: '3 ans',
    documents: ['Permis B', 'Carte grise', 'Assurance', 'Visite technique'],
  },
  {
    id: 'DEM-FR-002',
    nom: 'Rojo Andrianarison',
    email: 'rojo@andrianarison.mg',
    telephone: '+261 33 23 456 78',
    dateDemande: '27 Août 2026',
    statut: 'en_attente',
    permis: 'C',
    vehicule: 'Nissan NP300 2019',
    plaque: 'T-4567-G',
    assurance: true,
    visiteTechnique: false,
    anciennete: '5 ans',
    documents: ['Permis C', 'Carte grise', 'Assurance'],
  },
  {
    id: 'DEM-FR-003',
    nom: 'Miora Andriamampianina',
    email: 'miora.a@outlook.mg',
    telephone: '+261 32 89 012 34',
    dateDemande: '26 Août 2026',
    statut: 'en_attente',
    permis: 'B',
    vehicule: 'Mitsubishi L200 2021',
    plaque: 'T-2345-H',
    assurance: true,
    visiteTechnique: true,
    anciennete: '2 ans',
    documents: ['Permis B', 'Carte grise', 'Assurance', 'Visite technique'],
  },
]

const statutConfig = {
  en_attente: { label: 'EN ATTENTE', bg: '#F7F7F8', color: '#8A8A92', border: '#ECECEC' },
}

export default function FreelancesDemandesPage({ onNavigate }) {
  const [selectedDemande, setSelectedDemande] = useState(null)
  const [showRefusModal, setShowRefusModal] = useState(false)
  const [motifRefus, setMotifRefus] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-display-md" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 700 }}>
            Demandes de chauffeurs freelance
          </h1>
          <p className="font-body text-body-md mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
            {demandes.length} demande{demandes.length > 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {demandes.map((d) => (
          <div key={d.id} className="rounded-xl border p-5 transition-all hover:shadow-sm" style={{ borderColor: '#ECECEC', backgroundColor: '#FFFFFF' }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#F7F7F8' }}>
                  <span className="material-symbols-outlined text-[24px]" style={{ color: '#E8433D' }}>hail</span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-body-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E' }}>{d.nom}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: statutConfig[d.statut].bg, color: statutConfig[d.statut].color, border: `1px solid ${statutConfig[d.statut].border}` }}>
                      {statutConfig[d.statut].label}
                    </span>
                  </div>
                  <p className="font-body text-body-sm mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                    {d.email} — {d.telephone}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">directions_car</span>
                      {d.vehicule}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      Permis {d.permis}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {d.anciennete} d'expérience
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 md:flex-row md:items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedDemande(d)
                      setShowRefusModal(true)
                    }}
                    className="rounded-lg border px-4 py-2 text-[13px] font-bold transition-all hover:opacity-80"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#E8433D', color: '#E8433D', backgroundColor: 'transparent' }}
                  >
                    Refuser
                  </button>
                  <button
                    className="rounded-lg px-4 py-2 text-[13px] font-bold text-white transition-all hover:opacity-90"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}
                  >
                    Approuver
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: '#ECECEC' }}>
              <span className="font-label text-label-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>Documents joints :</span>
              {d.documents.map((doc) => (
                <span key={doc} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#F7F7F8', color: '#8A8A92' }}>
                  {doc}
                  {(doc === 'Assurance' && d.assurance) && <span className="material-symbols-outlined text-[12px]" style={{ color: '#1A1A1E' }}>check_circle</span>}
                  {(doc === 'Visite technique' && d.visiteTechnique) && <span className="material-symbols-outlined text-[12px]" style={{ color: '#1A1A1E' }}>check_circle</span>}
                  {(doc === 'Visite technique' && !d.visiteTechnique) && <span className="material-symbols-outlined text-[12px]" style={{ color: '#E8433D' }}>error</span>}
                </span>
              ))}
              <span className="font-label text-label-sm ml-auto" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#8A8A92' }}>
                {d.id} — {d.dateDemande}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showRefusModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowRefusModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 pb-10 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="mx-auto mb-6 h-1 w-10 rounded-full" style={{ backgroundColor: '#ECECEC' }} />
            <h3 className="font-display text-headline-md mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#1A1A1E', fontWeight: 600 }}>
              Refuser la demande
            </h3>
            <p className="font-body text-body-sm mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#8A8A92' }}>
              {selectedDemande?.nom} — Motif du refus obligatoire
            </p>
            <textarea
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              className="mb-4 w-full rounded-xl border p-4 font-body text-body-md outline-none focus:ring-2 focus:ring-red-500/20"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderColor: '#ECECEC', backgroundColor: '#F7F7F8', color: '#1A1A1E' }}
              placeholder="Ex: Documents manquants, véhicule non conforme..."
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefusModal(false)}
                className="flex-1 rounded-lg border py-3 text-[13px] font-bold transition-all hover:opacity-80"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#ECECEC', color: '#8A8A92' }}
              >
                Annuler
              </button>
              <button
                className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white transition-all hover:opacity-90"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", backgroundColor: '#E8433D' }}
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
