import { useState, useEffect, useCallback } from 'react'
import { sacsService } from '../../services/sacsService'

/**
 * Panneau d'edition des colis d'un sac (V1-c).
 *
 * - Colonne gauche : colis actuellement dans le sac → on peut les retirer
 * - Colonne droite : colis libres du meme hub → on peut les ajouter
 * - Interdit cote backend des qu'une tournee existe (le bouton n'apparait pas)
 */
export default function SacColisEditorModal({ sac, hubId, onClose, onSaved }) {
  const [duSac, setDuSac] = useState([])
  const [libres, setLibres] = useState([])
  const [retirer, setRetirer] = useState([])
  const [ajouter, setAjouter] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [colisSac, colisLibres] = await Promise.all([
        sacsService.getColis(sac.sacId),
        sacsService.getColisLibres(hubId),
      ])
      setDuSac(Array.isArray(colisSac) ? colisSac : [])
      setLibres(Array.isArray(colisLibres) ? colisLibres : [])
    } catch (err) {
      setError(err?.message || 'Impossible de charger les colis')
    } finally {
      setLoading(false)
    }
  }, [sac.sacId, hubId])

  useEffect(() => { charger() }, [charger])

  const toggleRetirer = (colisId) => {
    setRetirer(prev => prev.includes(colisId) ? prev.filter(id => id !== colisId) : [...prev, colisId])
  }

  const toggleAjouter = (colisId) => {
    setAjouter(prev => prev.includes(colisId) ? prev.filter(id => id !== colisId) : [...prev, colisId])
  }

  const nbFinal = duSac.length - retirer.length + ajouter.length
  const vide = nbFinal <= 0
  const rien = retirer.length === 0 && ajouter.length === 0

  const handleSave = async () => {
    if (vide || rien) return
    setSaving(true)
    setError(null)
    try {
      await sacsService.editColis(sac.sacId, { ajouter, retirer })
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const toggleBadge = (selected) => selected
    ? 'border-red-400 bg-red-50 text-red-700'
    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'

  const toggleBadgeAdd = (selected) => selected
    ? 'border-green-400 bg-green-50 text-green-700'
    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">edit_note</span>
              Éditer les colis du sac
            </h3>
            <p className="text-xs text-gray-500">
              {sac.nbColis} colis · {sac.poidsKg?.toFixed?.(1) ?? sac.poidsKg} kg · {sac.categorieDominante || 'STANDARD'}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <span className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full inline-block" />
              <p className="text-gray-500 text-sm mt-3">Chargement des colis…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colis du sac */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Dans le sac ({duSac.length})</span>
                  {retirer.length > 0 && <span className="text-red-600 text-xs">-{retirer.length}</span>}
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {duSac.map(c => (
                    <button
                      key={c.colisId}
                      onClick={() => toggleRetirer(c.colisId)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${toggleBadge(retirer.includes(c.colisId))}`}
                    >
                      <p className="font-medium flex items-center justify-between">
                        <span>{c.clientNom || 'Client'} — {c.categorie || 'Colis'}</span>
                        <span className="material-symbols-outlined text-base">
                          {retirer.includes(c.colisId) ? 'remove_circle' : 'radio_button_unchecked'}
                        </span>
                      </p>
                      <p className="text-xs opacity-70">
                        {c.poidsKg?.toFixed?.(1)} kg · {c.volumeM3?.toFixed?.(2)} m³
                        {c.dateSouhaitee ? ` · ${c.dateSouhaitee}` : ''}
                      </p>
                    </button>
                  ))}
                  {duSac.length === 0 && (
                    <p className="text-gray-400 text-sm italic">Aucun colis</p>
                  )}
                </div>
              </div>

              {/* Colis libres */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Colis libres du hub ({libres.length})</span>
                  {ajouter.length > 0 && <span className="text-green-600 text-xs">+{ajouter.length}</span>}
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {libres.map(c => (
                    <button
                      key={c.colisId}
                      onClick={() => toggleAjouter(c.colisId)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${toggleBadgeAdd(ajouter.includes(c.colisId))}`}
                    >
                      <p className="font-medium flex items-center justify-between">
                        <span>{c.clientNom || 'Client'} — {c.categorie || 'Colis'}</span>
                        <span className="material-symbols-outlined text-base">
                          {ajouter.includes(c.colisId) ? 'add_circle' : 'radio_button_unchecked'}
                        </span>
                      </p>
                      <p className="text-xs opacity-70">
                        {c.poidsKg?.toFixed?.(1)} kg · {c.volumeM3?.toFixed?.(2)} m³
                        {c.dateSouhaitee ? ` · ${c.dateSouhaitee}` : ''}
                      </p>
                    </button>
                  ))}
                  {libres.length === 0 && (
                    <p className="text-gray-400 text-sm italic">Aucun colis disponible</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {vide && !loading && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Le sac deviendrait vide — supprimez le sac plutôt.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Résultat : <strong>{nbFinal}</strong> colis
            {retirer.length > 0 && ` · -${retirer.length}`}
            {ajouter.length > 0 && ` · +${ajouter.length}`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving || vide || rien}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
