import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { tourneesService } from '../../services/tourneesService'

const STEPS = [
  { key: 'categorisation', label: 'Catégorisation', icon: 'label', description: 'Assigner une catégorie à chaque colis' },
  { key: 'groupage', label: 'Groupage', icon: 'inventory_2', description: 'Optimiser le chargement (Knapsack)' },
  { key: 'affectation', label: 'Affectation', icon: 'person_add', description: 'Assigner chauffeur + véhicule' },
  { key: 'planification', label: 'Planification VRP', icon: 'route', description: 'Planifier les tournées' },
]

const CATEGORIES = ['Standard', 'Express', 'Fragile-Valeur']

const DEFAULT_COLIS = [
  { id: 'COL-001', designation: 'Pièces mécaniques', poids: 45, volume: 0.8, categorie: null },
  { id: 'COL-002', designation: 'Documents prioritaires', poids: 2, volume: 0.1, categorie: null },
  { id: 'COL-003', designation: 'Matériel fragile', poids: 12, volume: 0.3, categorie: null },
  { id: 'COL-004', designation: 'Textiles export', poids: 120, volume: 2.4, categorie: null },
  { id: 'COL-005', designation: 'Huiles industrielles', poids: 85, volume: 1.2, categorie: null },
]

function loadHubs() {
  try {
    const stored = localStorage.getItem('madalogistix_hubs')
    return stored ? JSON.parse(stored) : [{ id: 1, nom: 'Hub Antananarivo', adresse: 'Zone Industrielle, Ankorondrano, Antananarivo', statut: 'actif' }]
  } catch {
    return [{ id: 1, nom: 'Hub Antananarivo', adresse: 'Zone Industrielle, Ankorondrano, Antananarivo', statut: 'actif' }]
  }
}

