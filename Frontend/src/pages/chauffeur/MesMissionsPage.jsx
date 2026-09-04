import { useState } from 'react'
import ConfirmationLivraison from '../../components/ConfirmationLivraison'

const mockMissions = [
  { id: 'ML-782', client: 'Pharmacie Centrale', address: "12 Rue de l'Indépendance, Analakely", weight: '120 kg', volume: '2.4 m³', status: 'en_cours', date: '26 Août 2026' },
  { id: 'ML-785', client: 'Supermaki Ivandry', address: "Lot II U 65, Route d'Analamahitsy", weight: '450 kg', volume: '5.1 m³', status: 'a_venir', date: '26 Août 2026' },
  { id: 'ML-789', client: 'Dépôt Logistique Est', address: 'Zone Industrielle, Ankorondrano', weight: '85 kg', volume: '1.2 m³', status: 'a_venir', date: '26 Août 2026' },
  { id: 'ML-770', client: 'Jovenna', address: 'Ampasambazaha, Ivato', weight: '320 kg', volume: '3.0 m³', status: 'livree', date: '25 Août 2026' },
  { id: 'ML-768', client: 'BASF Madagascar', address: 'Zone Industrielle, Antsirabe', weight: '800 kg', volume: '4.2 m³', status: 'livree', date: '24 Août 2026' },
]

const statusSteps = [
  { key: 'en_preparation', label: 'En préparation', icon: 'inventory_2' },
  { key: 'en_route', label: 'En route', icon: 'local_shipping' },
  { key: 'arrive', label: 'Arrivé', icon: 'location_on' },
  { key: 'livre', label: 'Livré', icon: 'check_circle' },
]

const statusIndex = { a_venir: 0, acceptee: 0, en_cours: 1, en_route: 1, arrive: 2, livree: 3 }

const statusLabels = {
  a_venir: { text: 'À VENIR', color: 'text-[#8A8A92]', bg: 'bg-[#ECECEC]' },
  acceptee: { text: 'ACCEPTÉE', color: 'text-[#E8433D]', bg: 'bg-[#E8433D]/10' },
  en_cours: { text: 'EN COURS', color: 'text-[#1A1A1E]', bg: 'bg-[#F7F7F8] border border-[#1A1A1E]' },
  livree: { text: 'TERMINÉE', color: 'text-[#1A1A1E]', bg: 'bg-[#ECECEC]/50' },
}

const statusIcons = {
  a_venir: { icon: 'schedule', bg: 'bg-[#ECECEC] border-2 border-[#ECECEC]', iconColor: 'text-[#8A8A92]', fill: 0 },
  acceptee: { icon: 'assignment_turned_in', bg: 'bg-[#E8433D] shadow-lg', iconColor: 'text-white', fill: 0 },
  en_cours: { icon: 'package_2', bg: 'bg-[#E8433D] shadow-lg', iconColor: 'text-white', fill: 1 },
  livree: { icon: 'check_circle', bg: 'bg-[#1A1A1E]', iconColor: 'text-white', fill: 1 },
}

