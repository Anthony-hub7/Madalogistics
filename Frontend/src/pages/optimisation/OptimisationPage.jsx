import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'
import { groupageService } from '../../services/groupageService'
import { affectationService } from '../../services/affectationService'
import { vrpService } from '../../services/vrpService'
import { sacsService } from '../../services/sacsService'
import SacEditor from '../../components/planification/SacEditor'
import AffectationEditor from '../../components/planification/AffectationEditor'
import TourneeEditor from '../../components/planification/TourneeEditor'

export default function OptimisationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedOrdersFromList = location.state?.selectedOrders || null

  const [hubs, setHubs] = useState([])
  const [pendingByHub, setPendingByHub] = useState({})
  const [selectedHub, setSelectedHub] = useState(null)
  const [hubName, setHubName] = useState('')
  const [sacs, setSacs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectionError, setSelectionError] = useState(null)
  const [hubLocked, setHubLocked] = useState(false)

  const [groupageAlgo, setGroupageAlgo] = useState('BIN_PACKING')
  const [groupagePreview, setGroupagePreview] = useState(null)
  const [affectationPreview, setAffectationPreview] = useState(null)
  const [vrpResults, setVrpResults] = useState({})
  const [vrpTournees, setVrpTournees] = useState({})
  const [vrpPreviewLoading, setVrpPreviewLoading] = useState(null)

  const refreshPipeline = async () => {
    try {
      const data = await sacsService.getAll()
      setSacs(Array.isArray(data) ? data : [])
    } catch {}
  }

  const loadHubs = async () => {
    try {
      const [hubList, demandes] = await Promise.all([
        demandesService.getHubs().catch(() => []),
        demandesService.getAll('EN_ATTENTE_GROUPAGE').catch(() => []),
      ])
      const list = Array.isArray(hubList) ? hubList : []
      setHubs(list)
      const counts = {}
      for (const d of (Array.isArray(demandes) ? demandes : [])) {
        const hid = d.hubId || d.hub?.hubId
        if (hid) counts[hid] = (counts[hid] || 0) + 1
      }
      setPendingByHub(counts)
    } catch {}
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadHubs(), refreshPipeline()])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedOrdersFromList || selectedOrdersFromList.length === 0) return
    const badStatut = selectedOrdersFromList.filter(o => o.statut !== 'EN_ATTENTE_GROUPAGE')
    if (badStatut.length > 0) {
      setSelectionError(`${badStatut.length} commande(s) non éligibles — seules les commandes "En attente groupage" sont prises en compte.`)
      return
    }
    const hubsSet = [...new Set(selectedOrdersFromList.map(o => o.hubId).filter(Boolean))]
    if (hubsSet.length === 0) {
      setSelectionError('Aucun hub renseigné sur les commandes sélectionnées.')
      return
    }
    if (hubsSet.length > 1) {
      setSelectionError(`${hubsSet.length} hubs détectés — le groupage se fait par hub. Séparez votre sélection par hub.`)
      return
    }
    const hubId = hubsSet[0]
    const name = selectedOrdersFromList[0]?.hubNom || hubId
    setSelectedHub(hubId)
    setHubName(name)
    setHubLocked(true)
  }, [selectedOrdersFromList])

  const handleGroupagePreview = async () => {
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
  }

  const handleGroupageValider = async (editedSacs) => {
    if (!groupagePreview?.runId) return
    setLoading(true)
    setError(null)
    try {
      await groupageService.validerEdit(groupagePreview.runId, editedSacs)
      setGroupagePreview(null)
      await refreshPipeline()
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation groupage')
    } finally {
      setLoading(false)
    }
  }

  const handleAffectationPreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const preview = await affectationService.preview(selectedHub)
      setAffectationPreview(preview)
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur chargement affectation')
    } finally {
      setLoading(false)
    }
  }

  const handleAffectationValider = async (decisions) => {
    setLoading(true)
    setError(null)
    try {
      await affectationService.valider(selectedHub, decisions)
      setAffectationPreview(null)
      await refreshPipeline()
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation affectation')
    } finally {
      setLoading(false)
    }
  }

  const handleVrpPreview = async (sacId) => {
    setVrpPreviewLoading(sacId)
    setError(null)
    try {
      const result = await vrpService.preview(sacId)
      setVrpResults(prev => ({ ...prev, [sacId]: result }))
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur VRP preview')
    } finally {
      setVrpPreviewLoading(null)
    }
  }

  const handleVrpValider = async (sacId, etapes) => {
    setLoading(true)
    setError(null)
    try {
      const result = await vrpService.valider(sacId, etapes)
      if (result?.tourneeId) {
        setVrpTournees(prev => ({ ...prev, [sacId]: result.tourneeId }))
      }
      await refreshPipeline()
    } catch (e) {
      setError(e.body?.error || e.message || 'Erreur validation VRP')
    } finally {
      setLoading(false)
    }
  }

  const groups = useMemo(() => {
    if (!selectedHub || !sacs.length) return null
    const hubSacs = sacs.filter(s => s.hubId === selectedHub)
    return {
      demandes: pendingByHub[selectedHub] || 0,
      aAffecter: hubSacs.filter(s => s.statut === 'CONSTITUE'),
      vrpAFaire: hubSacs.filter(s => s.statut === 'AFFECTE' && !s.hasTournee),
      avecTournee: hubSacs.filter(s => s.statut === 'AFFECTE' && s.hasTournee),
      historique: hubSacs.filter(s => s.statut === 'EN_TRANSIT' || s.statut === 'LIVRE'),
    }
  }, [selectedHub, sacs, pendingByHub])

  if (selectionError) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Optimisation Logistique</h1>
          <p className="text-gray-500 mt-1">Pipeline complet : Groupage → Affectation → VRP</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-orange-500 mt-0.5">warning</span>
          <div className="flex-1">
            <p className="text-sm text-orange-800">{selectionError}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/logistics/commandes')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Retour aux commandes
        </button>
      </div>
    )
  }

  const isReady = !loading || sacs.length > 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Optimisation Logistique</h1>
        <p className="text-gray-500 mt-1">Pipeline complet : Groupage → Affectation → VRP</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div className="flex-1"><p className="text-sm text-red-800">{error}</p></div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* ── Hub horizontal ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Hubs</h2>
        {loading && hubs.length === 0 ? (
          <div className="flex items-center gap-3 text-gray-400 py-2">
            <span className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {hubs.map(hub => {
              const hid = hub.hubId || hub.id
              const pending = pendingByHub[hid] || 0
              const hubSacs = sacs.filter(s => s.hubId === hid)
              const aAffecter = hubSacs.filter(s => s.statut === 'CONSTITUE').length
              const vrpAFaire = hubSacs.filter(s => s.statut === 'AFFECTE' && !s.hasTournee).length
              const avecTournee = hubSacs.filter(s => s.statut === 'AFFECTE' && s.hasTournee).length
              const selected = selectedHub === hid
              return (
                <button
                  key={hid}
                  disabled={hubLocked && !selected}
                  onClick={() => {
                    setSelectedHub(hid)
                    setHubName(hub.nom)
                    setGroupagePreview(null)
                    setAffectationPreview(null)
                    setVrpResults({})
                    setVrpTournees({})
                    setVrpPreviewLoading(null)
                  }}
                  className={`flex-shrink-0 p-4 rounded-xl border-2 text-left transition-all min-w-[200px] ${
                    selected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : hubLocked
                        ? 'border-gray-200 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-600 text-lg">location_on</span>
                    <p className="font-medium text-gray-900 text-sm truncate">{hub.nom}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {pending > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                        {pending} en attente
                      </span>
                    )}
                    {aAffecter > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {aAffecter} à affecter
                      </span>
                    )}
                    {vrpAFaire > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        {vrpAFaire} VRP à faire
                      </span>
                    )}
                    {avecTournee > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {avecTournee} tournées
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail hub ── */}
      {selectedHub && isReady && groups && (
        <div className="space-y-6">

          {/* S1: Demandes en attente */}
          {groups.demandes > 0 && !groupagePreview && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600">pending_actions</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Demandes en attente</h3>
                    <p className="text-sm text-gray-500">{groups.demandes} commande(s) à regrouper</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setGroupageAlgo('BIN_PACKING')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      groupageAlgo === 'BIN_PACKING'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    FFD BinPacking
                  </button>
                  <button
                    onClick={() => setGroupageAlgo('KNAPSACK')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      groupageAlgo === 'KNAPSACK'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Knapsack
                  </button>
                </div>
                <button
                  onClick={handleGroupagePreview}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                  )}
                  Lancer la simulation
                </button>
              </div>
            </div>
          )}

          {groupagePreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGroupagePreview(null)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <span className="material-symbols-outlined text-gray-500 text-lg">arrow_back</span>
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Résultat du groupage</h2>
                  <p className="text-sm text-gray-500">Éditez les sacs si nécessaire, puis validez</p>
                </div>
              </div>
              <SacEditor
                preview={groupagePreview}
                onValider={handleGroupageValider}
                onReculer={() => setGroupagePreview(null)}
                loading={loading}
              />
            </div>
          )}

          {/* S2: Sacs à affecter */}
          {groups.aAffecter.length > 0 && !affectationPreview && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sacs à affecter</h3>
                    <p className="text-sm text-gray-500">{groups.aAffecter.length} sac(s) en attente d'affectation</p>
                  </div>
                </div>
                <button
                  onClick={handleAffectationPreview}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <span className="material-symbols-outlined text-base">person_add</span>
                  )}
                  Préparer l'affectation
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.aAffecter.map((sac, i) => (
                  <div key={sac.sacId} className="p-4 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                      <div>
                        <p className="font-medium text-gray-900">Sac {i + 1}</p>
                        <p className="text-xs text-gray-500">{sac.nbColis} colis — {sac.categorieDominante || 'STANDARD'}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {sac.poidsKg > 0 && <>{sac.poidsKg.toFixed(1)} kg</>}
                      {sac.poidsKg > 0 && sac.volumeM3 > 0 && <span className="mx-1">·</span>}
                      {sac.volumeM3 > 0 && <>{sac.volumeM3.toFixed(2)} m³</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {affectationPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAffectationPreview(null)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <span className="material-symbols-outlined text-gray-500 text-lg">arrow_back</span>
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Affectation chauffeur + véhicule</h2>
                  <p className="text-sm text-gray-500">Sélectionnez les paires, vérifiez la compatibilité, validez</p>
                </div>
              </div>
              <AffectationEditor
                preview={affectationPreview}
                onValider={handleAffectationValider}
                onReculer={() => setAffectationPreview(null)}
                loading={loading}
              />
            </div>
          )}

          {/* S3: Sacs affectés — VRP à faire */}
          {groups.vrpAFaire.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600">route</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">VRP à planifier</h3>
                  <p className="text-sm text-gray-500">{groups.vrpAFaire.length} sac(s) affectés en attente de tournée</p>
                </div>
              </div>
              <TourneeEditor
                sacsAffectes={groups.vrpAFaire.map(s => ({ ...s, sacId: s.sacId }))}
                vrpResults={vrpResults}
                tourneeIds={vrpTournees}
                onVrpPreview={handleVrpPreview}
                onVrpValider={handleVrpValider}
                onReculer={() => {}}
                loading={loading}
                previewLoadingSac={vrpPreviewLoading}
              />
            </div>
          )}

          {/* S4: Sacs avec tournée */}
          {groups.avecTournee.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Tournées planifiées</h3>
                  <p className="text-sm text-gray-500">{groups.avecTournee.length} sac(s) avec tournée</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.avecTournee.map((sac, i) => (
                  <div key={sac.sacId} className="p-4 rounded-xl border border-green-200 bg-green-50">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <div>
                        <p className="font-medium text-gray-900">Sac {i + 1}</p>
                        <p className="text-xs text-gray-500">{sac.nbColis} colis — {sac.chauffeurNom || '—'} / {sac.immatriculation || '—'}</p>
                      </div>
                    </div>
                    {sac.tourneeId && (
                      <div className="mt-3">
                        <iframe
                          src={`/logistics/carte_optimisation?tourneeId=${sac.tourneeId}&embed=1`}
                          className="w-full rounded-lg border border-gray-200"
                          style={{ height: '280px' }}
                          title={`Carte tournée sac ${i + 1}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/logistics/carte_optimisation')}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                <span className="material-symbols-outlined text-sm">map</span>
                Voir sur la carte (plein écran)
              </button>
            </div>
          )}

          {/* S5: Historique */}
          {groups.historique.length > 0 && (
            <details className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <summary className="p-6 cursor-pointer text-sm font-medium text-gray-500 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">history</span>
                Historique ({groups.historique.length} sac(s) en transit / livrés)
              </summary>
              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.historique.map((sac, i) => (
                  <div key={sac.sacId} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-gray-400">
                        {sac.statut === 'LIVRE' ? 'check_circle' : 'local_shipping'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-700">Sac {i + 1}</p>
                        <p className="text-xs text-gray-400">{sac.statut} — {sac.nbColis} colis</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Aucune donnée */}
          {groups.demandes === 0 && groups.aAffecter.length === 0 && groups.vrpAFaire.length === 0 && groups.avecTournee.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">inventory_2</span>
              <p className="text-gray-500 font-medium">Aucune donnée pour ce hub</p>
              <p className="text-gray-400 text-sm mt-1">Les demandes, sacs et tournées apparaîtront ici au fur et à mesure</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
