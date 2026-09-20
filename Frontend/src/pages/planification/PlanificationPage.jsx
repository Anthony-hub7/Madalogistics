import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'
import { groupageService } from '../../services/groupageService'
import { affectationService } from '../../services/affectationService'
import { vrpService } from '../../services/vrpService'
import SacEditor from '../../components/planification/SacEditor'
import AffectationEditor from '../../components/planification/AffectationEditor'
import TourneeEditor from '../../components/planification/TourneeEditor'

const STEPS = [
  { key: 'groupage', label: 'Groupage', icon: 'inventory_2' },
  { key: 'affectation', label: 'Affectation', icon: 'assignment_ind' },
  { key: 'tournee', label: 'Tournée', icon: 'route' },
]

export default function PlanificationPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [hubs, setHubs] = useState([])
  const [pendingByHub, setPendingByHub] = useState({})
  const [selectedHub, setSelectedHub] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Groupage state
  const [groupagePreview, setGroupagePreview] = useState(null)
  const [groupageAlgo, setGroupageAlgo] = useState('BIN_PACKING')

  // Affectation state
  const [affectationPreview, setAffectationPreview] = useState(null)
  const [affectationDecisions, setAffectationDecisions] = useState([])

  // VRP state
  const [vrpResults, setVrpResults] = useState({})
  const [vrpPreviewLoading, setVrpPreviewLoading] = useState(null)

  useEffect(() => {
    Promise.all([
      demandesService.getHubs().catch(() => []),
      demandesService.getAll('EN_ATTENTE_GROUPAGE').catch(() => []),
    ]).then(([hubList, demandes]) => {
      const list = Array.isArray(hubList) ? hubList : []
      setHubs(list)
      const counts = {}
      for (const d of (Array.isArray(demandes) ? demandes : [])) {
        const hid = d.hubId || d.hub?.hubId
        if (hid) counts[hid] = (counts[hid] || 0) + 1
      }
      setPendingByHub(counts)
    }).catch(() => {})
  }, [])

  // ── Step 1: Groupage ──

  const handleGroupagePreview = useCallback(async () => {
    if (!selectedHub) return
    setLoading(true)
    setError(null)
    try {
      const result = await groupageService.preview(selectedHub, groupageAlgo)
      setGroupagePreview(result)
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur preview groupage')
    } finally {
      setLoading(false)
    }
  }, [selectedHub, groupageAlgo])

  const handleGroupageValider = useCallback(async (editedSacs) => {
    if (!groupagePreview?.runId) return
    setLoading(true)
    setError(null)
    try {
      await groupageService.validerEdit(groupagePreview.runId, editedSacs)
      setCurrentStep(1)
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation groupage')
    } finally {
      setLoading(false)
    }
  }, [groupagePreview])

  // ── Step 2: Affectation ──

  const handleAffectationPreview = useCallback(async () => {
    if (!selectedHub) return
    setLoading(true)
    setError(null)
    try {
      const result = await affectationService.preview(selectedHub)
      setAffectationPreview(result)
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur preview affectation')
    } finally {
      setLoading(false)
    }
  }, [selectedHub])

  const handleAffectationValider = useCallback(async (decisions) => {
    if (!selectedHub) return
    setLoading(true)
    setError(null)
    try {
      await affectationService.valider(selectedHub, decisions)
      setAffectationDecisions(decisions)
      setCurrentStep(2)
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation affectation')
    } finally {
      setLoading(false)
    }
  }, [selectedHub])

  // ── Step 3: VRP ──

  const handleVrpPreview = useCallback(async (sacId) => {
    setVrpPreviewLoading(sacId)
    setError(null)
    try {
      const result = await vrpService.preview(sacId)
      setVrpResults(prev => ({ ...prev, [sacId]: result }))
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur preview VRP')
    } finally {
      setVrpPreviewLoading(null)
    }
  }, [])

  const handleVrpValider = useCallback(async (sacId, etapes) => {
    setLoading(true)
    setError(null)
    try {
      await vrpService.valider(sacId, etapes)
      navigate('/logistics/carte_optimisation')
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation VRP')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // ── Load data for each step ──

  useEffect(() => {
    if (currentStep === 1 && selectedHub && !affectationPreview) {
      handleAffectationPreview()
    }
  }, [currentStep, selectedHub, affectationPreview, handleAffectationPreview])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planification des Livraisons</h1>
        <p className="text-gray-500 mt-1">
          Groupage → Affectation → Tournée — Simulation avant enregistrement
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => i <= currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  i === currentStep
                    ? 'bg-blue-600 text-white shadow-md'
                    : i < currentStep
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {i < currentStep ? (
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">{step.icon}</span>
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  i < currentStep ? 'bg-green-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hub selection */}
      {!selectedHub && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Selectionner un hub</h2>
          {hubs.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun hub disponible pour votre agence.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hubs.map(hub => {
                const hid = hub.hubId || hub.id
                const pending = pendingByHub[hid] || 0
                return (
                  <button
                    key={hid}
                    onClick={() => {
                      setSelectedHub(hid)
                      setGroupagePreview(null)
                      setAffectationPreview(null)
                      setVrpResults({})
                      setCurrentStep(0)
                    }}
                    className="p-4 rounded-xl border-2 text-left transition-all border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-blue-600">location_on</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{hub.nom}</p>
                        <p className="text-sm text-gray-500 truncate">{hub.adresse || 'Sans adresse'}</p>
                      </div>
                      {pending > 0 && (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                          {pending}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected hub info */}
      {selectedHub && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-600">location_on</span>
          <div className="flex-1">
            <p className="font-medium text-blue-900">Hub sélectionné</p>
            <p className="text-sm text-blue-600">{selectedHub}</p>
          </div>
          <button
            onClick={() => { setSelectedHub(null); setGroupagePreview(null); setAffectationPreview(null); setVrpResults({}) }}
            className="text-blue-400 hover:text-blue-600"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
        </div>
      )}

      {/* Step 1: Groupage */}
      {currentStep === 0 && selectedHub && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Groupage</h2>

            {!groupagePreview ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => setGroupageAlgo('BIN_PACKING')}
                    className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                      groupageAlgo === 'BIN_PACKING'
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">FFD BinPacking</p>
                    <p className="text-sm text-gray-500">Heuristique gloutonne, rapide</p>
                  </button>
                  <button
                    onClick={() => setGroupageAlgo('KNAPSACK')}
                    className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                      groupageAlgo === 'KNAPSACK'
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">Knapsack OR-Tools</p>
                    <p className="text-sm text-gray-500">Programmation dynamique exacte</p>
                  </button>
                </div>

                <button
                  onClick={handleGroupagePreview}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Calcul en cours...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">preview</span>
                      Simuler le groupage
                    </>
                  )}
                </button>
              </div>
            ) : (
              <SacEditor
                preview={groupagePreview}
                onValider={handleGroupageValider}
                onReculer={() => setGroupagePreview(null)}
                loading={loading}
              />
            )}
          </div>
        </div>
      )}

      {/* Step 2: Affectation */}
      {currentStep === 1 && selectedHub && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Affectation</h2>

            {affectationPreview ? (
              <AffectationEditor
                preview={affectationPreview}
                onValider={handleAffectationValider}
                onReculer={() => { setCurrentStep(0); setAffectationPreview(null) }}
                loading={loading}
              />
            ) : (
              <div className="text-center py-8">
                <span className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full inline-block" />
                <p className="text-gray-500 mt-2">Chargement des candidats...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Tournee */}
      {currentStep === 2 && selectedHub && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Tournée VRP</h2>

            {affectationPreview?.sacs?.filter(s => s.chauffeurIdAffecte).length > 0 ? (
              <TourneeEditor
                sacsAffectes={affectationPreview.sacs.filter(s => s.chauffeurIdAffecte)}
                vrpResults={vrpResults}
                onVrpPreview={handleVrpPreview}
                onVrpValider={handleVrpValider}
                onReculer={() => setCurrentStep(1)}
                loading={loading}
                previewLoadingSac={vrpPreviewLoading}
              />
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">route</span>
                <p className="text-gray-500">Aucun sac affecté pour le VRP.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
