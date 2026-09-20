import { useState, useCallback, useEffect } from 'react'

export default function TourneeEditor({ sacsAffectes = [], vrpResults = {}, tourneeIds = {}, onVrpPreview, onVrpValider, onReculer, loading, previewLoadingSac }) {
  const [selectedSac, setSelectedSac] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)

  const currentResult = selectedSac ? vrpResults[selectedSac] : null

  // Init auto when preview arrives
  useEffect(() => {
    if (!selectedSac) return
    const result = vrpResults[selectedSac]
    if (result?.etapes && editingOrder === null) {
      setEditingOrder(result.etapes.map(e => ({ ...e })))
    }
  }, [selectedSac, vrpResults, editingOrder])

  const handleSelectSac = useCallback((sacId) => {
    setSelectedSac(sacId)
    setEditingOrder(null)
    setDragIdx(null)
    const result = vrpResults[sacId]
    if (!result?.etapes) {
      onVrpPreview(sacId)
    }
  }, [vrpResults, onVrpPreview])

  const handleDragStart = (idx) => setDragIdx(idx)

  const handleDragOver = (e) => e.preventDefault()

  const handleDrop = (targetIdx) => {
    if (dragIdx == null || editingOrder == null || dragIdx === targetIdx) return
    setEditingOrder(prev => {
      if (!Array.isArray(prev)) return prev
      const arr = [...prev]
      const [moved] = arr.splice(dragIdx, 1)
      arr.splice(targetIdx, 0, moved)
      return arr.map((e, i) => ({ ...e, ordre: i + 1 }))
    })
    setDragIdx(null)
  }

  const handleValider = () => {
    if (!selectedSac || !editingOrder) return
    const etapes = editingOrder.map(e => ({
      ordre: e.ordre,
      colisId: e.colisId,
    }))
    onVrpValider(selectedSac, etapes)
  }

  const displaySteps = editingOrder || currentResult?.etapes || []

  return (
    <div className="space-y-4">
      {/* Sac list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sacsAffectes.map((sac, i) => {
          const result = vrpResults[sac.sacId]
          const isLoadingThis = previewLoadingSac === sac.sacId
          return (
            <button
              key={sac.sacId}
              onClick={() => !isLoadingThis && handleSelectSac(sac.sacId)}
              disabled={previewLoadingSac && !isLoadingThis}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedSac === sac.sacId
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              } ${previewLoadingSac && !isLoadingThis ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                {isLoadingThis ? (
                  <span className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full shrink-0" />
                ) : (
                  <span className="material-symbols-outlined text-blue-600">route</span>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    Sac {i + 1}
                    {isLoadingThis && <span className="ml-2 text-blue-600 text-sm">Calcul…</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {sac.nbColis} colis
                    {result?.meta?.hasSolution && (
                      <span className="ml-2 text-green-600">
                        — {result.distanceTotaleKm}km, {result.etapes?.length} étapes
                      </span>
                    )}
                    {result && !result.meta?.hasSolution && (
                      <span className="ml-2 text-red-500">— Pas de solution</span>
                    )}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Editing panel */}
      {selectedSac && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          {(!currentResult && (loading || previewLoadingSac)) ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-blue-500 mb-4 block animate-pulse">route</span>
              <p className="text-gray-900 font-medium text-lg mb-1">Calcul de l'ordre optimal des livraisons…</p>
              <p className="text-gray-500 text-sm">OR-Tools explore les itinéraires</p>
              <span className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full inline-block mt-4" />
            </div>
          ) : currentResult?.meta?.hasSolution ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Tournée — {displaySteps.length} étapes, {currentResult.distanceTotaleKm}km
                </h3>
                <span className="text-xs text-gray-400">
                  Solve: {currentResult.meta.solveTimeMs}ms
                </span>
              </div>

              {/* Editable step list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {displaySteps.map((etape, i) => (
                  <div
                    key={`${etape.colisId}-${i}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(i)}
                    className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 cursor-grab hover:border-blue-300 active:cursor-grabbing"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {etape.ordre || i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Colis {etape.colisId?.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {etape.latitude?.toFixed(4)}, {etape.longitude?.toFixed(4)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      +{Math.round((etape.arrivalSec || 0) / 60)}min
                    </span>
                    <span className="material-symbols-outlined text-gray-400 text-lg">drag_indicator</span>
                  </div>
                ))}
              </div>

              {/* Carte tournée intégrée */}
              {(currentResult.tourneeId || tourneeIds[selectedSac]) && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Carte de la tournée</p>
                  <iframe
                    src={`/logistics/carte_optimisation?tourneeId=${currentResult.tourneeId || tourneeIds[selectedSac]}&embed=1`}
                    className="w-full rounded-xl border border-gray-200"
                    style={{ height: '420px' }}
                    title="Carte de la tournée"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">route</span>
              <p className="text-gray-500">Aucune solution VRP trouvée pour ce sac.</p>
            </div>
          )}
        </div>
      )}

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
          disabled={loading || !selectedSac || !editingOrder}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <span className="material-symbols-outlined">check_circle</span>
          )}
          Valider la tournée
        </button>
      </div>
    </div>
  )
}
