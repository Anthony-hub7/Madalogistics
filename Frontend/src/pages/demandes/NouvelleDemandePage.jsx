import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoriesService } from '../../services/categoriesService'
import { demandesService } from '../../services/demandesService'
import { agencesService } from '../../services/agencesService'
import { mapsService } from '../../services/mapsService'
import { useAuth } from '../../hooks/useAuth'
import MapView from '../../map/MapView'
import { Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CRENEAUX = [
  { value: '08-11h', label: '08h00 – 11h00' },
  { value: '11-14h', label: '11h00 – 14h00' },
  { value: '14-17h', label: '14h00 – 17h00' },
  { value: '17-20h', label: '17h00 – 20h00' },
]

const createMarkerIcon = (color, label, iconName) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
    <div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid #FFF;box-shadow:0 3px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#FFF;">
      <span class="material-symbols-outlined" style="font-size:18px;">${iconName}</span>
    </div>
    <div style="background:#1A1A1E;color:#FFF;font-family:monospace;font-size:9.5px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,.3);white-space:nowrap;">${label}</div>
  </div>`,
  iconSize: [36, 52],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

const collecteIcon = createMarkerIcon('#3B82F6', 'COLLECTE', 'trip_origin')
const livraisonIcon = createMarkerIcon('#E8433D', 'LIVRAISON', 'place')
const hubIcon = createMarkerIcon('#1A1A1E', 'HUB', 'warehouse')

function MapClickPlacer({ mode, onPointPlaced }) {
  useMapEvents({
    click(e) { if (mode) onPointPlaced(mode, e.latlng.lat, e.latlng.lng) },
  })
  return null
}

function DraggableCustomMarker({ position, icon, onDragEnd, popupTitle }) {
  const markerRef = useRef(null)
  const eventHandlers = useRef({
    dragend() {
      const m = markerRef.current
      if (m) { const ll = m.getLatLng(); onDragEnd(ll.lat, ll.lng) }
    },
  })
  return (
    <Marker ref={markerRef} position={position} icon={icon}
      draggable eventHandlers={eventHandlers.current}>
      <Popup>{popupTitle}</Popup>
    </Marker>
  )
}

function AdresseSearchInput({ label, value, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  const search = useCallback(async (q) => {
    if (q.length < 3) { setResults([]); return }
    try {
      const data = await mapsService.geocode(q, 5)
      setResults(data || [])
      setOpen(true)
    } catch { setResults([]) }
  }, [])

  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t) }, [query, search])

  return (
    <div className="relative">
      <label className="block font-mono text-[11px] uppercase font-bold text-[#1A1A1E] mb-1.5">{label}</label>
      <div className="flex items-center gap-2 bg-white border border-[#ECECEC] rounded px-3 py-2">
        <span className="material-symbols-outlined text-[18px] text-[#8A8A92]">location_on</span>
        <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher une adresse..." className="w-full bg-transparent font-mono text-xs focus:outline-none" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-[#ECECEC] rounded mt-1 shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} type="button"
              onClick={() => { setQuery(r.display_name); onSelect(r); setOpen(false) }}
              className="w-full text-left px-3 py-2 font-body text-xs hover:bg-[#F7F7F8] border-0 bg-transparent cursor-pointer">
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NouvelleDemandePage() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [step, setStep] = useState(1)
  const [hubs, setHubs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState(null)
  const [devis, setDevis] = useState(null)
  const [devisLoading, setDevisLoading] = useState(false)
  const [mapPlacementMode, setMapPlacementMode] = useState(null)
  const [predictedParColis, setPredictedParColis] = useState({})

  const [form, setForm] = useState({
    agencyId: '',
    agencyName: '',
    hubId: '',
    adresseCollecte: '',
    adresseLivraison: '',
    latitudeCollecte: null,
    longitudeCollecte: null,
    latitudeLivraison: null,
    longitudeLivraison: null,
    dateSouhaitee: '',
    creneau: '08-11h',
    nomDestinataire: '',
    telDestinataire: '',
    assurance: true,
    express: false,
  })

  const [colis, setColis] = useState([
    { poidsKg: '', volumeM3: '', categorieId: '', fragilite: '5', niveauValeur: 'MOYENNE' },
  ])

  const [agences, setAgences] = useState([])
  const [scoringLoading, setScoringLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      demandesService.getHubs().catch((e) => { console.error('Erreur chargement hubs:', e); return [] }),
      categoriesService.listerActives().catch(() => []),
    ]).then(([h, c]) => { setHubs(h || []); setCategories(c || []) })
      .finally(() => setLoading(false))
  }, [])

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const updateColis = (idx, field, value) => {
    setColis(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
    setDevis(null)
    setPredictedParColis(prev => { const n = { ...prev }; delete n[idx]; return n })
  }
  const addColis = () => setColis(prev => [...prev, { poidsKg: '', volumeM3: '', categorieId: '', fragilite: '5', niveauValeur: 'MOYENNE' }])
  const removeColis = (idx) => setColis(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const selectedHub = hubs.find(h => h.hubId === form.hubId)
  const totalPoids = colis.reduce((s, c) => s + (parseFloat(c.poidsKg) || 0), 0)
  const totalVolume = colis.reduce((s, c) => s + (parseFloat(c.volumeM3) || 0), 0)

  const NIVEAU_VALEUR_MAP = { FAIBLE: 50000, MOYENNE: 300000, ELEVEE: 1500000 }

  // ── ÉTAPE 1 : CHARGEMENT DES AGENCES (tout backend) ──
  useEffect(() => {
    if (step === 1 && agences.length === 0) {
      setScoringLoading(true)
      agencesService.getRecommandees(form.latitudeCollecte, form.longitudeCollecte)
        .then(data => { if (data?.length) setAgences(data) })
        .catch(() => {})
        .finally(() => setScoringLoading(false))
    }
  }, [step, form.latitudeCollecte, form.longitudeCollecte, agences.length])

  const selectAgency = async (ag) => {
    updateForm('agencyId', ag.tenantId)
    updateForm('agencyName', ag.nom)
    if (ag.hubId) updateForm('hubId', ag.hubId)
    try {
      const authResponse = await agencesService.changerAgence(ag.tenantId)
      const rawToken = authResponse?.token || authResponse?.accessToken
      if (rawToken) {
        try {
          const payload = JSON.parse(atob(rawToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          loginWithToken(rawToken, {
            utilisateurId: authResponse.utilisateurId,
            tenantId: authResponse.tenantId,
            email: authResponse.email,
            name: authResponse.fullName,
            role: payload?.role || null,
            redirectPath: authResponse.redirectPath,
          })
        } catch {}
      }
    } catch {}
    try {
      const [freshHubs, freshCategories] = await Promise.all([
        demandesService.getHubs().catch(() => []),
        categoriesService.listerActives().catch(() => []),
      ])
      setHubs(freshHubs || [])
      setCategories(freshCategories || [])
      if (!ag.hubId && freshHubs?.length) updateForm('hubId', freshHubs[0].hubId)
    } catch {}
    setStep(2)
  }

  // ── PRÉDICTION CLASSE (par colis, backend) ──
  useEffect(() => {
    if (!form.hubId) return
    const timers = colis.map((c, idx) => {
      const poids = parseFloat(c.poidsKg) || 0
      const volume = parseFloat(c.volumeM3) || 0
      if (poids > 0 && volume > 0 && !c.categorieId) {
        return setTimeout(() => {
          demandesService.predireClasse({
            poidsKg: poids, volumeM3: volume,
            express: form.express,
            fragilite: parseInt(c.fragilite) || 0,
            niveauValeur: c.niveauValeur || 'MOYENNE',
          }).then(data => { if (data?.categorieId) setPredictedParColis(prev => ({ ...prev, [idx]: data })) })
            .catch(() => {})
        }, 500)
      }
      return null
    })
    return () => timers.forEach(t => t && clearTimeout(t))
  }, [colis, form.express, form.hubId])

  // ── DEVIS (tout backend) ──
  const calculateDevis = useCallback(async () => {
    if (totalPoids <= 0 || !form.hubId) { setError('Veuillez remplir les colis et choisir un hub.'); return }
    const hasValidColis = colis.some(c => (parseFloat(c.poidsKg) || 0) > 0 && (parseFloat(c.volumeM3) || 0) > 0)
    if (!hasValidColis) { setError('Au moins un colis doit avoir poids et volume renseignés.'); return }
    const hasCategorie = colis.some(c => c.categorieId || predictedParColis[colis.indexOf(c)]?.categorieId)
    if (!hasCategorie) { setError('En attente de la prédiction de catégorie...'); return }
    setDevisLoading(true)
    try {
      const data = await demandesService.devis({
        hubId: form.hubId,
        poidsTotalKg: totalPoids,
        volumeTotalM3: totalVolume,
        assurance: form.assurance,
        express: form.express,
        colis: colis.map((c, idx) => ({
          poidsKg: parseFloat(c.poidsKg) || 0,
          volumeM3: parseFloat(c.volumeM3) || 0,
          categorieId: c.categorieId || predictedParColis[idx]?.categorieId || null,
        })),
        latitudeCollecte: form.latitudeCollecte,
        longitudeCollecte: form.longitudeCollecte,
        latitudeLivraison: form.latitudeLivraison,
        longitudeLivraison: form.longitudeLivraison,
      })
      setDevis(data)
      setError(null)
    } catch (e) {
      if (e?.status === 422) {
        setError(e?.body?.message || 'Aucune grille tarifaire active pour cette catégorie. Contactez votre agence.')
      } else {
        setError(e?.message || 'Erreur calcul devis')
      }
      setDevis(null)
    } finally {
      setDevisLoading(false)
    }
  }, [colis, form, predictedParColis, totalPoids, totalVolume])

  useEffect(() => {
    if ((step === 3 || step === 4) && totalPoids > 0 && form.hubId && colis.some(c => (parseFloat(c.poidsKg) || 0) > 0)) {
      const t = setTimeout(() => calculateDevis(), 300)
      return () => clearTimeout(t)
    }
  }, [step, colis, form.hubId, form.assurance, form.express, form.latitudeLivraison, calculateDevis, totalPoids])

  const handlePointPlaced = async (mode, lat, lng) => {
    const rLat = parseFloat(lat.toFixed(6))
    const rLng = parseFloat(lng.toFixed(6))
    if (mode === 'collecte') {
      updateForm('latitudeCollecte', rLat); updateForm('longitudeCollecte', rLng)
      setMapPlacementMode(null)
      try { const rev = await mapsService.reverse(rLat, rLng); if (rev?.display_name) updateForm('adresseCollecte', rev.display_name) } catch {}
    } else {
      updateForm('latitudeLivraison', rLat); updateForm('longitudeLivraison', rLng)
      setMapPlacementMode(null)
      try { const rev = await mapsService.reverse(rLat, rLng); if (rev?.display_name) updateForm('adresseLivraison', rev.display_name) } catch {}
    }
  }

  const handleSubmitDemande = async () => {
    const chosenHub = form.hubId || hubs[0]?.hubId
    if (!chosenHub) { setError('Veuillez choisir une agence avec un hub actif.'); return }
    if (!form.latitudeCollecte || !form.longitudeCollecte) {
      setError('Veuillez définir le point de collecte sur la carte.'); return
    }
    if (!form.latitudeLivraison || !form.longitudeLivraison) {
      setError('Veuillez définir le point de livraison sur la carte.'); return
    }
    if (!form.adresseCollecte || !form.adresseLivraison) {
      setError('Veuillez renseigner les adresses de collecte et de livraison.'); return
    }
    if (colis.length === 0) { setError('Votre commande doit contenir au moins un colis.'); return }
    if (colis.some(c => !c.poidsKg || parseFloat(c.poidsKg) <= 0)) {
      setError('Le poids de chaque colis doit être supérieur à 0.'); return
    }
    if (colis.some(c => !c.volumeM3 || parseFloat(c.volumeM3) <= 0)) {
      setError('Le volume de chaque colis doit être supérieur à 0.'); return
    }
    if (!form.dateSouhaitee) { setError('La date souhaitée est requise.'); return }
    const today = new Date().toISOString().slice(0, 10)
    if (form.dateSouhaitee < today) { setError('La date souhaitée ne peut pas être dans le passé.'); return }
    setSubmitting(true); setError(null)
    try {
      const payload = {
        hubId: chosenHub,
        adresseCollecte: form.adresseCollecte,
        adresseLivraison: form.adresseLivraison,
        latitudeCollecte: form.latitudeCollecte,
        longitudeCollecte: form.longitudeCollecte,
        latitudeLivraison: form.latitudeLivraison,
        longitudeLivraison: form.longitudeLivraison,
        dateSouhaitee: form.dateSouhaitee,
        creneau: form.creneau,
        nomDestinataire: form.nomDestinataire,
        telDestinataire: form.telDestinataire,
        assurance: form.assurance,
        express: form.express,
        colis: colis.map((c, idx) => ({
          poidsKg: parseFloat(c.poidsKg),
          volumeM3: parseFloat(c.volumeM3),
          categorieId: c.categorieId || predictedParColis[idx]?.categorieId || null,
          fragilite: parseInt(c.fragilite) || 0,
          niveauValeur: c.niveauValeur || 'MOYENNE',
        })),
      }
      const res = await demandesService.create(payload)
      setSubmitted(res)
    } catch (e) {
      setError(e.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  const MAP_CENTER = selectedHub?.latitude
    ? [selectedHub.latitude, selectedHub.longitude]
    : [-18.8792, 47.5079]
  const MARKERS = []
  if (form.latitudeCollecte && form.longitudeCollecte)
    MARKERS.push({ pos: [form.latitudeCollecte, form.longitudeCollecte], color: '#3B82F6', icon: collecteIcon, label: 'Collecte' })
  if (form.latitudeLivraison && form.longitudeLivraison)
    MARKERS.push({ pos: [form.latitudeLivraison, form.longitudeLivraison], color: '#E8433D', icon: livraisonIcon, label: 'Livraison' })
  if (selectedHub?.latitude)
    MARKERS.push({ pos: [selectedHub.latitude, selectedHub.longitude], color: '#1A1A1E', icon: hubIcon, label: selectedHub.nom })

  const STEPS = [
    { num: 1, label: 'Agence' },
    { num: 2, label: 'Carte' },
    { num: 3, label: 'Colis & Devis' },
    { num: 4, label: 'Récap & Envoyer' },
  ]

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="bordereau-row p-8 space-y-4 text-center max-w-[650px] mx-auto my-8">
          <div className="stamp-ink stamp-ink-red text-xs mx-auto mb-2">COMMANDE ENREGISTRÉE</div>
          <h3 className="font-display text-xl font-bold text-[#1A1A1E]">Votre demande d'expédition a été transmise</h3>
          <p className="font-body text-xs text-[#8A8A92] leading-relaxed">
            Réf. <strong className="text-[#1A1A1E]">{String(submitted.demandeId).slice(0, 8).toUpperCase()}</strong>
            {' '}&mdash; Agence : <strong className="text-[#1A1A1E]">{form.agencyName || '—'}</strong>
          </p>
          <p className="font-body text-[11px] text-[#8A8A92]">
            Statut : <span className="font-mono font-bold text-[#1A1A1E]">En attente de confirmation</span>
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button onClick={() => navigate('/client/mes_commandes')}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors">
              Consulter dans Mes Expéditions
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[25px] font-bold text-[#1A1A1E] leading-tight">Nouvelle expédition de fret</h1>
        <p className="font-body text-[13.5px] text-[#8A8A92] mt-1">4 étapes : Agence → Carte → Colis & Devis → Envoi.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 sm:gap-4 border-b border-[#ECECEC] pb-3 overflow-x-auto">
        {STEPS.map((s) => (
          <button key={s.num} type="button" onClick={() => { if (s.num < step) setStep(s.num) }}
            className={`flex items-baseline gap-1.5 pb-1 bg-transparent border-0 cursor-pointer whitespace-nowrap ${
              step === s.num ? 'text-[#1A1A1E] font-bold border-b-2 border-[#E8433D]'
              : s.num < step ? 'text-[#E8433D] hover:text-[#B82823]' : 'text-[#8A8A92]'
            }`}>
            <span className="font-mono text-[10px] text-[#E8433D]">{String(s.num).padStart(2, '0')}</span>
            <span className="text-[12px] sm:text-[13.5px] uppercase">{s.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">{error}</div>
      )}

      {/* ═══ ÉTAPE 1 : AGENCE (scoring backend) ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Choisir votre agence</h2>
          <p className="font-body text-[11px] text-[#8A8A92]">Classement par note de recommandation (proximité, fiabilité, disponibilité).</p>
          {scoringLoading ? (
            <p className="font-body text-xs text-[#8A8A92]">Chargement des agences…</p>
          ) : agences.length === 0 ? (
            <p className="font-body text-xs text-[#8A8A92]">Aucune agence disponible.</p>
          ) : (
            <div className="space-y-3">
              {agences.map((ag, idx) => {
                const note5 = ag.score != null ? (Number(ag.score) * 5).toFixed(1) : null
                const pct = ag.score != null ? Math.round(Number(ag.score) * 100) : null
                return (
                  <div key={ag.tenantId}
                    onClick={() => selectAgency(ag)}
                    className={`bordereau-row p-4 cursor-pointer transition-all ${
                      form.agencyId === ag.tenantId ? 'ring-2 ring-[#E8433D] bg-white' : 'hover:border-[#1A1A1E]'
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-sm font-bold text-[#1A1A1E]">{ag.nom}</span>
                          {ag.recommande && <span className="stamp-ink stamp-ink-red text-[9px] px-1.5 py-0.5">★ RECOMMANDÉ</span>}
                          {note5 != null && <span className="font-mono text-[10px] text-[#E8433D] font-bold">{note5}/5</span>}
                        </div>
                        {ag.adresse && <p className="font-body text-[10px] text-[#8A8A92] mt-0.5">{ag.adresse}</p>}
                        {ag.hubNom && <p className="font-body text-[11px] text-[#8A8A92] mt-0.5">Hub : {ag.hubNom}</p>}
                        {pct != null && (
                          <div className="mt-2 h-1.5 bg-[#ECECEC] rounded-full overflow-hidden" style={{maxWidth:120}}>
                            <div className="h-full bg-[#E8433D] rounded-full" style={{width:`${pct}%`}} />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {ag.proximite != null && <span className="font-mono text-[10px] text-[#8A8A92]">Proximité {(Number(ag.proximite)*5).toFixed(1)}/5</span>}
                          {ag.fiabilite != null && <span className="font-mono text-[10px] text-[#8A8A92]">Fiabilité {(Number(ag.fiabilite)*5).toFixed(1)}/5</span>}
                          {ag.delaiEstimeHeures != null && <span className="font-mono text-[10px] text-[#8A8A92]">Délai {ag.delaiEstimeHeures}h</span>}
                        </div>
                        {ag.messageInfo && <p className="font-body text-[10px] text-[#8A8A92] italic mt-1">{ag.messageInfo}</p>}
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 shrink-0 ${
                        form.agencyId === ag.tenantId ? 'border-[#E8433D] bg-[#E8433D]' : 'border-[#ECECEC]'
                      }`}>
                        {form.agencyId === ag.tenantId && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ ÉTAPE 2 : CARTE ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Où collecter / livrer ?</h2>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setMapPlacementMode(mapPlacementMode === 'collecte' ? null : 'collecte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-bold border cursor-pointer transition-all ${
                mapPlacementMode === 'collecte' ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-white text-[#3B82F6] border-[#3B82F6]'
              }`}>
              <span className="material-symbols-outlined text-[14px]">trip_origin</span>Placer Collecte
            </button>
            <button type="button" onClick={() => setMapPlacementMode(mapPlacementMode === 'livraison' ? null : 'livraison')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-bold border cursor-pointer transition-all ${
                mapPlacementMode === 'livraison' ? 'bg-[#E8433D] text-white border-[#E8433D]' : 'bg-white text-[#E8433D] border-[#E8433D]'
              }`}>
              <span className="material-symbols-outlined text-[14px]">place</span>Placer Livraison
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdresseSearchInput label="Adresse de collecte" value={form.adresseCollecte}
              onSelect={(r) => { updateForm('adresseCollecte', r.display_name); updateForm('latitudeCollecte', parseFloat(r.lat)); updateForm('longitudeCollecte', parseFloat(r.lon)) }} />
            <AdresseSearchInput label="Adresse de livraison" value={form.adresseLivraison}
              onSelect={(r) => { updateForm('adresseLivraison', r.display_name); updateForm('latitudeLivraison', parseFloat(r.lat)); updateForm('longitudeLivraison', parseFloat(r.lon)) }} />
          </div>
          <div className="rounded-xl overflow-hidden border border-[#ECECEC]" style={{ height: '350px' }}>
            <MapView center={MAP_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
              <MapClickPlacer mode={mapPlacementMode} onPointPlaced={handlePointPlaced} />
              {MARKERS.map((m, i) => (
                (m.label !== 'Collecte' || form.latitudeCollecte) ? (
                  <DraggableCustomMarker key={i} position={m.pos} icon={m.icon}
                    onDragEnd={(lat, lng) => { if (m.label === 'Collecte') { updateForm('latitudeCollecte', lat); updateForm('longitudeCollecte', lng) } else { updateForm('latitudeLivraison', lat); updateForm('longitudeLivraison', lng) } }}
                    popupTitle={m.label} />
                ) : null
              ))}
            </MapView>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer">← Retour</button>
            <button onClick={() => setStep(3)} disabled={!form.latitudeCollecte || !form.latitudeLivraison}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Suivant : Colis →
            </button>
          </div>
        </div>
      )}

      {/* ═══ ÉTAPE 3 : COLIS + DEVIS ═══ */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Détails des colis</h2>
          {colis.map((c, idx) => (
            <div key={idx} className="bordereau-row p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#E8433D] font-bold">COLIS #{idx + 1}</span>
                {colis.length > 1 && (
                  <button onClick={() => removeColis(idx)} className="font-mono text-[10px] text-[#8A8A92] hover:text-[#E8433D] bg-transparent border-0 cursor-pointer">Supprimer</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Poids (kg)</label>
                  <input type="number" step="0.5" min="0.1" required value={c.poidsKg}
                    onChange={(e) => updateColis(idx, 'poidsKg', e.target.value)} placeholder="Ex: 25"
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Volume (m³)</label>
                  <input type="number" step="0.05" min="0.01" required value={c.volumeM3}
                    onChange={(e) => updateColis(idx, 'volumeM3', e.target.value)} placeholder="Ex: 0.5"
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Catégorie</label>
                  <select value={c.categorieId} onChange={(e) => updateColis(idx, 'categorieId', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]">
                    <option value="">— Prédite automatiquement —</option>
                    {categories.map(cat => (
                      <option key={cat.categorieId} value={cat.categorieId}>{cat.libelle} ({cat.classeCode})</option>
                    ))}
                  </select>
                </div>
              </div>
              {(parseFloat(c.poidsKg) > 10000 || parseFloat(c.volumeM3) > 50) && (
                <div className="flex items-start gap-2 rounded bg-orange-50 border border-orange-200 px-3 py-2">
                  <span className="material-symbols-outlined text-orange-500 text-sm mt-0.5">warning</span>
                  <p className="font-body text-[11px] text-orange-800">
                    Poids ou volume anormalement élevé — votre agence n'a peut-être pas le véhicule adapté.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Fragilité (0-10)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="10" step="1" value={c.fragilite || 5}
                      onChange={(e) => updateColis(idx, 'fragilite', e.target.value)}
                      className="flex-1 h-1.5 bg-[#ECECEC] rounded-lg appearance-none cursor-pointer accent-[#E8433D]" />
                    <span className="font-mono text-[11px] text-[#1A1A1E] font-bold w-6 text-center">{c.fragilite || 5}</span>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Valeur estimée</label>
                  <select value={c.niveauValeur || 'MOYENNE'} onChange={(e) => updateColis(idx, 'niveauValeur', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]">
                    <option value="FAIBLE">Faible (&lt;200k Ar)</option>
                    <option value="MOYENNE">Moyenne (200k–800k Ar)</option>
                    <option value="ELEVEE">Élevée (&gt;800k Ar — bijoux, électronique)</option>
                  </select>
                </div>
              </div>
              {predictedParColis[idx] && !c.categorieId && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="stamp-badge stamp-badge-red text-[9px]">PRÉDITE</span>
                  <span className="font-body text-[11px] text-[#1A1A1E] font-bold">{predictedParColis[idx].libelle} ({predictedParColis[idx].classeCode})</span>
                </div>
              )}
            </div>
          ))}
          <button onClick={addColis} type="button"
            className="flex items-center gap-1.5 font-mono text-xs text-[#E8433D] hover:text-[#B82823] bg-transparent border border-dashed border-[#E8433D] rounded px-4 py-2 cursor-pointer w-full justify-center">
            <span className="material-symbols-outlined text-[14px]">add</span> Ajouter un colis
          </button>
          <div className="bg-[#F7F7F8] p-4 rounded border border-[#ECECEC] space-y-2">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#8A8A92] uppercase font-bold">
              <span className="material-symbols-outlined text-[14px]">calculate</span> Options
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-body text-xs">
              <input type="checkbox" checked={form.assurance} onChange={(e) => { updateForm('assurance', e.target.checked); setDevis(null) }} className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Assurance (+10%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-body text-xs">
              <input type="checkbox" checked={form.express} onChange={(e) => { updateForm('express', e.target.checked); setDevis(null) }} className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Express (+25%)</span>
            </label>
            {devisLoading && <p className="font-body text-[11px] text-[#8A8A92]">Calcul du devis…</p>}
            {devis && (
              <div className="mt-2 p-3 bg-white rounded border border-[#ECECEC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#8A8A92] uppercase">Devis estimé</span>
                  {devis.distanceKm > 0 && <span className="font-mono text-[10px] text-[#8A8A92]">{Number(devis.distanceKm).toLocaleString()} km</span>}
                </div>
                <span className="font-display text-lg font-bold text-[#E8433D] block">
                  {new Intl.NumberFormat('fr-MG').format(devis.montantEstime)} Ar
                </span>
                {devis.detailParCategorie?.length > 0 && (
                  <div className="border-t border-[#ECECEC] pt-2 space-y-1">
                    {devis.detailParCategorie.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="font-body text-[#8A8A92]">{d.categorieLibelle} ({d.nbColis} colis)</span>
                        <span className="font-mono text-[#1A1A1E]">{new Intl.NumberFormat('fr-MG').format(d.partCategorie)} Ar</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer">← Retour</button>
            <button onClick={() => setStep(4)} disabled={colis.some(c => !c.poidsKg || !c.volumeM3)}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Suivant : Récap →
            </button>
          </div>
        </div>
      )}

      {/* ═══ ÉTAPE 4 : RÉCAP & ENVOI ═══ */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Récapitulatif de la commande</h2>
            <div className="bordereau-row p-4 space-y-3">
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold">Planning & Destinataire</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Date souhaitée</label>
                  <input type="date" value={form.dateSouhaitee} min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateForm('dateSouhaitee', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Créneau</label>
                  <select value={form.creneau} onChange={(e) => updateForm('creneau', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]">
                    {CRENEAUX.map(cr => <option key={cr.value} value={cr.value}>{cr.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Nom destinataire</label>
                  <input type="text" value={form.nomDestinataire} onChange={(e) => updateForm('nomDestinataire', e.target.value)}
                    placeholder="Nom complet"
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Tél. destinataire</label>
                  <input type="tel" value={form.telDestinataire} onChange={(e) => updateForm('telDestinataire', e.target.value)}
                    placeholder="+261 34 00 000 00"
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
              </div>
            </div>
            <div className="bordereau-row p-4 space-y-2">
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold">Itinéraire</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-[#8A8A92] text-[11px] block">Collecte :</span><span className="font-mono font-bold text-[#1A1A1E]">{form.adresseCollecte || '—'}</span></div>
                <div><span className="text-[#8A8A92] text-[11px] block">Livraison :</span><span className="font-mono font-bold text-[#E8433D]">{form.adresseLivraison || '—'}</span></div>
              </div>
            </div>
            <div className="bordereau-row p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold">Colis ({colis.length}) — Catégories éditables</span>
                {devisLoading && <span className="font-mono text-[10px] text-[#8A8A92]">Recalcul devis…</span>}
              </div>
              <table className="w-full text-xs">
                <thead><tr className="font-mono text-[10px] text-[#8A8A92] uppercase">
                  <th className="text-left py-1">#</th><th className="text-left py-1">Poids</th><th className="text-left py-1">Volume</th>
                  <th className="text-left py-1">Valeur</th><th className="text-left py-1">Catégorie</th>
                </tr></thead>
                <tbody>
                  {colis.map((c, i) => {
                    const cat = categories.find(ct => ct.categorieId === c.categorieId) || (predictedParColis[i] && !c.categorieId ? predictedParColis[i] : null)
                    const isPredicted = !c.categorieId && predictedParColis[i]
                    return (
                      <tr key={i} className="border-t border-[#ECECEC]">
                        <td className="py-1.5 font-mono text-[#E8433D]">{i + 1}</td>
                        <td className="py-1.5 font-mono">{c.poidsKg || '—'} kg</td>
                        <td className="py-1.5 font-mono">{c.volumeM3 || '—'} m³</td>
                        <td className="py-1.5 font-body">{c.niveauValeur === 'ELEVEE' ? 'Élevée' : c.niveauValeur === 'FAIBLE' ? 'Faible' : 'Moyenne'}</td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-1.5">
                            <select value={c.categorieId} onChange={(e) => updateColis(i, 'categorieId', e.target.value)}
                              className="bg-white border border-[#ECECEC] rounded px-2 py-1 font-mono text-[10px] focus:outline-none focus:border-[#1A1A1E]">
                              <option value="">— Prédite —</option>
                              {categories.map(ct => (
                                <option key={ct.categorieId} value={ct.categorieId}>{ct.libelle} ({ct.classeCode})</option>
                              ))}
                            </select>
                            {isPredicted && <span className="stamp-badge stamp-badge-red text-[8px]">PRÉDITE</span>}
                            {c.categorieId && <span className="stamp-badge text-[8px]" style={{background:'#1A1A1E',color:'#FFF'}}>MANUEL</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1A1A1E] font-bold">
                    <td className="py-1.5 font-mono text-[10px] uppercase">Total</td>
                    <td className="py-1.5 font-mono">{totalPoids} kg</td>
                    <td className="py-1.5 font-mono">{totalVolume} m³</td><td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="bordereau-row p-5 space-y-3 font-body text-xs">
              <div className="border-b border-[#ECECEC] pb-2.5">
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Bordereau</span>
                <span className="font-display font-bold text-sm text-[#1A1A1E]">Récapitulatif</span>
              </div>
              <div className="space-y-2">
                <div><span className="text-[#8A8A92] text-[11px] block">Agence :</span><span className="font-mono font-bold text-[#1A1A1E] text-xs">{form.agencyName || '—'}</span></div>
                <div><span className="text-[#8A8A92] text-[11px] block">Hub :</span>
                  <span className="font-mono font-bold text-[#1A1A1E] text-xs">{selectedHub?.nom || '—'}</span>
                  {selectedHub?.adresse && <span className="font-mono text-[10px] text-[#8A8A92] block">{selectedHub.adresse}</span>}
                </div>
                <div><span className="text-[#8A8A92] text-[11px] block">Colis :</span><span className="font-mono font-bold text-[#1A1A1E]">{colis.length} unité(s)</span></div>
                <div><span className="text-[#8A8A92] text-[11px] block">Poids total :</span><span className="font-mono font-bold text-[#1A1A1E]">{totalPoids} kg</span></div>
                <div><span className="text-[#8A8A92] text-[11px] block">Volume total :</span><span className="font-mono font-bold text-[#1A1A1E]">{totalVolume} m³</span></div>
                {devis && (
                  <div className="pt-2 border-t border-[#ECECEC] space-y-2">
                    {devis.distanceKm > 0 && <div><span className="text-[#8A8A92] text-[11px] block">Distance :</span><span className="font-mono font-bold text-[#1A1A1E]">{Number(devis.distanceKm).toLocaleString()} km</span></div>}
                    {devis.dureeTrajetHeures > 0 && (
                      <div><span className="text-[#8A8A92] text-[11px] block">Duree trajet estimee :</span>
                        <span className="font-mono font-bold text-[#1A1A1E]">{Number(devis.dureeTrajetHeures).toFixed(1)} h</span>
                        {devis.sourceDelai && (
                          <span className={`ml-1 inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold ${
                            devis.sourceDelai === 'OSRM' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-amber-400 bg-amber-50 text-amber-700'
                          }`}>{devis.sourceDelai === 'OSRM' ? 'OSRM' : 'Estime'}</span>
                        )}
                      </div>
                    )}
                    {devis.delaiTransitJours > 0 && (
                      <div><span className="text-[#8A8A92] text-[11px] block">Delai transit :</span>
                        <span className="font-mono font-bold text-[#1A1A1E]">{devis.delaiTransitJours} jour(s)</span>
                      </div>
                    )}
                    {devis.dateDepartCalculee && (
                      <div><span className="text-[#8A8A92] text-[11px] block">Date depart calculee :</span>
                        <span className="font-mono font-bold text-[#E8433D]">{devis.dateDepartCalculee}</span>
                      </div>
                    )}
                    {devis.detailParCategorie?.length > 0 && (
                      <div className="space-y-1">
                        {devis.detailParCategorie.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="font-body text-[#8A8A92]">{d.categorieLibelle} ({d.nbColis} colis)</span>
                            <span className="font-mono text-[#1A1A1E]">{new Intl.NumberFormat('fr-MG').format(d.partCategorie)} Ar</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-1 border-t border-[#ECECEC]">
                      <span className="text-[#8A8A92] text-[11px] block">Devis estimé :</span>
                      <span className="font-display text-lg font-bold text-[#E8433D]">{new Intl.NumberFormat('fr-MG').format(devis.montantEstime)} Ar</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(3)} className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer">← Retour</button>
              <button onClick={handleSubmitDemande} disabled={submitting}
                className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? 'Envoi…' : 'Signer et Transmettre le Bordereau →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
