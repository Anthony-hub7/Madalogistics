import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { hubsService } from '../../services/hubsService'
import { categoriesService } from '../../services/categoriesService'
import { demandesService } from '../../services/demandesService'
import { mapsService } from '../../services/mapsService'
import MapView from '../../map/MapView'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CRENEAUX = [
  { value: '08-11h', label: '08h00 – 11h00' },
  { value: '11-14h', label: '11h00 – 14h00' },
  { value: '14-17h', label: '14h00 – 17h00' },
  { value: '17-20h', label: '17h00 – 20h00' },
]

const markerIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function AdresseSearch({ label, value, onSelect, iconColor: _iconColor }) {
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
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher une adresse..."
          className="w-full bg-transparent font-mono text-xs focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-[#ECECEC] rounded mt-1 shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setQuery(r.display_name); onSelect(r); setOpen(false) }}
              className="w-full text-left px-3 py-2 font-body text-xs hover:bg-[#F7F7F8] border-0 bg-transparent cursor-pointer"
            >
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
  const [step, setStep] = useState(1)
  const [hubs, setHubs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState(null)
  const [devis, setDevis] = useState(null)

  const [form, setForm] = useState({
    hubId: '',
    adresseCollecte: '',
    adresseLivraison: '',
    latitudeCollecte: null,
    longitudeCollecte: null,
    latitudeLivraison: null,
    longitudeLivraison: null,
    dateSouhaitee: '',
    creneau: '',
    nomDestinataire: '',
    telDestinataire: '',
    assurance: true,
    express: false,
  })

  const [colis, setColis] = useState([
    { poidsKg: '', volumeM3: '', categorieId: '' },
  ])

  useEffect(() => {
    Promise.all([
      hubsService.lister().catch(() => []),
      categoriesService.listerActives().catch(() => []),
    ]).then(([h, c]) => { setHubs(h); setCategories(c) })
      .finally(() => setLoading(false))
  }, [])

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const updateColis = (idx, field, value) => {
    setColis(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
    setDevis(null)
  }
  const addColis = () => setColis(prev => [...prev, { poidsKg: '', volumeM3: '', categorieId: '' }])
  const removeColis = (idx) => setColis(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const selectedHub = hubs.find(h => h.hubId === form.hubId)

  const totalPoids = colis.reduce((s, c) => s + (parseFloat(c.poidsKg) || 0), 0)
  const totalVolume = colis.reduce((s, c) => s + (parseFloat(c.volumeM3) || 0), 0)

  const fetchDevis = async () => {
    try {
      const data = await demandesService.devis({
        poidsTotalKg: totalPoids,
        volumeTotalM3: totalVolume,
        assurance: form.assurance,
        express: form.express,
        colis: colis.map(c => ({
          poidsKg: parseFloat(c.poidsKg) || 0,
          volumeM3: parseFloat(c.volumeM3) || 0,
          categorieId: c.categorieId || null,
        })),
        latitudeCollecte: form.latitudeCollecte,
        longitudeCollecte: form.longitudeCollecte,
        latitudeLivraison: form.latitudeLivraison,
        longitudeLivraison: form.longitudeLivraison,
      })
      setDevis(data)
    } catch { setDevis(null) }
  }

  const handleSubmit = async () => {
    if (!form.hubId || colis.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        hubId: form.hubId,
        adresseCollecte: form.adresseCollecte,
        adresseLivraison: form.adresseLivraison,
        latitudeCollecte: form.latitudeCollecte,
        longitudeCollecte: form.longitudeCollecte,
        latitudeLivraison: form.latitudeLivraison,
        longitudeLivraison: form.longitudeLivraison,
        dateSouhaitee: form.dateSouhaitee || null,
        creneau: form.creneau || null,
        nomDestinataire: form.nomDestinataire || null,
        telDestinataire: form.telDestinataire || null,
        assurance: form.assurance,
        express: form.express,
        colis: colis.map(c => ({
          poidsKg: parseFloat(c.poidsKg) || 0,
          volumeM3: parseFloat(c.volumeM3) || 0,
          categorieId: c.categorieId || null,
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

  const MAP_CENTER = selectedHub && selectedHub.latitude
    ? [selectedHub.latitude, selectedHub.longitude]
    : [-18.8792, 47.5079]
  const MARKERS = []
  if (form.latitudeCollecte && form.longitudeCollecte) {
    MARKERS.push({ pos: [form.latitudeCollecte, form.longitudeCollecte], color: '#3B82F6' })
  }
  if (form.latitudeLivraison && form.longitudeLivraison) {
    MARKERS.push({ pos: [form.latitudeLivraison, form.longitudeLivraison], color: '#E8433D' })
  }

  const STEPS = [
    { num: 1, label: 'Hub' },
    { num: 2, label: 'Où livrer' },
    { num: 3, label: 'Colis' },
    { num: 4, label: 'Récap & Envoyer' },
  ]

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="bordereau-row p-8 space-y-4 text-center max-w-[650px] mx-auto my-8">
          <div className="stamp-ink stamp-ink-red text-xs mx-auto mb-2">
            COMMANDE ENREGISTRÉE
          </div>
          <h3 className="font-display text-xl font-bold text-[#1A1A1E]">
            Votre demande d'expédition a été transmise
          </h3>
          <p className="font-body text-xs text-[#8A8A92] leading-relaxed">
            Réf. <strong className="text-[#1A1A1E]">{String(submitted.demandeId).slice(0, 8).toUpperCase()}</strong>
            {' '}&mdash; Tarif estimé : <strong className="text-[#E8433D]">
              {new Intl.NumberFormat('fr-MG').format(submitted.tarif)} Ar
            </strong>
          </p>
          <p className="font-body text-[11px] text-[#8A8A92]">
            Statut : <span className="font-mono font-bold text-[#1A1A1E]">CREEE</span>
            {' '}&mdash; Le gestionnaire va examiner votre commande.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => navigate('/client/mes_commandes')}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors"
            >
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
        <h1 className="font-display text-[25px] font-bold text-[#1A1A1E] leading-tight">
          Nouvelle expédition de fret
        </h1>
        <p className="font-body text-[13.5px] text-[#8A8A92] mt-1">
          4 étapes : Hub → Carte de livraison → Colis → Envoi.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 sm:gap-4 border-b border-[#ECECEC] pb-3 overflow-x-auto">
        {STEPS.map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => { if (s.num < step) setStep(s.num) }}
            className={`flex items-baseline gap-1.5 pb-1 bg-transparent border-0 cursor-pointer whitespace-nowrap ${
              step === s.num
                ? 'text-[#1A1A1E] font-bold border-b-2 border-[#E8433D]'
                : s.num < step
                  ? 'text-[#E8433D] hover:text-[#B82823]'
                  : 'text-[#8A8A92]'
            }`}
          >
            <span className="font-mono text-[10px] text-[#E8433D]">{String(s.num).padStart(2, '0')}</span>
            <span className="text-[12px] sm:text-[13.5px] uppercase">{s.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">
          {error}
        </div>
      )}

      {/* ÉTAPE 1 : HUB */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Choisir le hub de départ</h2>
          {loading ? (
            <p className="font-body text-xs text-[#8A8A92]">Chargement des hubs…</p>
          ) : hubs.length === 0 ? (
            <p className="font-body text-xs text-[#8A8A92]">Aucun hub disponible.</p>
          ) : (
            <div className="space-y-3">
              {hubs.map(hub => (
                <div
                  key={hub.hubId}
                  onClick={() => updateForm('hubId', hub.hubId)}
                  className={`bordereau-row p-4 cursor-pointer transition-all ${
                    form.hubId === hub.hubId ? 'ring-2 ring-[#E8433D] bg-white' : 'hover:border-[#1A1A1E]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-[#E8433D]">warehouse</span>
                      <div>
                        <span className="font-display text-sm font-bold text-[#1A1A1E]">{hub.nom}</span>
                        {hub.adresse && <p className="font-body text-[11px] text-[#8A8A92]">{hub.adresse}</p>}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      form.hubId === hub.hubId ? 'border-[#E8433D] bg-[#E8433D]' : 'border-[#ECECEC]'
                    }`}>
                      {form.hubId === hub.hubId && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => form.hubId && setStep(2)}
              disabled={!form.hubId}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant : Où livrer →
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : CARTE */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Où collecter / livrer ?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdresseSearch
              label="Adresse de collecte (départ)"
              value={form.adresseCollecte}
              onSelect={(r) => {
                updateForm('adresseCollecte', r.display_name)
                updateForm('latitudeCollecte', parseFloat(r.lat))
                updateForm('longitudeCollecte', parseFloat(r.lon))
              }}
              iconColor="#3B82F6"
            />
            <AdresseSearch
              label="Adresse de livraison (arrivée)"
              value={form.adresseLivraison}
              onSelect={(r) => {
                updateForm('adresseLivraison', r.display_name)
                updateForm('latitudeLivraison', parseFloat(r.lat))
                updateForm('longitudeLivraison', parseFloat(r.lon))
              }}
              iconColor="#E8433D"
            />
          </div>

          <div className="rounded-xl overflow-hidden border border-[#ECECEC]" style={{ height: '350px' }}>
            <MapView center={MAP_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
              {MARKERS.map((m, i) => (
                <Marker key={i} position={m.pos} icon={markerIcon(m.color)}>
                  <Popup>{i === 0 ? 'Collecte' : 'Livraison'}</Popup>
                </Marker>
              ))}
            </MapView>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer">
              ← Retour
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm"
            >
              Suivant : Colis →
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : COLIS */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Détails des colis</h2>

          {colis.map((c, idx) => (
            <div key={idx} className="bordereau-row p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#E8433D] font-bold">COLIS #{idx + 1}</span>
                {colis.length > 1 && (
                  <button onClick={() => removeColis(idx)} className="font-mono text-[10px] text-[#8A8A92] hover:text-[#E8433D] bg-transparent border-0 cursor-pointer">
                    Supprimer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Poids (kg)</label>
                  <input type="number" step="0.5" min="0" required value={c.poidsKg}
                    onChange={(e) => updateColis(idx, 'poidsKg', e.target.value)}
                    placeholder="Ex: 25"
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Volume (m³)</label>
                  <input type="number" step="0.05" min="0" required value={c.volumeM3}
                    onChange={(e) => updateColis(idx, 'volumeM3', e.target.value)}
                    placeholder="Ex: 0.5"
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Catégorie</label>
                  <select value={c.categorieId} onChange={(e) => updateColis(idx, 'categorieId', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]">
                    <option value="">— Choisir —</option>
                    {categories.map(cat => (
                      <option key={cat.categorieId} value={cat.categorieId}>
                        {cat.libelle} ({cat.classeCode || cat.classeValeur})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addColis} type="button"
            className="flex items-center gap-1.5 font-mono text-xs text-[#E8433D] hover:text-[#B82823] bg-transparent border border-dashed border-[#E8433D] rounded px-4 py-2 cursor-pointer w-full justify-center">
            <span className="material-symbols-outlined text-[14px]">add</span> Ajouter un colis
          </button>

          <div className="bg-[#F7F7F8] p-4 rounded border border-[#ECECEC] space-y-2">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#8A8A92] uppercase font-bold">
              <span className="material-symbols-outlined text-[14px]">calculate</span> Options & Devis
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-body text-xs">
              <input type="checkbox" checked={form.assurance} onChange={(e) => { updateForm('assurance', e.target.checked); setDevis(null) }}
                className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Assurance (+10%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-body text-xs">
              <input type="checkbox" checked={form.express} onChange={(e) => { updateForm('express', e.target.checked); setDevis(null) }}
                className="rounded text-[#E8433D] focus:ring-[#E8433D]" />
              <span>Express (+25%)</span>
            </label>
            <button type="button" onClick={fetchDevis}
              className="bg-[#1A1A1E] text-white rounded px-4 py-2 font-body font-semibold text-[11px] hover:bg-[#2A2A2E] transition-colors cursor-pointer mt-2">
              Calculer le devis
            </button>
            {devis && (
              <div className="mt-2 p-3 bg-white rounded border border-[#ECECEC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#8A8A92] uppercase">Devis estimé</span>
                  {devis.distanceKm > 0 && (
                    <span className="font-mono text-[10px] text-[#8A8A92]">
                      {Number(devis.distanceKm).toLocaleString()} km
                    </span>
                  )}
                </div>
                <span className="font-display text-lg font-bold text-[#E8433D] block">
                  {new Intl.NumberFormat('fr-MG').format(devis.montantEstime)} Ar
                </span>
                {devis.detailParCategorie && devis.detailParCategorie.length > 0 && (
                  <div className="border-t border-[#ECECEC] pt-2 space-y-1">
                    {devis.detailParCategorie.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="font-body text-[#8A8A92]">
                          {d.categorieLibelle} ({d.nbColis} colis)
                        </span>
                        <span className="font-mono text-[#1A1A1E]">
                          {new Intl.NumberFormat('fr-MG').format(d.partCategorie)} Ar
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer">
              ← Retour
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={colis.some(c => !c.poidsKg || !c.volumeM3)}
              className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant : Récap →
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 : RÉCAP & ENVOI */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <h2 className="font-display text-sm font-bold text-[#1A1A1E]">Récapitulatif de la commande</h2>

            {/* Dates & destinataire */}
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
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Créneau horaire</label>
                  <select value={form.creneau} onChange={(e) => updateForm('creneau', e.target.value)}
                    className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]">
                    <option value="">— Choisir un créneau —</option>
                    {CRENEAUX.map(cr => (
                      <option key={cr.value} value={cr.value}>{cr.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#1A1A1E] mb-1">Nom du destinataire</label>
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

            {/* Récap adresses */}
            <div className="bordereau-row p-4 space-y-2">
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold">Itinéraire</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Collecte :</span>
                  <span className="font-mono font-bold text-[#1A1A1E]">{form.adresseCollecte || '—'}</span>
                </div>
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Livraison :</span>
                  <span className="font-mono font-bold text-[#E8433D]">{form.adresseLivraison || '—'}</span>
                </div>
              </div>
            </div>

            {/* Récap colis */}
            <div className="bordereau-row p-4 space-y-2">
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold">Colis ({colis.length})</span>
              <table className="w-full text-xs">
                <thead>
                  <tr className="font-mono text-[10px] text-[#8A8A92] uppercase">
                    <th className="text-left py-1">#</th>
                    <th className="text-left py-1">Poids</th>
                    <th className="text-left py-1">Volume</th>
                    <th className="text-left py-1">Catégorie</th>
                  </tr>
                </thead>
                <tbody>
                  {colis.map((c, i) => {
                    const cat = categories.find(ct => ct.categorieId === c.categorieId)
                    return (
                      <tr key={i} className="border-t border-[#ECECEC]">
                        <td className="py-1.5 font-mono text-[#E8433D]">{i + 1}</td>
                        <td className="py-1.5 font-mono">{c.poidsKg} kg</td>
                        <td className="py-1.5 font-mono">{c.volumeM3} m³</td>
                        <td className="py-1.5 font-body">{cat ? cat.libelle : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1A1A1E] font-bold">
                    <td className="py-1.5 font-mono text-[10px] uppercase">Total</td>
                    <td className="py-1.5 font-mono">{totalPoids} kg</td>
                    <td className="py-1.5 font-mono">{totalVolume} m³</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Volet latéral */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bordereau-row p-5 space-y-3 font-body text-xs">
              <div className="border-b border-[#ECECEC] pb-2.5">
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Bordereau</span>
                <span className="font-display font-bold text-sm text-[#1A1A1E]">Récapitulatif</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Hub :</span>
                  <span className="font-mono font-bold text-[#1A1A1E] text-xs">{selectedHub?.nom || '—'}</span>
                </div>
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Colis :</span>
                  <span className="font-mono font-bold text-[#1A1A1E]">{colis.length} unité(s)</span>
                </div>
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Poids total :</span>
                  <span className="font-mono font-bold text-[#1A1A1E]">{totalPoids} kg</span>
                </div>
                <div>
                  <span className="text-[#8A8A92] text-[11px] block">Volume total :</span>
                  <span className="font-mono font-bold text-[#1A1A1E]">{totalVolume} m³</span>
                </div>
                {devis && (
                  <div className="pt-2 border-t border-[#ECECEC] space-y-2">
                    {devis.distanceKm > 0 && (
                      <div>
                        <span className="text-[#8A8A92] text-[11px] block">Distance :</span>
                        <span className="font-mono font-bold text-[#1A1A1E]">{Number(devis.distanceKm).toLocaleString()} km</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#8A8A92] text-[11px] block">Devis estimé :</span>
                      <span className="font-display text-lg font-bold text-[#E8433D]">
                        {new Intl.NumberFormat('fr-MG').format(devis.montantEstime)} Ar
                      </span>
                    </div>
                    {devis.detailParCategorie && devis.detailParCategorie.length > 0 && (
                      <div className="space-y-1">
                        {devis.detailParCategorie.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="font-body text-[#8A8A92]">{d.categorieLibelle}</span>
                            <span className="font-mono text-[#1A1A1E]">
                              {new Intl.NumberFormat('fr-MG').format(d.partCategorie)} Ar
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(3)} className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer">
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#E8433D] text-white rounded-md px-6 py-2.5 font-body font-semibold text-xs hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Envoi…' : 'Signer et Transmettre le Bordereau →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
