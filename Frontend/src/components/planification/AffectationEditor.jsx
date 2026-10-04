import { useState, useEffect, useRef, useMemo } from 'react'
import { affectationService } from '../../services/affectationService'
import AffectationCalendar from './AffectationCalendar'

const TYPE_VEHICULE_LABELS = {
  FOURGON: 'Fourgon', CAMION: 'Camion', SEMI_REMORQUE: 'Semi-remorque',
  PICKUP: 'Pickup', MINIBUS: 'Minibus', BUS: 'Bus', CITERNE: 'Citerne', PLATEAU: 'Plateau',
}

export default function AffectationEditor({ preview, onValider, onReculer, loading }) {
  const [decisions, setDecisions] = useState(() =>
    preview.sacs.map(s => ({
      sacId: s.sacId,
      chauffeurId: s.chauffeurIdAffecte || null,
      vehiculeId: s.vehiculeIdAffecte || null,
    }))
  )
  const [simResults, setSimResults] = useState({})
  const [simulating, setSimulating] = useState(false)
  const [searchChauffeur, setSearchChauffeur] = useState({})
  const [searchVehicule, setSearchVehicule] = useState({})
  const [calendarChauffeur, setCalendarChauffeur] = useState(null)
  const debounceRef = useRef(null)

  const chauffeurs = preview.chauffeursDisponibles || []
  const vehicules = preview.vehiculesDisponibles || []

  const handleAssign = (sacId, field, value) => {
    setDecisions(prev => prev.map(d =>
      d.sacId === sacId ? { ...d, [field]: value || null } : d
    ))
  }

  useEffect(() => {
    const hasAny = decisions.some(d => d.chauffeurId && d.vehiculeId)
    if (!hasAny) { setSimResults({}); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSimulating(true)
      try {
        const result = await affectationService.simuler(preview.hubId, decisions.filter(d => d.chauffeurId && d.vehiculeId))
        const map = {}
        for (const r of (result.resultats || [])) { map[r.sacId] = r }
        setSimResults(map)
      } catch { setSimResults({}) }
      finally { setSimulating(false) }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [decisions, preview.hubId])

  const isValide = useMemo(() => {
    return decisions.every(d => {
      if (!d.chauffeurId || !d.vehiculeId) return true
      const r = simResults[d.sacId]
      return r && r.autorise
    })
  }, [decisions, simResults])

  const filledCount = decisions.filter(d => d.chauffeurId && d.vehiculeId).length

  const handleValider = () => {
    if (filledCount === 0) return
    onValider(decisions.filter(d => d.chauffeurId && d.vehiculeId))
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 grid grid-cols-3 gap-4">
        <div><span className="font-medium">{preview.sacs.length}</span> sacs à affecter</div>
        <div><span className="font-medium">{chauffeurs.length}</span> chauffeurs disponibles</div>
        <div><span className="font-medium">{vehicules.length}</span> véhicules disponibles</div>
      </div>

      <div className="space-y-6">
        {preview.sacs.map((sac, i) => {
          const decision = decisions.find(d => d.sacId === sac.sacId)
          const assigned = decision?.chauffeurId && decision?.vehiculeId
          const sim = simResults[sac.sacId]
          const autorise = sim?.autorise
          const raisons = sim?.raisons || []
          const poids = sac.poidsKg || 0
          const volume = sac.volumeM3 || 0

          let borderColor = 'border-gray-200'
          let bgColor = 'bg-white'
          if (assigned && autorise === true) { borderColor = 'border-green-300'; bgColor = 'bg-green-50/50' }
          else if (assigned && autorise === false) { borderColor = 'border-red-300'; bgColor = 'bg-red-50/50' }

          const filteredChauffeurs = chauffeurs.filter(ch => {
            const q = (searchChauffeur[sac.sacId] || '').toLowerCase()
            return !q || ch.nom?.toLowerCase().includes(q) || ch.prenom?.toLowerCase().includes(q)
          })

          const selectedCh = chauffeurs.find(ch => ch.chauffeurId === decision?.chauffeurId)
          const filteredVehicules = vehicules.filter(v => {
            const q = (searchVehicule[sac.sacId] || '').toLowerCase()
            if (selectedCh && v.chauffeurProprietaireId === selectedCh.chauffeurId) return true
            return !q || v.immatriculation?.toLowerCase().includes(q) || v.type?.toLowerCase().includes(q)
          })

          return (
            <div key={sac.sacId} className={`rounded-xl border-2 p-5 transition-all ${borderColor} ${bgColor}`}>
              {/* Header sac */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    assigned && autorise === true ? 'bg-green-100 text-green-600'
                    : assigned && autorise === false ? 'bg-red-100 text-red-500'
                    : 'bg-blue-50 text-blue-500'
                  }`}>
                    <span className="material-symbols-outlined">
                      {assigned && autorise === true ? 'check_circle'
                        : assigned && autorise === false ? 'error'
                        : 'inventory_2'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Sac {i + 1}</h4>
                    <p className="text-xs text-gray-500">
                      {sac.nbColis} colis · {sac.categorieDominante || 'STANDARD'} · {sac.tauxRemplissage?.toFixed(0) || 0}% rempli
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {poids > 0 && <>{poids.toFixed(1)} kg</>}
                      {poids > 0 && volume > 0 && <span className="mx-1">·</span>}
                      {volume > 0 && <>{volume.toFixed(2)} m³</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assigned && autorise === true && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Compatible</span>}
                  {assigned && autorise === false && <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Incompatible</span>}
                  {simulating && assigned && !sim && <span className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
                </div>
              </div>

              {/* Raisons d'incompatibilité */}
              {assigned && autorise === false && raisons.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-bold text-red-800 mb-1">Raison(s) :</p>
                  <ul className="text-xs text-red-700 space-y-0.5">
                    {raisons.map((r, ri) => <li key={ri}>• {r}</li>)}
                  </ul>
                </div>
              )}

              {/* Sélection chauffeur en cards */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chauffeur</label>
                <input
                  type="text"
                  placeholder="Rechercher un chauffeur..."
                  value={searchChauffeur[sac.sacId] || ''}
                  onChange={e => setSearchChauffeur(prev => ({ ...prev, [sac.sacId]: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredChauffeurs.map(ch => {
                    const isSelected = decision?.chauffeurId === ch.chauffeurId
                    return (
                      <button
                        key={ch.chauffeurId}
                        onClick={() => handleAssign(sac.sacId, 'chauffeurId', isSelected ? null : ch.chauffeurId)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {ch.nom?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{ch.nom}</p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {ch.permis?.join(', ') || '—'}
                          </p>
                        </div>
                        {isSelected && <span className="material-symbols-outlined text-blue-500 text-lg">check_circle</span>}
                      </button>
                    )
                  })}
                  {filteredChauffeurs.length === 0 && <p className="text-xs text-gray-400 col-span-2">Aucun chauffeur trouvé</p>}
                </div>
                {decision?.chauffeurId && (
                  <button
                    onClick={() => setCalendarChauffeur(chauffeurs.find(ch => ch.chauffeurId === decision.chauffeurId))}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    Voir le calendrier de disponibilité
                  </button>
                )}
              </div>

              {/* Sélection véhicule en cards */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Véhicule</label>
                <input
                  type="text"
                  placeholder="Rechercher un véhicule..."
                  value={searchVehicule[sac.sacId] || ''}
                  onChange={e => setSearchVehicule(prev => ({ ...prev, [sac.sacId]: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredVehicules.map(v => {
                    const isSelected = decision?.vehiculeId === v.vehiculeId
                    const isPerso = v.vehiculePerso
                    const isProprioMatch = selectedCh && v.chauffeurProprietaireId === selectedCh.chauffeurId
                    return (
                      <button
                        key={v.vehiculeId}
                        onClick={() => handleAssign(sac.sacId, 'vehiculeId', isSelected ? null : v.vehiculeId)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className="material-symbols-outlined text-lg">local_shipping</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="license-plate-tag text-[10px]">{v.immatriculation}</span>
                            {isPerso && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Son véhicule</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {TYPE_VEHICULE_LABELS[v.type] || v.type} · {v.capacitePoidsKg}kg · {v.capaciteVolumeM3}m³
                          </p>
                        </div>
                        {isSelected && <span className="material-symbols-outlined text-blue-500 text-lg">check_circle</span>}
                      </button>
                    )
                  })}
                  {filteredVehicules.length === 0 && <p className="text-xs text-gray-400 col-span-2">Aucun véhicule compatible trouvé</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button onClick={onReculer} className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Reculer
        </button>
        <div className="flex items-center gap-3">
          {simulating && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <span className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
              Vérification...
            </span>
          )}
          <button
            onClick={handleValider}
            disabled={loading || !isValide || filledCount === 0}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <span className="material-symbols-outlined">check_circle</span>
            )}
            Valider l'affectation ({filledCount}/{preview.sacs.length})
          </button>
        </div>
      </div>

      {calendarChauffeur && (
        <AffectationCalendar
          chauffeurId={calendarChauffeur.chauffeurId}
          chauffeurNom={calendarChauffeur.nom}
          onClose={() => setCalendarChauffeur(null)}
        />
      )}
    </div>
  )
}
