import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import MapView from '../map/MapView'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Données des Hubs clés de Madagascar (Axe RN7 & Toamasina)
const HUBS_CORRIDOR = [
  { id: 'hub-tana', nom: 'Hub Central Analamanga', ville: 'Antananarivo', coords: [-18.9137, 47.5361], type: 'Hub National', capacite: '1 200 m³/jour', statut: 'Opérationnel' },
  { id: 'hub-antsirabe', nom: 'Hub Vakinankaratra', ville: 'Antsirabe', coords: [-19.8659, 47.0333], type: 'Hub de Transit', capacite: '750 m³/jour', statut: 'Opérationnel' },
  { id: 'hub-ambositra', nom: 'Relais d\'Étape Amoron\'i Mania', ville: 'Ambositra', coords: [-20.5312, 47.2435], type: 'Poste Relais RN7', capacite: '300 m³/jour', statut: 'Opérationnel' },
  { id: 'hub-fianar', nom: 'Hub Régional Haute Matsiatra', ville: 'Fianarantsoa', coords: [-21.4536, 47.0858], type: 'Hub Régional', capacite: '600 m³/jour', statut: 'Opérationnel' },
  { id: 'hub-tamatave', nom: 'Terminal Fret Maritime Atsinanana', ville: 'Toamasina', coords: [-18.1492, 49.4023], type: 'Terminal Portuaire', capacite: '1 500 m³/jour', statut: 'Opérationnel' },
]

