import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { missionsService } from '../../services/missionsService'
import ConfirmationLivraison from '../../components/ConfirmationLivraison'
import SignalerIncidentModal from '../../components/SignalerIncidentModal'

/**
 * Ecran "Ma tournee" — mission EN_TRANSIT active.
 * Affiche les etapes ordonnees, le vehicule, la progression.
 * Bouton "Valider la livraison" par etape (photo obligatoire).
 * Bouton "Cloturer" global si besoin de cloturer toutes les etapes d'un coup.
 */
export default function MaTourneePage() {
  const { sacId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [mission, setMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  // Etape en cours de validation
  const [validatingEtape, setValidatingEtape] = useState(null)
  const [validatingPhoto, setValidatingPhoto] = useState(null) // { file, preview }
  const [validatingError, setValidatingError] = useState(null)
  const [validatingLoading, setValidatingLoading] = useState(false)
  // Signalement d'incident véhicule
  const [incidentOuvert, setIncidentOuvert] = useState(false)
  const [incidentSucces, setIncidentSucces] = useState(null)

  const fetchMission = useCallback(async () => {
    try {
      if (!sacId) {
        const missions = await missionsService.lister()
        const enCours = missions.find(m => m.statut === 'EN_TRANSIT')
        if (enCours) {
          navigate(`/driver/ma_tournee/${enCours.sacId}`, { replace: true })
          return
        }
        setMission(null)
        return
      }
      const data = await missionsService.detail(sacId)
      setMission(data)
    } catch (err) {
      console.error('Erreur chargement mission:', err)
    } finally {
      setLoading(false)
    }
  }, [sacId, navigate])

  useEffect(() => {
    fetchMission()
  }, [fetchMission])

  const handleConfirmDelivery = async () => {
    setConfirming(false)
    await fetchMission()
    navigate('/driver/missions', { replace: true })
  }

  // --- Validation par etape ---
  const handleOpenValidation = (etape) => {
    setValidatingEtape(etape)
    setValidatingPhoto(null)
    setValidatingError(null)
  }

  const handlePhotoCapture = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      setValidatingError('Photo trop volumineuse (max 6 Mo)')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setValidatingPhoto({ file, preview: ev.target.result })
      setValidatingError(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleValiderEtape = async () => {
    if (!validatingEtape || !validatingPhoto) return
    setValidatingLoading(true)
    setValidatingError(null)
    try {
      const result = await missionsService.validerEtape(mission.sacId, validatingEtape.etapeId, {
        photo: validatingPhoto.file,
        signatureNom: null,
        notes: null,
      })
      setValidatingEtape(null)
      setValidatingPhoto(null)

      if (result.missionCloturee) {
        navigate('/driver/missions', { replace: true })
        return
      }
      // Rafraichir la mission pour afficher l'etape comme terminee
      await fetchMission()
    } catch (err) {
      setValidatingError(err.message || 'Erreur lors de la validation')
    } finally {
      setValidatingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-[#E8433D]">sync</span>
        <span className="ml-3 font-body text-[#8A8A92]">Chargement de la tournee...</span>
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
  const progression = etapes.length > 0 ? Math.round((nbEtapesTerminees / etapes.length) * 100) : 0

  // Etape LIVRAISON suivante a valider
  const nextLivraisonEtape = etapes.find(e => e.typeEtape === 'LIVRAISON' && !e.dateHeureReelle)

  return (
    <>
      <div className="pb-32">
        {/* Header mission */}
        <section className="bg-[#1A1A1E] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8433D] animate-pulse" />
              <span className="font-stamp text-[10px] uppercase font-bold tracking-widest text-[#E8433D]">
                EN COURS
              </span>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold mb-1">
              Ma tournee
            </h2>
            <p className="font-body text-sm text-white/70">
              {mission.hubNom} — {mission.immatriculation}
            </p>

            <div className="flex gap-4 mt-4">
              <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                <p className="font-label-sm text-label-sm opacity-70 uppercase">Distance</p>
                <p className="font-label-md text-label-md font-bold tabular-nums">
                  {mission.distanceTotaleKm ? `${mission.distanceTotaleKm} km` : '—'}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                <p className="font-label-sm text-label-sm opacity-70 uppercase">Etapes</p>
                <p className="font-label-md text-label-md font-bold tabular-nums">
                  {nbEtapesTerminees}/{etapes.length}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                <p className="font-label-sm text-label-sm opacity-70 uppercase">Colis</p>
                <p className="font-label-md text-label-md font-bold tabular-nums">
                  {mission.nbColis}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E8433D]/15 rounded-full blur-2xl" />
        </section>

        {/* Barre de progression */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold">Progression</span>
            <span className="font-label-sm text-label-sm text-[#E8433D] font-bold">{progression}%</span>
          </div>
          <div className="w-full h-2 bg-[#ECECEC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8433D] rounded-full transition-all duration-500"
              style={{ width: `${progression}%` }}
            />
          </div>
        </section>

        {/* Vehicule */}
        <section className="mb-6 bg-white rounded-xl border border-[#ECECEC] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F7F7F8] border border-[#ECECEC] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#1A1A1E]">local_shipping</span>
            </div>
            <div className="flex-1">
              <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold">Vehicule</p>
              <p className="font-body-md text-body-md font-bold text-[#1A1A1E]">
                {mission.immatriculation || '—'} — {mission.marqueModele || ''}
              </p>
            </div>
            {mission.typeVehicule && (
              <span className="font-stamp text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-[#ECECEC] text-[#8A8A92]">
                {mission.typeVehicule}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-[#F7F7F8] rounded-lg p-2.5 border border-[#ECECEC]">
              <p className="font-label-sm text-[10px] text-[#8A8A92] uppercase">Capacite poids</p>
              <p className="font-body-sm font-bold text-[#1A1A1E]">{mission.capacitePoidsKg || '—'} kg</p>
            </div>
            <div className="bg-[#F7F7F8] rounded-lg p-2.5 border border-[#ECECEC]">
              <p className="font-label-sm text-[10px] text-[#8A8A92] uppercase">Capacite volume</p>
              <p className="font-body-sm font-bold text-[#1A1A1E]">{mission.capaciteVolumeM3 || '—'} m3</p>
            </div>
          </div>
        </section>

        {/* Etapes */}
        <section>
          <h3 className="font-label-md text-label-md text-[#8A8A92] uppercase px-1 mb-4">Etapes de livraison</h3>
          <div className="relative space-y-4">
            {etapes.map((etape, index) => {
              const isTerminee = !!etape.dateHeureReelle
              const isNext = !isTerminee && etapes.slice(0, index).every(e => e.dateHeureReelle)
              const isLivraison = etape.typeEtape === 'LIVRAISON'

              return (
                <div key={etape.etapeId} className="relative">
                  {index < etapes.length - 1 && (
                    <div className={`absolute left-7 top-14 bottom-[-1rem] w-0.5 border-l-2 border-dashed ${
                      isTerminee ? 'border-[#1A1A1E]' : 'border-[#ECECEC]'
                    }`} />
                  )}
                  <div className="flex gap-4">
                    <div className={`relative z-10 w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl ring-4 ring-[#F7F7F8] ${
                      isTerminee ? 'bg-[#1A1A1E]' : isNext ? 'bg-[#E8433D] shadow-lg' : 'bg-[#ECECEC]'
                    }`}>
                      <span className={`material-symbols-outlined text-2xl ${
                        isTerminee ? 'text-white' : isNext ? 'text-white' : 'text-[#8A8A92]'
                      }`} style={{ fontVariationSettings: `'FILL' ${isTerminee ? 1 : 0}` }}>
                        {isTerminee ? 'check_circle' : isLivraison ? 'location_on' : 'inventory_2'}
                      </span>
                    </div>

                    <div className={`flex-grow rounded-xl p-4 shadow-sm border ${
                      isTerminee
                        ? 'bg-[#F7F7F8]/60 opacity-70 border border-[#ECECEC]'
                        : isNext
                        ? 'bg-white border-l-4 border-l-[#E8433D] border border-[#ECECEC]'
                        : 'bg-white border border-[#ECECEC]'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-stamp text-[10px] uppercase font-bold text-[#8A8A92]">
                          Etape {etape.ordre} — {etape.typeEtape}
                        </span>
                        {isTerminee && (
                          <span className="font-stamp text-[10px] uppercase font-bold text-[#1A1A1E] bg-[#ECECEC] px-2 py-0.5 rounded">
                            ✓ Terminee
                          </span>
                        )}
                      </div>

                      <p className="font-body-sm text-body-sm font-bold text-[#1A1A1E] mb-1">
                        {etape.clientNom || 'Destinataire'}
                      </p>
                      <p className="font-body-sm text-body-sm text-[#8A8A92] mb-2">
                        {etape.adresseLivraison || etape.adresseCollecte || 'Adresse non renseignee'}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {etape.poidsKg && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#F7F7F8] border border-[#ECECEC] px-2 py-1">
                            <span className="material-symbols-outlined text-[14px] text-[#8A8A92]">monitor_weight</span>
                            <span className="font-label-sm text-[10px] font-bold text-[#1A1A1E]">{etape.poidsKg} kg</span>
                          </span>
                        )}
                        {etape.volumeM3 && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#F7F7F8] border border-[#ECECEC] px-2 py-1">
                            <span className="material-symbols-outlined text-[14px] text-[#8A8A92]">inventory_2</span>
                            <span className="font-label-sm text-[10px] font-bold text-[#1A1A1E]">{etape.volumeM3} m3</span>
                          </span>
                        )}
                        {etape.photoPreuvePresente && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#1A1A1E] px-2 py-1">
                            <span className="material-symbols-outlined text-[14px] text-white">photo_camera</span>
                            <span className="font-label-sm text-[10px] font-bold text-white">Photo OK</span>
                          </span>
                        )}
                      </div>

                      {/* Bouton valider — etape LIVRAISON suivante */}
                      {isNext && isLivraison && mission.statut === 'EN_TRANSIT' && (
                        <button
                          onClick={() => handleOpenValidation(etape)}
                          className="w-full h-10 bg-[#E8433D] text-white rounded-lg font-body-md flex items-center justify-center gap-2 active:scale-95 transition-all duration-150">
                          <span className="material-symbols-outlined text-lg">photo_camera</span>
                          Valider la livraison
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Footer fixe — cloturer + carte + incident */}
      {mission.statut === 'EN_TRANSIT' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md px-margin-mobile pt-4 pb-8 border-t border-[#ECECEC]">
          {incidentSucces && (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">warning</span>
              <p className="font-body-sm text-body-sm text-amber-800">{incidentSucces}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/driver/carte_missions?sacId=${mission.sacId}`)}
              className="flex-1 h-12 bg-white text-[#1A1A1E] rounded-xl font-body-md flex items-center justify-center gap-2 border border-[#ECECEC] active:scale-95 transition-all duration-150">
              <span className="material-symbols-outlined text-[#E8433D]">map</span>
              Carte
            </button>
            <button
              onClick={() => setIncidentOuvert(true)}
              className="flex-1 h-12 bg-white text-[#B7791F] rounded-xl font-body-md flex items-center justify-center gap-2 border border-amber-300 active:scale-95 transition-all duration-150">
              <span className="material-symbols-outlined">warning</span>
              Incident
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="flex-[2] h-12 bg-[#E8433D] text-white rounded-xl font-headline-md flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all duration-150">
              <span className="material-symbols-outlined">photo_camera</span>
              Cloturer
            </button>
          </div>
        </div>
      )}

      {/* Modale signalement d'incident */}
      {incidentOuvert && (
        <SignalerIncidentModal
          sacId={mission.sacId}
          onClose={() => setIncidentOuvert(false)}
          onSuccess={(msg) => setIncidentSucces(msg)}
        />
      )}

      {/* Confirmation globale (cloturer toutes les etapes) */}
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

      {/* Mini-modal validation par etape */}
      {validatingEtape && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <header className="bg-surface/80 backdrop-blur-md flex items-center justify-between border-b border-outline-variant px-margin-mobile h-16 flex-shrink-0">
            <button onClick={() => { setValidatingEtape(null); setValidatingPhoto(null) }}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="font-label-md text-label-md">Annuler</span>
            </button>
            <h1 className="font-headline-md text-headline-md text-primary font-bold">Valider</h1>
            <div className="w-20" />
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-lg mx-auto px-margin-mobile py-6 space-y-5">
              {/* Infos etape */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                <span className="font-label-sm text-label-sm text-outline uppercase">Etape {validatingEtape.ordre}</span>
                <p className="font-body-md text-body-md font-bold text-on-surface mt-1">
                  {validatingEtape.clientNom || 'Destinataire'}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {validatingEtape.adresseLivraison || 'Adresse non renseignee'}
                </p>
                {validatingEtape.poidsKg && (
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
                    Poids : {validatingEtape.poidsKg} kg
                  </p>
                )}
              </div>

              {/* Photo */}
              <div className="space-y-3">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1">
                  Preuve visuelle <span className="text-error">*</span>
                </label>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={handleFileChange} />

                {validatingPhoto ? (
                  <div className="space-y-3">
                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-outline-variant shadow-sm bg-surface-container-low">
                      <img src={validatingPhoto.preview} alt="Preuve" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handlePhotoCapture}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container transition-all active:scale-[0.98]">
                        <span className="material-symbols-outlined">photo_camera</span>
                        <span className="font-label-md text-label-md">Reprendre</span>
                      </button>
                      <button onClick={() => setValidatingPhoto(null)}
                        className="flex items-center justify-center gap-2 py-3 px-5 border-2 border-error-container/50 rounded-xl text-error hover:bg-error-container/10 transition-all active:scale-[0.98]">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={handlePhotoCapture}
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container hover:border-primary/40 transition-all active:scale-[0.98] group">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                      <span className="material-symbols-outlined text-3xl text-primary/60 group-hover:text-primary">photo_camera</span>
                    </div>
                    <div className="text-center">
                      <p className="font-body-md text-body-md font-bold text-on-surface">Ajouter photo preuve</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Photo du colis livre</p>
                    </div>
                  </button>
                )}
              </div>

              {validatingError && (
                <div className="bg-error/5 border border-error/20 rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-error flex-shrink-0">error</span>
                  <p className="font-body-sm text-body-sm text-error">{validatingError}</p>
                </div>
              )}
            </div>
          </div>

          <footer className="bg-surface/80 backdrop-blur-md px-margin-mobile pt-4 pb-8 border-t border-outline-variant flex-shrink-0">
            <button
              onClick={handleValiderEtape}
              disabled={!validatingPhoto || validatingLoading}
              className="w-full h-14 bg-[#E8433D] text-white rounded-xl font-headline-md flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
              {validatingLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Validation...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Valider cette etape
                </>
              )}
            </button>
          </footer>
        </div>
      )}
    </>
  )
}
