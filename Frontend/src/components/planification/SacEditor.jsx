import { useState, useMemo } from 'react'
import UrgencyBadge from '../UrgencyBadge'

export default function SacEditor({ preview, onValider, onReculer, loading }) {
  const [sacs, setSacs] = useState(() =>
    (preview.sacs || []).map((s, i) => ({
      ...s,
      idx: i,
      supprime: false,
    }))
  )
  const [draggingColis, setDraggingColis] = useState(null)
  const [dragSource, setDragSource] = useState(null)

  const tauxColor = (taux) => taux >= 80 ? '#10B981' : taux >= 50 ? '#F59E0B' : '#EF4444'

  const totalColis = useMemo(() => sacs.reduce((sum, s) => sum + (s.supprime ? 0 : s.colisIds.length), 0), [sacs])

  const handleDragStart = (colisId, sacIdx) => {
    setDraggingColis(colisId)
    setDragSource(sacIdx)
  }

  const handleDragOver = (e) => e.preventDefault()

  const handleDrop = (targetIdx) => {
    if (draggingColis == null || dragSource == null || dragSource === targetIdx) return

    setSacs(prev => prev.map((s, i) => {
      if (i === dragSource) {
        return { ...s, colisIds: s.colisIds.filter(id => id !== draggingColis) }
      }
      if (i === targetIdx) {
        if (s.colisIds.includes(draggingColis)) return s
        return { ...s, colisIds: [...s.colisIds, draggingColis] }
      }
      return s
    }))

    setDraggingColis(null)
    setDragSource(null)
  }

  const handleRemoveColis = (colisId, sacIdx) => {
    setSacs(prev => prev.map((s, i) => {
      if (i === sacIdx) {
        return { ...s, colisIds: s.colisIds.filter(id => id !== colisId) }
      }
      return s
    }))
  }

  const handleExcludeSac = (sacIdx) => {
    setSacs(prev => prev.map((s, i) => i === sacIdx ? { ...s, supprime: !s.supprime } : s))
  }

  const handleValider = () => {
    const editedSacs = sacs
      .filter(s => !s.supprime && s.colisIds.length > 0)
      .map(s => ({
        tmpSacId: s.tmpSacId,
        colisIds: s.colisIds,
        supprime: false,
      }))
    onValider(editedSacs)
  }

  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Sacs: {sacs.filter(s => !s.supprime).length}</span>
          <span>Colis total: {totalColis}</span>
          <span>Run: {preview.runId?.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Sacs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sacs.map((sac, i) => (
          <div
            key={sac.tmpSacId || i}
            className={`rounded-xl border p-4 transition-all ${
              sac.supprime
                ? 'border-red-200 bg-red-50 opacity-60'
                : draggingColis != null
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(i)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                <h4 className="font-semibold text-gray-900">Sac {i + 1}</h4>
              </div>
              <button
                onClick={() => handleExcludeSac(i)}
                className={`text-xs px-2 py-1 rounded ${
                  sac.supprime
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                {sac.supprime ? 'Annuler' : 'Exclure'}
              </button>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Remplissage</span>
                <span className="font-medium" style={{ color: tauxColor(parseFloat(sac.tauxRemplissage)) }}>
                  {parseFloat(sac.tauxRemplissage).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(parseFloat(sac.tauxRemplissage), 100)}%`,
                    backgroundColor: tauxColor(parseFloat(sac.tauxRemplissage)),
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Poids: {sac.poidsTotalKg}kg</span>
                <span className="text-gray-400">Vol: {sac.volumeTotalM3}m³</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Cluster: {sac.cluster}</span>
                <UrgencyBadge
                  dateDepartCalculee={sac.dateDepartPlafond}
                  departForce={sac.departForce}
                  compact
                />
              </div>
            </div>

            {/* Colis list - drag source */}
            {!sac.supprime && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {sac.colisIds.map((colisId) => (
                  <div
                    key={colisId}
                    draggable
                    onDragStart={() => handleDragStart(colisId, i)}
                    className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded text-xs cursor-grab hover:bg-gray-100 active:cursor-grabbing"
                  >
                    <span className="text-gray-700 font-mono">{colisId.slice(0, 8)}...</span>
                    <button
                      onClick={() => handleRemoveColis(colisId, i)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onReculer}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Reculer
        </button>
        <button
          onClick={handleValider}
          disabled={loading || sacs.filter(s => !s.supprime && s.colisIds.length > 0).length === 0}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <span className="material-symbols-outlined">check_circle</span>
          )}
          Valider le groupage ({sacs.filter(s => !s.supprime).length} sacs)
        </button>
      </div>
    </div>
  )
}