export default function OptimisationPage() {
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(0)
  const [colis, setColis] = useState(DEFAULT_COLIS)
  const [groupageResult, setGroupageResult] = useState(null)
  const [affectationResult, setAffectationResult] = useState(null)
  const [vrpResult, setVrpResult] = useState(null)
  const [hubs, setHubs] = useState(loadHubs)
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    setHubs(loadHubs())
  }, [])

  const selectedOrders = location.state?.selectedOrders
  useEffect(() => {
    if (selectedOrders?.length) {
      const mapped = selectedOrders.map((o, i) => ({
        id: o.id || `CMD-${i + 1}`,
        designation: `${o.client} — ${o.destination}`,
        poids: parseInt(o.weight) || 0,
        volume: parseFloat(o.volume) || 0,
        categorie: null,
      }))
      setColis(mapped.length > 0 ? mapped : DEFAULT_COLIS)
    }
  }, [selectedOrders])

  const completedSteps = currentStep
  const progress = (completedSteps / STEPS.length) * 100

  const handleCategorize = (id, categorie) => {
    setColis(prev => prev.map(c => c.id === id ? { ...c, categorie } : c))
  }

  const handleGroupage = async () => {
    setOptimizing(true)
    try {
      const result = await tourneesService.optimize({
        colis: colis.map(c => ({ id: c.id, poids: c.poids, volume: c.volume, categorie: c.categorie })),
        hubs: hubs.filter(h => h.statut === 'actif'),
      })
      if (result?.sacs) {
        setGroupageResult(result)
      } else {
        setGroupageResult({
          sacs: [
            { id: 'SAC-1', colis: colis.slice(0, 2), poidsTotal: 47, volumeTotal: 0.9, capacite: 500 },
            { id: 'SAC-2', colis: colis.slice(2), poidsTotal: 217, volumeTotal: 3.9, capacite: 500 },
          ],
          tauxRemplissage: 52,
        })
      }
    } catch {
      setGroupageResult({
        sacs: [
          { id: 'SAC-1', colis: colis.slice(0, 2), poidsTotal: 47, volumeTotal: 0.9, capacite: 500 },
          { id: 'SAC-2', colis: colis.slice(2), poidsTotal: 217, volumeTotal: 3.9, capacite: 500 },
        ],
        tauxRemplissage: 52,
      })
    } finally {
      setOptimizing(false)
      setCurrentStep(2)
    }
  }

  const handleAffectation = () => {
    setAffectationResult({
      chauffeur: 'Andry Rakoto',
      vehicule: 'VAN-02 (Toyota Hiace)',
      hub: 'Antananarivo',
    })
    setCurrentStep(3)
  }

  const handlePlanification = () => {
    const activeHubs = hubs.filter(h => h.statut === 'actif')
    const hubName = activeHubs.length > 0 ? activeHubs[0].nom : 'Hub'
    setVrpResult({
      tournees: [
        { id: 'T-01', depart: hubName, etapes: ['Antananarivo Centre', 'Ankorondrano', 'Analakely'], distance: '12.4 km', duree: '45 min' },
        { id: 'T-02', depart: hubName, etapes: ['Ivandry', 'Ambohijatovo'], distance: '6.0 km', duree: '20 min' },
      ],
      distanceTotale: '18.4 km',
      dureeTotale: '1h05',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Optimisation Logistique</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Pipeline d'optimisation : Catégorisation → Groupage → Affectation → Planification VRP
        </p>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                  i < completedSteps ? 'bg-secondary text-on-secondary' :
                  i === currentStep ? 'bg-primary text-on-primary ring-4 ring-primary/20' :
                  'bg-surface-container-high text-outline border border-outline-variant'
                }`}>
                  {i < completedSteps ? (
                    <span className="material-symbols-outlined">check</span>
                  ) : (
                    <span className="material-symbols-outlined">{step.icon}</span>
                  )}
                </div>
                <span className={`font-label-sm text-label-sm text-center ${
                  i <= currentStep ? 'text-on-surface font-bold' : 'text-outline'
                }`}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-1 mx-2 mb-6 rounded ${
                  i < completedSteps ? 'bg-secondary' : 'bg-outline-variant'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
          Étape {currentStep + 1}/{STEPS.length} : {STEPS[currentStep].description}
        </p>
      </div>

      {currentStep === 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md">Catégorisation des colis</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Assignez une catégorie à chaque colis de la sélection.
          </p>
          <div className="space-y-3">
            {colis.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border border-outline-variant hover:bg-surface-container-low/50">
                <div>
                  <p className="font-label-md text-label-md font-bold">{c.id}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{c.designation} — {c.poids}kg, {c.volume}m³</p>
                </div>
                <select
                  value={c.categorie || ''}
                  onChange={(e) => handleCategorize(c.id, e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-label-md text-label-md"
                >
                  <option value="">Sélectionner...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentStep(1)}
            disabled={colis.some(c => !c.categorie)}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Valider la catégorisation
          </button>
        </div>
      )}

      {currentStep === 1 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md">Groupage (Knapsack / Bin Packing)</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Optimisez le chargement en regroupant les colis par sacs logiques.
          </p>
          <div className="grid grid-cols-3 gap-4 p-4 bg-surface-container-low rounded-lg">
            <div><p className="font-label-sm text-label-sm text-outline">Total colis</p><p className="font-headline-md text-headline-md">{colis.length}</p></div>
            <div><p className="font-label-sm text-label-sm text-outline">Poids total</p><p className="font-headline-md text-headline-md">{colis.reduce((s, c) => s + c.poids, 0)} kg</p></div>
            <div><p className="font-label-sm text-label-sm text-outline">Volume total</p><p className="font-headline-md text-headline-md">{colis.reduce((s, c) => s + c.volume, 0).toFixed(1)} m³</p></div>
          </div>
          <button onClick={handleGroupage} disabled={optimizing} className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md font-bold disabled:opacity-50">
            {optimizing ? 'Optimisation en cours...' : 'Lancer le groupage'}
          </button>
        </div>
      )}

      {currentStep === 2 && groupageResult && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md">Résultat du groupage</h3>
          <div className="space-y-3">
            {groupageResult.sacs.map((sac) => (
              <div key={sac.id} className="p-4 rounded-lg border border-outline-variant">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-label-md text-label-md font-bold">{sac.id}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{sac.poidsTotal}kg / {sac.capacite}kg</p>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 mb-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${(sac.poidsTotal / sac.capacite) * 100}%` }} />
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {sac.colis.length} colis : {sac.colis.map(c => c.id).join(', ')}
                </p>
              </div>
            ))}
          </div>
          <div className="p-4 bg-secondary-container/20 rounded-lg">
            <p className="font-label-md text-label-md font-bold text-secondary">Taux de remplissage : {groupageResult.tauxRemplissage}%</p>
          </div>
          <h3 className="font-headline-md text-headline-md pt-4">Affectation chauffeur + véhicule</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Règle : même hub + habilite_valeur=true requis pour colis classe A (Fragile-Valeur).
          </p>
          <button onClick={handleAffectation} className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md font-bold">
            Affecter chauffeur et véhicule
          </button>
        </div>
      )}

      {currentStep === 3 && affectationResult && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <div className="p-4 bg-primary-container/20 rounded-lg space-y-2">
            <p className="font-label-md text-label-md font-bold text-primary">Affectation validée</p>
            <p className="font-body-sm text-body-sm">Chauffeur : <strong>{affectationResult.chauffeur}</strong></p>
            <p className="font-body-sm text-body-sm">Véhicule : <strong>{affectationResult.vehicule}</strong></p>
            <p className="font-body-sm text-body-sm">Hub : <strong>{affectationResult.hub}</strong></p>
          </div>
          <h3 className="font-headline-md text-headline-md">Planification VRP (tournées)</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Calculez l'itinéraire optimal pour les livraisons en partant des hubs configurés.
          </p>
          <div className="p-4 bg-surface-container-low rounded-lg space-y-2">
            <p className="font-label-md text-label-md font-bold">Points de départ (Hubs) :</p>
            {hubs.filter(h => h.statut === 'actif').map((hub) => (
              <div key={hub.id} className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
                <span className="font-label-md text-label-md">{hub.nom}</span>
                <span className="text-on-surface-variant">— {hub.adresse}</span>
              </div>
            ))}
            {hubs.filter(h => h.statut === 'actif').length === 0 && (
              <p className="font-label-sm text-label-sm text-error">Aucun hub actif configuré. Ajoutez-en dans Direction &gt; Hubs.</p>
            )}
          </div>
          <button onClick={handlePlanification} className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md font-bold">
            Lancer la planification VRP
          </button>
        </div>
      )}

      {currentStep === 3 && vrpResult && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md text-secondary">Tournées planifiées</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-surface-container-low rounded-lg"><p className="font-label-sm text-label-sm text-outline">Distance totale</p><p className="font-headline-md text-headline-md">{vrpResult.distanceTotale}</p></div>
            <div className="p-3 bg-surface-container-low rounded-lg"><p className="font-label-sm text-label-sm text-outline">Durée totale</p><p className="font-headline-md text-headline-md">{vrpResult.dureeTotale}</p></div>
          </div>
          {vrpResult.tournees.map((t) => (
            <div key={t.id} className="p-4 rounded-lg border border-outline-variant">
              <div className="flex justify-between items-center mb-2">
                <p className="font-label-md text-label-md font-bold">Tournée {t.id}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{t.distance} — {t.duree}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="bg-primary text-on-primary px-2 py-1 rounded font-label-sm text-label-sm font-bold">{t.depart}</span>
                  <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                </span>
                {t.etapes.map((e, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded font-label-sm text-label-sm">{e}</span>
                    {i < t.etapes.length - 1 && <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>}
                  </span>
                ))}
                <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                <span className="flex items-center gap-1">
                  <span className="bg-primary text-on-primary px-2 py-1 rounded font-label-sm text-label-sm font-bold">{t.depart}</span>
                </span>
              </div>
            </div>
          ))}
          <button className="w-full bg-secondary text-on-secondary py-3 rounded-xl font-label-md font-bold">
            Lancer les missions
          </button>
        </div>
      )}
    </div>
  )
}
