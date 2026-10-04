import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { missionsService } from '../../services/missionsService'
import ConfirmationLivraison from '../../components/ConfirmationLivraison'

const statusSteps = [
  { key: 'en_preparation', label: 'En préparation', icon: 'inventory_2' },
  { key: 'en_route', label: 'En route', icon: 'local_shipping' },
  { key: 'arrive', label: 'Arrivé', icon: 'location_on' },
  { key: 'livre', label: 'Livré', icon: 'check_circle' },
]

function DetailLivraisonPage() {
  const { sacId } = useParams()
  const navigate = useNavigate()
  const [mission, setMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const fetchMission = useCallback(async () => {
    try {
      const data = await missionsService.detail(sacId)
      setMission(data)
    } catch (err) {
      console.error('Erreur chargement mission:', err)
    } finally {
      setLoading(false)
    }
  }, [sacId])

  useEffect(() => {
    fetchMission()
  }, [fetchMission])

  const handleConfirmDelivery = async () => {
    setConfirming(false)
    await fetchMission()
    navigate('/driver/missions', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-[#E8433D]">sync</span>
        <span className="ml-3 font-body text-[#8A8A92]">Chargement...</span>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-5xl text-[#8A8A92]">error</span>
        <p className="font-body-md text-[#8A8A92] mt-3">Mission introuvable</p>
        <button onClick={() => navigate('/driver/missions')}
          className="mt-4 px-4 py-2 rounded-lg border-2 border-[#E8433D] text-[#E8433D] font-bold">
          Retour aux missions
        </button>
      </div>
    )
  }

  const etapes = mission.etapes || []
  const nbEtapesTerminees = etapes.filter(e => e.dateHeureReelle).length
  const idx = mission.statut === 'LIVRE' ? 3 : mission.statut === 'EN_TRANSIT' ? 1 : 0

  return (
    <>
      <div className="pb-32">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Destinataire</p>
              <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
                {etapes[0]?.clientNom || mission.hubNom}
              </h2>
              <div className="flex items-start gap-2 text-on-surface-variant mt-2">
                <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
                <p className="font-body-md text-body-md">
                  {etapes[0]?.adresseLivraison || 'Adresse non renseignée'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/driver/ma_tournee/${mission.sacId}`)}
              className="bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 px-6 py-4 rounded-xl active:scale-95 transition-transform shadow-sm">
              <span className="material-symbols-outlined">route</span>
              <span>Voir ma tournée</span>
            </button>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <h3 className="font-label-md text-label-md text-outline uppercase px-1">Progression</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statusSteps.map((step, i) => {
              const isCompleted = i < idx
              const isCurrent = i === idx

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                    isCompleted
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : isCurrent
                      ? 'border-primary bg-primary-container/20 text-primary shadow-md ring-2 ring-primary/20'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${
                    isCompleted
                      ? 'bg-secondary text-on-secondary'
                      : isCurrent
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-outline'
                  }`}>
                    <span className="material-symbols-outlined">
                      {isCompleted ? 'check_circle' : step.icon}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-label-md text-label-md font-bold">{step.label}</p>
                    <p className="font-body-sm text-body-sm">
                      {isCompleted ? 'Validé' : isCurrent ? 'En cours' : 'À venir'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-label-md text-label-md text-outline uppercase">
              Étapes ({etapes.length})
            </h3>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {nbEtapesTerminees}/{etapes.length} terminées
            </span>
          </div>
          <div className="space-y-3">
            {etapes.map((etape) => (
              <div key={etape.etapeId} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between ${
                etape.dateHeureReelle ? 'opacity-70' : ''
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-lg flex-shrink-0 ${
                    etape.dateHeureReelle ? 'bg-secondary/10' : 'bg-surface-container'
                  }`}>
                    <span className={`material-symbols-outlined ${
                      etape.dateHeureReelle ? 'text-secondary' : 'text-outline'
                    }`}>
                      {etape.typeEtape === 'COLLECTE' ? 'inventory_2' : 'local_shipping'}
                    </span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-semibold">
                      {etape.clientNom || 'Destinataire'} — Étape {etape.ordre}
                    </p>
                    <p className="font-label-sm text-label-sm text-outline">
                      {etape.adresseLivraison || etape.adresseCollecte || 'Adresse non renseignée'}
                    </p>
                    {etape.photoPreuvePresente && (
                      <span className="inline-flex items-center gap-1 mt-1 text-secondary font-label-sm text-[10px] font-bold">
                        <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                        Photo OK
                      </span>
                    )}
                  </div>
                </div>
                <span className={`font-label-sm px-2 py-1 rounded flex-shrink-0 ${
                  etape.dateHeureReelle ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-outline'
                }`}>
                  {etape.dateHeureReelle ? '✓' : etape.ordre}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-label-md text-label-md text-outline uppercase">
              Colis ({mission.nbColis})
            </h3>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {mission.poidsTotalKg ? `${mission.poidsTotalKg} kg` : '—'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
              <p className="font-label-sm text-[10px] text-[#8A8A92] uppercase">Poids total</p>
              <p className="font-body-sm font-bold text-on-surface">{mission.poidsTotalKg || '—'} kg</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
              <p className="font-label-sm text-[10px] text-[#8A8A92] uppercase">Volume total</p>
              <p className="font-body-sm font-bold text-on-surface">{mission.volumeTotalM3 || '—'} m³</p>
            </div>
          </div>
        </section>

        <section className="mt-6 h-48 rounded-xl overflow-hidden border border-outline-variant relative">
          <div className="w-full h-full bg-gradient-to-br from-primary-fixed-dim/20 via-surface-container-high to-secondary-fixed-dim/20 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-primary/30">map</span>
              <p className="font-label-sm text-label-sm text-outline mt-2">Carte interactive</p>
            </div>
          </div>
          {mission.distanceTotaleKm && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-4">
              <div className="bg-surface-container-lowest/90 backdrop-blur-md p-3 rounded-lg flex items-center gap-3 w-full">
                <span className="material-symbols-outlined text-primary">my_location</span>
                <span className="font-label-md text-label-md text-on-surface">
                  {mission.distanceTotaleKm} km — {mission.hubNom}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {confirming && (
        <ConfirmationLivraison
          delivery={{
            id: mission.sacId,
            client: mission.hubNom,
            address: etapes[0]?.adresseLivraison || '',
          }}
          sacId={mission.sacId}
          etapes={etapes}
          onConfirm={handleConfirmDelivery}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  )
}

export default DetailLivraisonPage