export default function MesMissionsPage({ onNavigate }) {
  const [missions, setMissions] = useState(mockMissions)
  const [filter, setFilter] = useState('en_cours')
  const [statusSheetMission, setStatusSheetMission] = useState(null)
  const [confirmingMission, setConfirmingMission] = useState(null)

  const filtered = missions.filter(m => {
    if (filter === 'en_cours') return m.status !== 'livree'
    if (filter === 'terminees') return m.status === 'livree'
    return true
  })

  const activeCount = missions.filter(m => m.status !== 'livree').length

  const handleAccept = (id) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, status: 'acceptee' } : m))
  }

  const handleStart = (id) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, status: 'en_cours' } : m))
  }

  const handleStatusChange = (id, newStatus) => {
    if (newStatus === 'livre') {
      setConfirmingMission(id)
      setStatusSheetMission(null)
    } else {
      setMissions(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m))
      setStatusSheetMission(null)
    }
  }

  const handleConfirmDelivery = (id) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, status: 'livree' } : m))
    setConfirmingMission(null)
  }

  const currentMission = missions.find(m => m.id === confirmingMission)

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

      <div className="mb-6 bg-[#1A1A1E] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="font-headline-md text-headline-md mb-2">Résumé de tournée</h4>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[#E8433D] font-label-sm text-label-sm uppercase font-bold">Distance Totale</p>
              <p className="font-headline-lg-mobile text-headline-lg-mobile tabular-nums">18.4 km</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-[#E8433D]/20 flex items-center justify-center border-2 border-[#E8433D]/40">
              <span className="material-symbols-outlined text-[#E8433D] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
              <p className="font-label-sm text-label-sm opacity-70 uppercase">Stops</p>
              <p className="font-label-md text-label-md font-bold tabular-nums">5</p>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2 border border-white/10">
              <p className="font-label-sm text-label-sm opacity-70 uppercase">Durée est.</p>
              <p className="font-label-md text-label-md font-bold tabular-nums">1h05</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E8433D]/15 rounded-full blur-2xl" />
      </div>

      <div className="relative space-y-6">
        {filtered.map((mission, index) => {
          const isLast = index === filtered.length - 1
          const sIcon = statusIcons[mission.status] || statusIcons.a_venir
          const sLabel = statusLabels[mission.status] || statusLabels.a_venir

          return (
            <article key={mission.id} className="relative">
              {!isLast && (
                <div className="absolute left-7 top-14 bottom-[-2rem] w-0.5 border-l-2 border-dashed border-[#ECECEC]" />
              )}
              <div className="flex gap-4">
                <div className={`relative z-10 w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl ring-4 ring-[#F7F7F8] transition-transform ${sIcon.bg}`}>
                  <span className={`material-symbols-outlined text-2xl ${sIcon.iconColor}`} style={{ fontVariationSettings: `'FILL' ${sIcon.fill}` }}>
                    {sIcon.icon}
                  </span>
                </div>

                <div className={`flex-grow rounded-xl p-5 shadow-sm transition-all border
                  ${mission.status === 'en_cours'
                    ? 'bg-white backdrop-blur-sm border-l-4 border-l-[#E8433D] border border-[#ECECEC]'
                    : mission.status === 'livree'
                    ? 'bg-[#F7F7F8]/60 backdrop-blur-sm opacity-70 border border-[#ECECEC]'
                    : 'bg-white backdrop-blur-sm border border-[#ECECEC] hover:border-[#E8433D]/40'
                  }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-label-sm text-label-sm bg-[#F7F7F8] text-[#8A8A92] px-2 py-0.5 rounded font-bold font-stamp border border-[#ECECEC]">
                      #{mission.id}
                    </span>
                    <span className={`font-label-sm text-label-sm font-bold font-stamp flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 tracking-wide ${sLabel.color} ${sLabel.bg}`}>
                      {mission.status === 'en_cours' && <span className="w-2 h-2 rounded-full bg-[#E8433D] animate-pulse" />}
                      {sLabel.text}
                    </span>
                  </div>

                  <h3 className="font-headline-md text-headline-md text-[#1A1A1E] mb-1 font-bold">{mission.client}</h3>

                  <div className="flex items-start gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#8A8A92] mt-0.5 text-lg">location_on</span>
                    <p className="font-body-sm text-body-sm text-[#8A8A92] leading-tight">{mission.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#F7F7F8] rounded-lg p-2.5 border-2 border-[#ECECEC]">
                      <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold tracking-wider">Poids</p>
                      <p className="font-body-md text-body-md font-bold text-[#1A1A1E] tabular-nums">{mission.weight}</p>
                    </div>
                    <div className="bg-[#F7F7F8] rounded-lg p-2.5 border-2 border-[#ECECEC]">
                      <p className="font-label-sm text-label-sm text-[#8A8A92] uppercase font-bold tracking-wider">Volume</p>
                      <p className="font-body-md text-body-md font-bold text-[#1A1A1E] tabular-nums">{mission.volume}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {mission.status === 'a_venir' && (
                      <>
                        <button onClick={() => setMissions(prev => prev.filter(m => m.id !== mission.id))}
                          className="flex-1 border-2 border-[#ECECEC] text-[#8A8A92] py-3 rounded-xl font-label-md font-bold uppercase tracking-wider hover:border-[#1A1A1E] hover:text-[#1A1A1E] transition-all active:scale-[0.98]">
                          Refuser
                        </button>
                        <button onClick={() => handleAccept(mission.id)} className="flex-1 border-2 border-[#E8433D] bg-[#E8433D] text-white py-3 rounded-xl font-label-md font-bold uppercase tracking-wider hover:bg-[#B82823] hover:border-[#B82823] transition-all active:scale-[0.98] shadow-sm">
                          Accepter
                        </button>
                      </>
                    )}
                    {mission.status === 'acceptee' && (
                      <button onClick={() => handleStart(mission.id)} className="flex-1 bg-[#E8433D] text-white py-3 rounded-xl font-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm">
                        <span className="material-symbols-outlined">navigation</span>
                        Démarrer
                      </button>
                    )}
                    {mission.status === 'en_cours' && (
                      <button onClick={() => setStatusSheetMission(mission.id)} className="flex-1 bg-[#E8433D] text-white py-3 rounded-xl font-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm">
                        <span className="material-symbols-outlined">pending_actions</span>
                        Statut
                      </button>
                    )}
                    {mission.status === 'livree' && (
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
          <button onClick={() => onNavigate && onNavigate('missions_proposees')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#E8433D] bg-white px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#E8433D] hover:bg-[#E8433D]/10 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[18px]">inbox_customize</span>
            Voir missions proposées
          </button>
        </div>
      )}

      {statusSheetMission && (
        <>
          <div className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-[2px]" onClick={() => setStatusSheetMission(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 pb-10 shadow-2xl border-t-2 border-[#ECECEC]">
            <div className="w-10 h-1 bg-[#ECECEC] rounded-full mx-auto mb-6" />
            <h3 className="font-headline-md text-headline-md text-[#1A1A1E] mb-2 font-bold">Mettre à jour le statut</h3>
            <div className="space-y-1">
              {statusSteps.map((step, idx) => {
                const mission = missions.find(m => m.id === statusSheetMission)
                const currentIdx = statusIndex[mission?.status || 'a_venir']
                const isCompleted = idx < currentIdx
                const isCurrent = idx === currentIdx
                const isAvailable = idx === currentIdx + 1

                return (
                  <button
                    key={step.key}
                    disabled={!isAvailable && !isCurrent && !isCompleted}
                    onClick={() => handleStatusChange(statusSheetMission, step.key)}
                    className={`w-full flex items-center gap-4 py-4 px-3 rounded-xl transition-all
                      ${isCompleted ? 'text-[#1A1A1E] cursor-default' :
                        isCurrent ? 'text-[#E8433D] bg-[#E8433D]/5 cursor-default' :
                        isAvailable ? 'text-[#1A1A1E] hover:bg-[#F7F7F8] active:scale-[0.98] cursor-pointer' :
                        'text-[#8A8A92]/40 cursor-not-allowed'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2
                      ${isCompleted ? 'bg-[#1A1A1E] border-[#1A1A1E]' :
                        isCurrent ? 'bg-[#E8433D] border-[#E8433D]' :
                        isAvailable ? 'bg-[#F7F7F8] border-[#ECECEC]' :
                        'bg-[#F7F7F8]/50 border-[#ECECEC]/60'
                      }`}>
                      <span className={`material-symbols-outlined text-lg
                        ${isCompleted || isCurrent ? 'text-white' : isAvailable ? 'text-[#8A8A92]' : 'text-[#8A8A92]/40'
                        }`}>{step.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-body-md text-body-md ${isCurrent ? 'font-bold' : ''}`}>{step.label}</p>
                      {isCompleted && <p className="font-label-sm text-label-sm text-[#1A1A1E] font-bold">Terminé</p>}
                    </div>
                    {isCompleted && <span className="material-symbols-outlined text-[#1A1A1E]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-[#E8433D] animate-pulse flex-shrink-0" />}
                    {isAvailable && <span className="font-label-sm text-label-sm text-[#E8433D] font-bold tracking-wider uppercase flex-shrink-0">Sélectionner</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {confirmingMission && currentMission && (
        <ConfirmationLivraison
          delivery={currentMission}
          onConfirm={() => handleConfirmDelivery(confirmingMission)}
          onClose={() => setConfirmingMission(null)}
        />
      )}
    </>
  )
}