// Marqueur Leaflet stylisé pour la carte
const createHubMarkerIcon = (color, label) => L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="background:${color};width:30px;height:30px;border-radius:50%;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffffff;">
        <span class="material-symbols-outlined" style="font-size:16px;">warehouse</span>
      </div>
      <div style="background:#1A1A1E;color:#FFFFFF;font-family:monospace;font-size:8.5px;font-weight:bold;padding:1px 4px;border-radius:2px;margin-top:2px;letter-spacing:0.5px;white-space:nowrap;">
        ${label}
      </div>
    </div>
  `,
  iconSize: [32, 46],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

export default function LandingPage() {
  const navigate = useNavigate()

  // Horloge temps réel opérationnelle pour le registre
  const [currentTime, setCurrentTime] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // État du simulateur de fret express
  const [simDepart, setSimDepart] = useState('Antananarivo')
  const [simArrivee, setSimArrivee] = useState('Fianarantsoa')
  const [simPoids, setSimPoids] = useState(35)
  const [simVolume, setSimVolume] = useState(0.25)
  const [simExpress, setSimExpress] = useState(false)
  const [simAssurance, setSimAssurance] = useState(true)

  // Calcul dynamique du tarif estimatif
  const simTarif = useMemo(() => {
    const distanceKm = simDepart === simArrivee ? 15 : 410
    const baseFee = 12000
    let total = baseFee + (simPoids * 1100) + (simVolume * 24000) + (distanceKm * 25)
    if (simAssurance) total *= 1.10
    if (simExpress) total *= 1.25
    return Math.round(total)
  }, [simDepart, simArrivee, simPoids, simVolume, simExpress, simAssurance])

  // État du suivi express de bordereau
  const [trackRef, setTrackRef] = useState('EXP-772941')
  const [trackedOrder, setTrackedOrder] = useState({
    ref: 'EXP-772941',
    statut: 'COLLECTE_PROGRAMMEE',
    statutLibelle: 'Collecte programmée',
    depart: 'Antananarivo (Ankorondrano)',
    destination: 'Fianarantsoa (Centre-Ville)',
    creneau: '10h15 – 11h00',
    agence: 'MadaLogistix Analamanga Transit',
    stepIndex: 3,
  })

  const handleTrackSubmit = (e) => {
    e.preventDefault()
    if (!trackRef.trim()) return
    setTrackedOrder({
      ref: trackRef.toUpperCase().trim(),
      statut: 'EN_TRANSIT',
      statutLibelle: 'En acheminement RN7',
      depart: 'Antananarivo (Hub Tanjombato)',
      destination: 'Fianarantsoa',
      creneau: 'Livraison estimée : Demain 14h00',
      agence: 'Betsileo Express RN7',
      stepIndex: 5,
    })
  }

  const ETAPES_CYCLE = [
    { num: 1, label: 'Demande' },
    { num: 2, label: 'Confirmée' },
    { num: 3, label: 'Collecte Progr.' },
    { num: 4, label: 'Collectée' },
    { num: 5, label: 'En Transit' },
    { num: 6, label: 'Livrée' },
  ]

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#1A1A1E] font-body selection:bg-[#E8433D] selection:text-white">

      {/* ===== 1. BANDEAU DE REGISTRE SUPÉRIEUR (STATUS BAR RÉSEAU) ===== */}
      <header className="border-b border-[#ECECEC] bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-[#1A1A1E] uppercase tracking-wider">
                CORRIDOR RN7 MADAGASCAR : AXE OUVERT
              </span>
            </div>
            <span className="text-[#8A8A92] hidden md:inline">|</span>
            <span className="font-mono text-[11px] text-[#8A8A92] hidden md:inline">
              HORODATAGE SYSTÈME : <strong className="text-[#1A1A1E]">{currentTime || '12:00:00'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="stamp-badge stamp-badge-red text-[9px] py-0.5 px-1.5 hidden sm:inline-flex">
              FRET & GROUPAGE CERTIFIÉ
            </span>
            <button
              onClick={() => navigate('/login')}
              className="font-mono text-xs font-bold text-[#1A1A1E] hover:text-[#E8433D] transition-colors flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Portail Membres</span>
            </button>
            <button
              onClick={() => navigate('/inscription/client')}
              className="bg-[#E8433D] text-white rounded px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#B82823] transition-colors cursor-pointer shadow-xs"
            >
              Créer un Compte
            </button>
          </div>
        </div>
      </header>

      {/* ===== 2. BARRE PRINCIPALE NAVIGATION / MARQUE REGISTRE ===== */}
      <nav className="border-b-2 border-[#1A1A1E] bg-[#F7F7F8]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="p-1.5 bg-white rounded-lg border border-[#ECECEC] shadow-xs">
              <Logo size={46} showText={false} />
            </div>
            <div>
              <div className="font-display text-2xl font-bold tracking-tight leading-none">
                <span className="text-[#1A1A1E]">Mada</span><span className="text-[#E8433D]">Logistix</span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8A8A92] mt-0.5">
                Bordereau National de Fret & Infrastructure Numérique RN7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 sm:gap-7 font-display text-xs uppercase tracking-wider font-semibold text-[#8A8A92]">
            <a href="#simulateur" className="hover:text-[#1A1A1E] transition-colors text-inherit no-underline">
              01. Simulateur
            </a>
            <a href="#suivi" className="hover:text-[#1A1A1E] transition-colors text-inherit no-underline">
              02. Suivi Bordereau
            </a>
            <a href="#reseau-hubs" className="hover:text-[#1A1A1E] transition-colors text-inherit no-underline">
              03. Carte des Hubs
            </a>
            <a href="#acteurs" className="hover:text-[#1A1A1E] transition-colors text-inherit no-underline">
              04. Portails Métiers
            </a>
          </div>
        </div>
      </nav>

      {/* ===== 3. HERO SECTION : MANIFESTE & BORDEREAU GÉNÉRAL DE FRET ===== */}
      <section className="relative overflow-hidden pt-10 pb-16 border-b border-[#ECECEC]">
        {/* Filigrane d'arrière-plan façon trame papier millimétré et cachets */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A1A1E" strokeWidth="1" strokeDasharray="2 2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Colonne Gauche : Discours de marque & Accroche */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2">
                <span className="stamp-ink stamp-ink-red text-[10px]">
                  RÉSEAU OFFICIEL CORRIDOR RN7
                </span>
                <span className="font-mono text-xs text-[#8A8A92] font-bold">
                  BORDEREAU N° 2026-FRET
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-[#1A1A1E] leading-[1.05]">
                Le Fret Routier Réinventé sur le <span className="text-[#E8433D]">Corridor RN7</span>
              </h1>

              <p className="font-body text-base text-[#64646E] leading-relaxed max-w-xl">
                Plateforme logistique unifiée connectant expéditeurs, agences de transport agréées et chauffeurs. 
                Scoring pondéré d'agences, tarification directe, géolocalisation Leaflet, 
                et cycle d'expédition certifié par signature électronique et preuve de livraison.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/client/nouvelle_demande')}
                  className="bg-[#E8433D] text-white rounded px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wider hover:bg-[#B82823] transition-all cursor-pointer shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Expédier une Marchandise</span>
                </button>

                <a
                  href="#simulateur"
                  className="bg-white border-2 border-[#1A1A1E] text-[#1A1A1E] rounded px-6 py-3 font-display text-sm font-bold uppercase tracking-wider hover:bg-[#F7F7F8] transition-all cursor-pointer no-underline flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">calculate</span>
                  <span>Estimer un Devis</span>
                </a>
              </div>

              {/* Métriques clés en style registre */}
              <div className="pt-6 grid grid-cols-3 gap-3 border-t border-[#ECECEC] font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[#8A8A92] uppercase block">Fiabilité corridor</span>
                  <span className="font-display text-2xl font-bold text-[#1A1A1E]">98.6%</span>
                  <span className="text-[10px] text-emerald-700 block">Livraisons conformes</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8A8A92] uppercase block">Hubs Interconnectés</span>
                  <span className="font-display text-2xl font-bold text-[#E8433D]">12 HUBS</span>
                  <span className="text-[10px] text-[#8A8A92] block">Axe RN7 & Ports</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8A8A92] uppercase block">Délai moyen RN7</span>
                  <span className="font-display text-2xl font-bold text-[#1A1A1E]">24H - 48H</span>
                  <span className="text-[10px] text-[#8A8A92] block">Collecte à livraison</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Maquette de Bordereau d'Expédition Authentique */}
            <div className="lg:col-span-5">
              <div className="bordereau-row p-6 bg-white border-2 border-[#1A1A1E] shadow-xl relative space-y-4">
                
                {/* Cachet rouge en filigrane */}
                <div className="absolute top-4 right-4 rotate-6 select-none pointer-events-none">
                  <div className="border-2 border-[#E8433D] rounded-full w-20 h-20 flex flex-col items-center justify-center text-[#E8433D] font-stamp text-[9px] font-bold text-center p-1 opacity-80">
                    <span>★ MADALOGISTIX ★</span>
                    <span className="text-[7.5px]">CONFORME 2026</span>
                    <span className="text-[7px]">CORRIDOR RN7</span>
                  </div>
                </div>

                <div className="border-b border-[#ECECEC] pb-3">
                  <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold block">
                    Bordereau Pilote Spécimen
                  </span>
                  <h2 className="font-display text-lg font-bold text-[#1A1A1E]">
                    Lettre de Voiture Routière (LVR)
                  </h2>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span className="text-[#8A8A92]">Expéditeur :</span>
                    <strong className="text-[#1A1A1E]">Société Malgache de Fret (Tana)</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span className="text-[#8A8A92]">Itinéraire :</span>
                    <span className="font-bold text-[#3B82F6]">Antananarivo ➔ Fianarantsoa</span>
                  </div>
                  <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span className="text-[#8A8A92]">Marchandises :</span>
                    <span className="text-[#1A1A1E]">Colis groupés (180 kg &middot; 1.4 m³)</span>
                  </div>
                  <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
                    <span className="text-[#8A8A92]">Agence Titulaire :</span>
                    <span className="text-[#1A1A1E] font-bold">MadaLogistix Analamanga</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[#8A8A92]">Statut Certifié :</span>
                    <span className="stamp-ink stamp-ink-neutral text-[9px]">EN COURS D'ACHEMINEMENT</span>
                  </div>
                </div>

                {/* Simulation de signature électronique */}
                <div className="p-3 bg-[#F7F7F8] rounded border border-[#ECECEC] flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[9px] text-[#8A8A92] uppercase block">Contrôle Traçabilité</span>
                    <span className="font-display text-xs font-bold text-emerald-700">✓ POD & Signature Validées</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#1A1A1E] font-bold bg-white px-2 py-1 rounded border border-[#ECECEC]">
                    QR: LVR-7729-RN7
                  </div>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#1A1A1E] text-white rounded py-2.5 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#2A2A2E] transition-colors cursor-pointer"
                >
                  Accéder à votre Registre Personnel →
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== 4. MODULE INTERACTIF : SIMULATEUR DE DEVIS EXPRESS ===== */}
      <section id="simulateur" className="py-16 max-w-[1240px] mx-auto px-4 sm:px-6 border-b border-[#ECECEC]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="stamp-ink stamp-ink-red text-[10px] mx-auto">
            TARIFICATION TRANSPARENTE
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Simulateur Express de Fret
          </h2>
          <p className="font-body text-xs text-[#8A8A92]">
            Évaluez instantanément le coût d'expédition selon la grille tarifaire des agences du corridor RN7.
          </p>
        </div>

        <div className="bordereau-row p-6 sm:p-8 bg-white border border-[#1A1A1E] max-w-4xl mx-auto shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Paramètres de simulation */}
            <div className="space-y-4">
              <div className="border-b border-[#ECECEC] pb-2">
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold block">Critères de Trajet</span>
                <span className="font-display font-bold text-sm text-[#1A1A1E]">Itinéraire de transport</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10.5px] uppercase font-bold text-[#1A1A1E] mb-1">
                    Départ (Collecte)
                  </label>
                  <select
                    value={simDepart}
                    onChange={(e) => setSimDepart(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
                  >
                    <option value="Antananarivo">Antananarivo (Hub Tana)</option>
                    <option value="Antsirabe">Antsirabe (Hub RN7)</option>
                    <option value="Ambositra">Ambositra (Relais)</option>
                    <option value="Fianarantsoa">Fianarantsoa (Sud)</option>
                    <option value="Toamasina">Toamasina (Port)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10.5px] uppercase font-bold text-[#1A1A1E] mb-1">
                    Arrivée (Livraison)
                  </label>
                  <select
                    value={simArrivee}
                    onChange={(e) => setSimArrivee(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#ECECEC] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
                  >
                    <option value="Fianarantsoa">Fianarantsoa (Sud)</option>
                    <option value="Antananarivo">Antananarivo (Hub Tana)</option>
                    <option value="Antsirabe">Antsirabe (Hub RN7)</option>
                    <option value="Ambositra">Ambositra (Relais)</option>
                    <option value="Toamasina">Toamasina (Port)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10.5px] uppercase font-bold text-[#1A1A1E] mb-1">
                    Poids total : <strong className="text-[#E8433D]">{simPoids} kg</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    step="5"
                    value={simPoids}
                    onChange={(e) => setSimPoids(parseFloat(e.target.value))}
                    className="w-full accent-[#E8433D]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10.5px] uppercase font-bold text-[#1A1A1E] mb-1">
                    Volume : <strong className="text-[#E8433D]">{simVolume} m³</strong>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="5"
                    step="0.05"
                    value={simVolume}
                    onChange={(e) => setSimVolume(parseFloat(e.target.value))}
                    className="w-full accent-[#E8433D]"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-body text-xs text-[#1A1A1E]">
                  <input
                    type="checkbox"
                    checked={simAssurance}
                    onChange={(e) => setSimAssurance(e.target.checked)}
                    className="rounded text-[#E8433D] focus:ring-[#E8433D]"
                  />
                  <span>Assurance marchandises déclarées (+10%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-body text-xs text-[#1A1A1E]">
                  <input
                    type="checkbox"
                    checked={simExpress}
                    onChange={(e) => setSimExpress(e.target.checked)}
                    className="rounded text-[#E8433D] focus:ring-[#E8433D]"
                  />
                  <span>Option Express Prioritaire (+25%)</span>
                </label>
              </div>
            </div>

            {/* Résultat Devis Estimé */}
            <div className="bg-[#F7F7F8] p-6 rounded border border-[#ECECEC] flex flex-col justify-between space-y-4">
              <div>
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold block">
                  Estimation Contractuelle Indicative
                </span>
                <span className="font-display text-4xl font-bold text-[#E8433D] tracking-tight block mt-1">
                  {new Intl.NumberFormat('fr-MG').format(simTarif)} Ar
                </span>
                <p className="font-body text-xs text-[#8A8A92] mt-1">
                  Inclut la prise en charge en hub ou collecte à domicile, le suivi temps réel et la preuve POD avec signature.
                </p>
              </div>

              <div className="space-y-1.5 font-mono text-[11px] border-t border-[#ECECEC] pt-3 text-[#64646E]">
                <div className="flex justify-between">
                  <span>Itinéraire estimé :</span>
                  <span className="text-[#1A1A1E] font-bold">{simDepart} ➔ {simArrivee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Délai standard :</span>
                  <span className="text-[#1A1A1E] font-bold">{simExpress ? '24 Heures Express' : '48 Heures Groupage'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sélection agence :</span>
                  <span className="text-emerald-700 font-bold">Scoring pondéré inclus</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/client/nouvelle_demande')}
                className="w-full bg-[#E8433D] text-white rounded py-3 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#B82823] transition-colors cursor-pointer shadow-sm text-center"
              >
                Valider ce devis & Commander en ligne →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ===== 5. MODULE DE SUIVI BORDEREAU EXPRESS EN 8 ÉTAPES ===== */}
      <section id="suivi" className="py-16 max-w-[1240px] mx-auto px-4 sm:px-6 border-b border-[#ECECEC]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="stamp-ink stamp-ink-neutral text-[10px] mx-auto">
            TRAÇABILITÉ VIVANTE
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Suivi Express de Bordereau
          </h2>
          <p className="font-body text-xs text-[#8A8A92]">
            Consultez le statut d'une expédition en temps réel tout au long du cycle de vie logistique.
          </p>
        </div>

        <div className="bordereau-row p-6 sm:p-8 bg-white border border-[#ECECEC] max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleTrackSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A8A92] text-[18px]">search</span>
              <input
                type="text"
                value={trackRef}
                onChange={(e) => setTrackRef(e.target.value)}
                placeholder="Entrez votre N° de bordereau (ex: EXP-772941)..."
                className="w-full border border-[#ECECEC] rounded pl-9 pr-3 py-2.5 font-mono text-xs focus:outline-none focus:border-[#1A1A1E]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1A1A1E] text-white rounded px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#2A2A2E] cursor-pointer"
            >
              Tracer
            </button>
          </form>

          {/* Fiche d'état en direct */}
          <div className="p-4 bg-[#F7F7F8] rounded border border-[#ECECEC] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECECEC] pb-2">
              <div>
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Dossier d'expédition</span>
                <span className="font-mono text-sm font-bold text-[#1A1A1E]">#{trackedOrder.ref}</span>
              </div>
              <div className="stamp-ink stamp-ink-red text-[9.5px]">
                {trackedOrder.statutLibelle}
              </div>
            </div>

            {/* Stepper graphique */}
            <div className="flex items-center justify-between relative px-1 pt-2">
              {ETAPES_CYCLE.map((step, i) => {
                const isDone = trackedOrder.stepIndex >= step.num
                const isCurrent = trackedOrder.stepIndex === step.num
                return (
                  <div key={step.num} className="flex flex-col items-center gap-1.5 flex-1 relative text-center">
                    {i < ETAPES_CYCLE.length - 1 && (
                      <div
                        className={`absolute top-[7px] left-1/2 w-full h-[2px] z-0 ${
                          trackedOrder.stepIndex > step.num ? 'bg-[#E8433D]' : 'bg-[#ECECEC]'
                        }`}
                      />
                    )}
                    <div
                      className={`w-[15px] h-[15px] rounded-full border-2 z-10 transition-all ${
                        isCurrent
                          ? 'bg-[#E8433D] border-[#1A1A1E] ring-2 ring-[#E8433D]/20 scale-110'
                          : isDone
                            ? 'bg-[#E8433D] border-[#E8433D]'
                            : 'bg-white border-[#ECECEC]'
                      }`}
                    />
                    <span
                      className={`font-mono text-[8.5px] uppercase tracking-wider ${
                        isCurrent ? 'text-[#E8433D] font-bold' : isDone ? 'text-[#1A1A1E]' : 'text-[#8A8A92]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2">
              <div>
                <span className="text-[#8A8A92] block text-[10px]">Trajet :</span>
                <strong>{trackedOrder.depart} ➔ {trackedOrder.destination}</strong>
              </div>
              <div>
                <span className="text-[#8A8A92] block text-[10px]">Créneau / Fenêtre :</span>
                <strong className="text-[#E8433D]">{trackedOrder.creneau}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. CARTE DU RÉSEAU DES HUBS RN7 (REACT LEAFLET) ===== */}
      <section id="reseau-hubs" className="py-16 max-w-[1240px] mx-auto px-4 sm:px-6 border-b border-[#ECECEC]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="stamp-ink stamp-ink-neutral text-[10px] mx-auto">
            MAILLAGE TERRITORIAL
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Carte Interactive des Hubs Stratégiques
          </h2>
          <p className="font-body text-xs text-[#8A8A92]">
            Visualisez les centres de consolidation, dépôts et relais le long du corridor national.
          </p>
        </div>

        <div className="bordereau-row overflow-hidden border border-[#1A1A1E] shadow-lg rounded">
          <div className="p-3 bg-white border-b border-[#ECECEC] flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#1A1A1E] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#E8433D]">map</span>
              Réseau Actif : 5 Hubs Principaux d'Affrètement
            </span>
            <span className="font-mono text-[11px] text-[#8A8A92]">
              Coordonnées GPS & Disponibilité en direct
            </span>
          </div>

          <div style={{ height: '420px', width: '100%' }}>
            <MapView center={[-19.8, 47.5]} zoom={7} style={{ height: '100%', width: '100%' }}>
              {HUBS_CORRIDOR.map((hub) => (
                <Marker
                  key={hub.id}
                  position={hub.coords}
                  icon={createHubMarkerIcon('#E8433D', hub.ville)}
                >
                  <Popup>
                    <div className="font-mono text-xs p-1">
                      <strong className="text-sm font-display text-[#1A1A1E] block">{hub.nom}</strong>
                      <span className="text-[10px] text-[#E8433D] font-bold block">{hub.type}</span>
                      <p className="text-[11px] text-[#8A8A92] my-1">Capacité : {hub.capacite}</p>
                      <span className="stamp-ink stamp-ink-neutral text-[8px] py-0.5 px-1.5">
                        STATUT : {hub.statut.toUpperCase()}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapView>
          </div>

          <div className="p-3 bg-[#F7F7F8] border-t border-[#ECECEC] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#8A8A92]">
            <span>Légende : Hubs de consolidation et d'éclatement de cargaison RN7</span>
            <span className="text-[#1A1A1E] font-bold">Couverture opérationnelle garantie 6j/7</span>
          </div>
        </div>
      </section>

      {/* ===== 7. PRÉSENTATION DES 3 ACTEURS / PORTAILS MÉTIERS ===== */}
      <section id="acteurs" className="py-16 max-w-[1240px] mx-auto px-4 sm:px-6 border-b border-[#ECECEC]">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="stamp-ink stamp-ink-red text-[10px] mx-auto">
            ÉCOSYSTÈME LOGISTIQUE
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-[#1A1A1E]">
            Conçu pour Tous les Acteurs du Fret
          </h2>
          <p className="font-body text-xs text-[#8A8A92]">
            Un environnement dédié et sécurisé pour chaque maillon de la chaîne d'approvisionnement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Expéditeurs */}
          <div className="bordereau-row p-6 bg-white border border-[#ECECEC] space-y-4 hover:border-[#1A1A1E] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded bg-red-50 text-[#E8433D] flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">local_shipping</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#1A1A1E] uppercase">
                Pour les Expéditeurs
              </h3>
              <p className="font-body text-xs text-[#64646E] leading-relaxed">
                PME, commerçants ou particuliers : bénéficiez d'une recommandation pondérée d'agences, 
                de devis transparents et de preuves de livraison photo + signature.
              </p>
              <ul className="font-mono text-[11px] text-[#8A8A92] space-y-1.5 list-none pl-0">
                <li>✓ Pose de points sur carte Leaflet</li>
                <li>✓ Factures officielles téléchargeables</li>
                <li>✓ Annulation libre avant groupage</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/inscription/client')}
              className="w-full bg-[#1A1A1E] text-white rounded py-2 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#2A2A2E] cursor-pointer"
            >
              Ouvrir un Compte Client →
            </button>
          </div>

          {/* 2. Agences prestataires */}
          <div className="bordereau-row p-6 bg-white border border-[#ECECEC] space-y-4 hover:border-[#E8433D] transition-all flex flex-col justify-between ring-1 ring-[#E8433D]/20">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded bg-red-500 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">apartment</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#1A1A1E] uppercase">
                Pour les Agences de Transport
              </h3>
              <p className="font-body text-xs text-[#64646E] leading-relaxed">
                Opérateurs de fret et commissionnaires : intégrez le réseau SaaS multi-tenant, 
                gérez votre grille tarifaire, validez ou refusez les demandes et assignez vos hubs.
              </p>
              <ul className="font-mono text-[11px] text-[#8A8A92] space-y-1.5 list-none pl-0">
                <li>✓ Algorithme de recommandation agence</li>
                <li>✓ Gestion de tournées et groupage</li>
                <li>✓ Tableau de bord de décision</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/inscription/agence')}
              className="w-full bg-[#E8433D] text-white rounded py-2 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#B82823] cursor-pointer shadow-xs"
            >
              Inscrire mon Agence →
            </button>
          </div>

          {/* 3. Chauffeurs routiers */}
          <div className="bordereau-row p-6 bg-white border border-[#ECECEC] space-y-4 hover:border-[#1A1A1E] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded bg-slate-100 text-[#1A1A1E] flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">badge</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#1A1A1E] uppercase">
                Pour les Chauffeurs
              </h3>
              <p className="font-body text-xs text-[#64646E] leading-relaxed">
                Conducteurs rattachés ou chauffeurs freelance : accédez à vos ordres de mission, 
                itinéraires optimisés hors-ligne et outils d'émargement électronique.
              </p>
              <ul className="font-mono text-[11px] text-[#8A8A92] space-y-1.5 list-none pl-0">
                <li>✓ Mode hors-ligne PWA complet</li>
                <li>✓ Capture photo & signature sur mobile</li>
                <li>✓ Tournées optimisées RN7</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/inscription/chauffeur')}
              className="w-full bg-[#1A1A1E] text-white rounded py-2 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#2A2A2E] cursor-pointer"
            >
              Espace Conducteur →
            </button>
          </div>
        </div>
      </section>

      {/* ===== 8. FOOTER : REGISTRE ADMINISTRATIF & MENTIONS LÉGALES ===== */}
      <footer className="bg-[#1A1A1E] text-white py-12">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#373740] pb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#E8433D] rounded flex items-center justify-center font-display font-bold text-lg text-white">
                M
              </div>
              <div>
                <span className="font-display text-2xl font-bold uppercase tracking-tight block">
                  MadaLogistix
                </span>
                <span className="font-mono text-[10px] text-[#A0A0AA] uppercase tracking-wider">
                  Système d'Information & Registre du Fret Routier Malgache
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-[#1A1A1E] rounded px-4 py-2 font-display text-xs font-bold uppercase tracking-wider hover:bg-[#ECECEC] transition-colors cursor-pointer"
              >
                Connexion Portail Membres
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-xs text-[#A0A0AA]">
            <div>
              <span className="text-white font-bold uppercase block mb-2">Axes Couverts</span>
              <ul className="space-y-1 list-none pl-0">
                <li>Axe RN7 (Tana ⇄ Fianar)</li>
                <li>Axe RN2 (Tana ⇄ Tamatave)</li>
                <li>Réseau Vakinankaratra</li>
                <li>Liaisons Portuaires</li>
              </ul>
            </div>
            <div>
              <span className="text-white font-bold uppercase block mb-2">Services Métiers</span>
              <ul className="space-y-1 list-none pl-0">
                <li>Expédition de colis</li>
                <li>Fret lourd & groupage</li>
                <li>Location utilitaires</li>
                <li>Affrètement dédié</li>
              </ul>
            </div>
            <div>
              <span className="text-white font-bold uppercase block mb-2">Conformité</span>
              <ul className="space-y-1 list-none pl-0">
                <li>Bordereau certifié LVR</li>
                <li>Horodatage probant</li>
                <li>Preuve POD électronique</li>
                <li>Facturation réglementaire</li>
              </ul>
            </div>
            <div>
              <span className="text-white font-bold uppercase block mb-2">Assistance Terrain</span>
              <ul className="space-y-1 list-none pl-0">
                <li>Support Opérations 24/7</li>
                <li>Sécurité convoi routier</li>
                <li>Radio relais VHF/GSM</li>
                <li>contact@madalogistix.mg</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#373740] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[#8A8A92]">
            <p>&copy; 2026 MadaLogistix. Registre Officiel Opérations de Fret. Tous droits réservés.</p>
            <div className="flex gap-4">
              <a href="#" className="text-[#8A8A92] hover:text-white transition-colors">Conditions Générales de Transport</a>
              <a href="#" className="text-[#8A8A92] hover:text-white transition-colors">Politique de Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
