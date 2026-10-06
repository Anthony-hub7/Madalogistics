import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { missionsService } from '../../services/missionsService'
import ConfirmationLivraison from '../../components/ConfirmationLivraison'
import SignalerIncidentModal from '../../components/SignalerIncidentModal'

const statusLabels = {
  AFFECTE: { text: 'À PRENDRE EN CHARGE', color: 'text-[#E8433D]', bg: 'bg-[#E8433D]/10' },
  EN_TRANSIT: { text: 'EN COURS', color: 'text-[#1A1A1E]', bg: 'bg-[#F7F7F8] border border-[#1A1A1E]' },
  LIVRE: { text: 'TERMINÉE', color: 'text-[#1A1A1E]', bg: 'bg-[#ECECEC]/50' },
}

const statusIcons = {
  AFFECTE: { icon: 'assignment_turned_in', bg: 'bg-[#E8433D] shadow-lg', iconColor: 'text-white', fill: 0 },
  EN_TRANSIT: { icon: 'package_2', bg: 'bg-[#E8433D] shadow-lg', iconColor: 'text-white', fill: 1 },
  LIVRE: { icon: 'check_circle', bg: 'bg-[#1A1A1E]', iconColor: 'text-white', fill: 1 },
}

export default function MesMissionsPage() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('en_cours')
  const [takingChargeId, setTakingChargeId] = useState(null)
  const [confirmingMission, setConfirmingMission] = useState(null)
  const [incidentSacId, setIncidentSacId] = useState(null)
  const [incidentSucces, setIncidentSucces] = useState(null)

  const fetchMissions = useCallback(async () => {
    try {
      const data = await missionsService.lister()
      setMissions(data || [])
    } catch (err) {
      console.error('Erreur chargement missions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  const filtered = missions.filter(m => {
    if (filter === 'en_cours') return m.statut !== 'LIVRE'
    if (filter === 'terminees') return m.statut === 'LIVRE'
    return true
  })

  const activeCount = missions.filter(m => m.statut !== 'LIVRE').length

  const handleTakeCharge = async (sacId) => {
    setTakingChargeId(sacId)
    try {
      await missionsService.prendreEnCharge(sacId)
      // Recharger la liste
      await fetchMissions()
    } catch (err) {
      console.error('Erreur prise en charge:', err)
      alert(err.message || 'Erreur lors de la prise en charge')
    } finally {
      setTakingChargeId(null)
    }
  }

  const handleConfirmDelivery = async () => {
    setConfirmingMission(null)
    await fetchMissions()
  }

  const currentMission = missions.find(m => m.sacId === confirmingMission)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-[#E8433D]">sync</span>
        <span className="ml-3 font-body text-[#8A8A92]">Chargement des missions...</span>
      </div>
    )
  }

  return (
    <>
      <section className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="font-label-md text-label-md text-[#E8433D] uppercase tracking-wider font-bold">Aujourd'hui</span>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-[#1A1A1E]">Mes missions</h2>
          </div>
          <div className="bg-[#E8433D] text-white px-3 py-1 rounded-full font-label-md text-label-md font-bold shadow-sm">
            {activeCount} Mission{activeCount > 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {[
            { key: 'en_cours', label: 'En cours' },
            { key: 'terminees', label: 'Terminées' },
            { key: 'toutes', label: 'Toutes' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all border-2 font-bold
                ${filter === f.key
                  ? 'bg-[#E8433D] border-[#E8433D] text-white shadow-sm'
                  : 'bg-white border-[#ECECEC] text-[#8A8A92] hover:border-[#1A1A1E] hover:text-[#1A1A1E]'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {incidentSucces && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600">warning</span>
          <p className="font-body-sm text-body-sm text-amber-800 flex-1">{incidentSucces}</p>
          <button onClick={() => setIncidentSucces(null)} aria-label="Fermer" className="text-amber-500">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Resume de tournee pour les missions EN_TRANSIT */}
      {missions.some(m => m.statut === 'EN_TRANSIT') && (
        <div className="mb-6 bg-[#1A1A1E] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="font-headline-md text-headline-md mb-2">Mission active</h4>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[#E8433D] font-label-sm text-label-sm uppercase font-bold">Distance Totale</p>
                <p className="font-headline-lg-mobile text-headline-lg-mobile tabular-nums">
                  {missions.find(m => m.statut === 'EN_TRANSIT')?.distanceTotaleKm
                    ? `${missions.find(m => m.statut === 'EN_TRANSIT').distanceTotaleKm} km`
                    : '—'}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-[#E8433D]/20 flex items-center justify-center border-2 border-[#E8433D]/40">
                <span className="material-symbols-outlined text-[#E8433D] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                <p className="font-label-sm text-label-sm opacity-70 uppercase">Stops</p>
                <p className="font-label-md text-label-md font-bold tabular-nums">
                  {missions.find(m => m.statut === 'EN_TRANSIT')?.etapes?.length || 0}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                <p className="font-label-sm text-label-sm opacity-70 uppercase">Colis</p>
                <p className="font-label-md text-label-md font-bold tabular-nums">
                  {missions.find(m => m.statut === 'EN_TRANSIT')?.nbColis || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E8433D]/15 rounded-full blur-2xl" />
        </div>
      )}

      <div className="relative space-y-6">
        {filtered.map((mission, index) => {
          const isLast = index === filtered.length - 1
          const sIcon = statusIcons[mission.statut] || statusIcons.AFFECTE
          const sLabel = statusLabels[mission.statut] || statusLabels.AFFECTE
          const taking = takingChargeId === mission.sacId

          return (
            <article key={mission.sacId} className="relative">
              {!isLast && (
                <div className="absolute left-7 top-14 bottom-[-2rem] w-0.5 border-l-2 border-dashed border-[#ECECEC]" />
              )}
              <div className="flex gap-4">
                <div className={`relative z-10 w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl ring-4 ring-[#F7F7F8] transition-transform ${sIcon.bg}`}>
                  <span className={`material-symbols-outlined text-2xl ${sIcon.iconColor}`} style={{ fontVariationSettings: `'FILL' ${sIcon.fill}` }}>
                    {taking ? 'sync' : sIcon.icon}
                  </span>
                </div>

                <div className={`flex-grow rounded-xl p-5 shadow-sm transition-all border
                  ${mission.statut === 'EN_TRANSIT'
                    ? 'bg-white backdrop-blur-sm border-l-4 border-l-[#E8433D] border border-[#ECECEC]'
                    : mission.statut === 'LIVRE'
                    ? 'bg-[#F7F7F8]/60 backdrop-blur-sm opacity-70 border border-[#ECECEC]'
                    : 'bg-white backdrop-blur-sm border border-[#ECECEC] hover:border-[#E8433D]/40'
                  }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-label-sm text-label-sm bg-[#F7F7F8] text-[#8A8A92] px-2 py-0.5 rounded font-bold font-stamp border border-[#ECECEC]">
                      SAC-{mission.sacId?.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`font-label-sm text-label-sm font-bold font-stamp flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 tracking-wide ${sLabel.color} ${sLabel.bg}`}>
                      {mission.statut === 'EN_TRANSIT' && <span className="w-2 h-2 rounded-full bg-[#E8433D] animate-pulse" />}
                      {sLabel.text}
                    </span>
                  </div>

                  <h3 className="font-headline-md text-headline-md text-[#1A1A1E] mb-1 font-bold">
                    {mission.hubNom || 'Hub'}
                  </h3>

                  <div className="flex items-start gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#8A8A92] mt-0.5 text-lg">local_shipping</span>
                    <p className="font-body-sm text-body-sm text-[#8A8A92] leading-tight">
                      {mission.immatriculation || 'Véhicule non assigné'} — {mission.marqueModele || ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#F7F7F8] rounded-lg p-2.5 border-2 border-[#ECECEC]">
                      <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold tracking-wider">Poids</p>
                      <p className="font-body-md text-body-md font-bold text-[#1A1A1E] tabular-nums">
                        {mission.poidsTotalKg ? `${mission.poidsTotalKg} kg` : '—'}
                      </p>
                    </div>
                    <div className="bg-[#F7F7F8] rounded-lg p-2.5 border-2 border-[#ECECEC]">
                      <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold tracking-wider">Volume</p>
                      <p className="font-body-md text-body-md font-bold text-[#1A1A1E] tabular-nums">
                        {mission.volumeTotalM3 ? `${mission.volumeTotalM3} m³` : '—'}
                      </p>
                    </div>
                    <div className="bg-[#F7F7F8] rounded-lg p-2.5 border-2 border-[#ECECEC]">
                      <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold tracking-wider">Colis</p>
                      <p className="font-body-md text-body-md font-bold text-[#1A1A1E] tabular-nums">
                        {mission.nbColis || 0}
                      </p>
                    </div>
                    <div className="bg-[#F7F7F8] rounded-lg p-2.5 border-2 border-[#ECECEC]">
                      <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold tracking-wider">Distance</p>
                      <p className="font-body-md text-body-md font-bold text-[#1A1A1E] tabular-nums">
                        {mission.distanceTotaleKm ? `${mission.distanceTotaleKm} km` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {mission.statut === 'AFFECTE' && (
                      <button
                        onClick={() => handleTakeCharge(mission.sacId)}
                        disabled={taking}
                        className="flex-1 bg-[#E8433D] text-white py-3 rounded-xl font-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm disabled:opacity-50">
                        {taking ? (
                          <>
                            <span className="material-symbols-outlined animate-spin">sync</span>
                            Prise en charge...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined">navigation</span>
                            Prendre en charge
                          </>
                        )}
                      </button>
                    )}
                    {mission.statut === 'EN_TRANSIT' && (
                      <button
                        onClick={() => navigate(`/driver/ma_tournee/${mission.sacId}`)}
                        className="flex-1 bg-[#E8433D] text-white py-3 rounded-xl font-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm">
                        <span className="material-symbols-outlined">route</span>
                        Ma tournée
                      </button>
                    )}
                    {(mission.statut === 'AFFECTE' || mission.statut === 'EN_TRANSIT') && (
                      <button
                        onClick={() => setIncidentSacId(mission.sacId)}
                        aria-label="Signaler un incident"
                        title="Signaler un incident (panne, route coupée...)"
                        className="px-3 py-3 rounded-xl border-2 border-amber-300 text-[#B7791F] bg-white flex items-center justify-center gap-1.5 font-label-md font-bold active:scale-[0.98]">
                        <span className="material-symbols-outlined">warning</span>
                        Incident
                      </button>
                    )}
                    {mission.statut === 'LIVRE' && (
                      <div className="flex items-center gap-2 text-[#1A1A1E] py-3">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="font-label-md text-label-md font-bold uppercase tracking-wide">Terminée</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-[#ECECEC] bg-white">
          <span className="material-symbols-outlined text-5xl opacity-30 text-[#8A8A92]">inventory_2</span>
          <p className="font-body-md text-body-md mt-3 text-[#8A8A92]">Aucune mission dans cette catégorie</p>
          <button onClick={() => navigate('/driver/missions_proposees')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#E8433D] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[18px]">inbox_customize</span>
            Voir missions proposées
          </button>
        </div>
      )}

      {incidentSacId && (
        <SignalerIncidentModal
          sacId={incidentSacId}
          onClose={() => setIncidentSacId(null)}
          onSuccess={setIncidentSucces}
        />
      )}

      {confirmingMission && currentMission && (
        <ConfirmationLivraison
          delivery={{
            id: currentMission.sacId,
            client: currentMission.hubNom,
            address: currentMission.etapes?.[0]?.adresseLivraison || '',
          }}
          sacId={currentMission.sacId}
          etapes={currentMission.etapes}
          onConfirm={handleConfirmDelivery}
          onClose={() => setConfirmingMission(null)}
        />
      )}
    </>
  )
}
