import { useState, useEffect, useRef, useMemo } from 'react'
import { affectationService } from '../../services/affectationService'

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
    if (!hasAny) {
      setSimResults({})
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSimulating(true)
      try {
        const result = await affectationService.simuler(preview.hubId, decisions.filter(d => d.chauffeurId && d.vehiculeId))
        const map = {}
        for (const r of (result.resultats || [])) {
          map[r.sacId] = r
        }
        setSimResults(map)
      } catch {
        setSimResults({})
      } finally {
        setSimulating(false)
      }
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

  const handleValider = () => {
    const filled = decisions.filter(d => d.chauffeurId && d.vehiculeId)
    if (filled.length === 0) return
    onValider(filled)
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 grid grid-cols-3 gap-4">
        <div><span className="font-medium">{preview.sacs.length}</span> sacs à affecter</div>
        <div><span className="font-medium">{chauffeurs.length}</span> chauffeurs disponibles</div>
        <div><span className="font-medium">{vehicules.length}</span> véhicules disponibles</div>
      </div>

      <div className="space-y-3">
        {preview.sacs.map((sac, i) => {
          const decision = decisions.find(d => d.sacId === sac.sacId)
          const assigned = decision?.chauffeurId && decision?.vehiculeId
          const sim = simResults[sac.sacId]
          const autorise = sim?.autorise
          const motifRefus = sim?.motifRefus
          const poids = sac.poidsKg || 0
          const volume = sac.volumeM3 || 0

          const vehiculesCompatibles = vehicules.filter(v =>
            poids <= v.capacitePoidsKg && volume <= v.capaciteVolumeM3
          )
          const aucunCompatible = vehiculesCompatibles.length === 0 && vehicules.length > 0

          let borderColor = 'border-gray-200'
          let bgColor = 'bg-white'
          if (assigned && autorise === true) {
            borderColor = 'border-green-200'
            bgColor = 'bg-green-50'
          } else if (assigned && autorise === false) {
            borderColor = 'border-red-200'
            bgColor = 'bg-red-50'
          } else if (aucunCompatible) {
            borderColor = 'border-red-200'
            bgColor = 'bg-red-50'
          }

          return (
            <div key={sac.sacId} className={`rounded-xl border p-4 transition-all ${borderColor} ${bgColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${
                    assigned && autorise === true ? 'text-green-600'
                    : assigned && autorise === false ? 'text-red-500'
                    : aucunCompatible ? 'text-red-500'
                    : 'text-blue-600'
                  }`}>
                    {assigned && autorise === true ? 'check_circle'
                      : assigned && autorise === false ? 'error'
                      : aucunCompatible ? 'error'
                      : 'inventory_2'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900">Sac {i + 1}</h4>
                    <p className="text-xs text-gray-500">
                      {sac.nbColis} colis — {sac.categorieDominante || 'STANDARD'}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {poids > 0 && <>{poids.toFixed(1)} kg</>}
                      {poids > 0 && volume > 0 && <span className="mx-1">·</span>}
                      {volume > 0 && <>{volume.toFixed(2)} m³</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assigned && autorise === true && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Compatible</span>
                  )}
                  {assigned && autorise === false && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Incompatible</span>
                  )}
                  {aucunCompatible && !assigned && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Aucun véhicule</span>
                  )}
                  {simulating && assigned && !sim && (
                    <span className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                  )}
                </div>
              </div>

              {assigned && autorise === false && motifRefus && (
                <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-red-800 font-medium">{motifRefus}</p>
                </div>
              )}

              {aucunCompatible && (
                <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-red-800">
                    Aucun véhicule ne peut transporter ce sac ({poids.toFixed(1)} kg, {volume.toFixed(2)} m³).
                    Vérifiez la flotte de votre agence.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Chauffeur</label>
                  <select
                    value={decision?.chauffeurId || ''}
                    onChange={(e) => handleAssign(sac.sacId, 'chauffeurId', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Choisir --</option>
                    {chauffeurs.map(ch => (
                      <option key={ch.chauffeurId} value={ch.chauffeurId}>
                        {ch.nom} {ch.prenom} ({ch.permis?.join(', ') || '—'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Véhicule</label>
                  <select
                    value={decision?.vehiculeId || ''}
                    onChange={(e) => handleAssign(sac.sacId, 'vehiculeId', e.target.value)}
                    disabled={aucunCompatible}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {aucunCompatible ? 'Aucun véhicule compatible' : '-- Choisir --'}
                    </option>
                    {vehiculesCompatibles.map(v => (
                      <option key={v.vehiculeId} value={v.vehiculeId}>
                        {v.immatriculation} ({v.type} — {v.capacitePoidsKg}kg / {v.capaciteVolumeM3}m³)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onReculer}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
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
            disabled={loading || !isValide || decisions.filter(d => d.chauffeurId && d.vehiculeId).length === 0}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <span className="material-symbols-outlined">check_circle</span>
            )}
            Valider l'affectation ({decisions.filter(d => d.chauffeurId && d.vehiculeId).length}/{preview.sacs.length})
          </button>
        </div>
      </div>
    </div>
  )
}
