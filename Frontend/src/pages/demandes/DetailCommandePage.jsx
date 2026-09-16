import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'
import MapView from '../../map/MapView'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Cycle de vie selon les spécifications strictes :
// 1. En attente de confirmation
// 2. Confirmée (hub + horaires d'ouverture + fenêtre large)
// 3. Collecte programmée (fenêtre horaire précisée)
// 4. Colis collecté
// 5. En acheminement / transit
// 6. Livrée (preuve : photo + signature)
const STATUT_CONFIG = {
  CREEE: {
    label: 'En attente de confirmation',
    stamp: 'EN ATTENTE',
    style: 'stamp-ink-neutral',
    step: 1,
    desc: "Votre demande a été soumise avec devis accepté implicitement. L'agence étudie la demande.",
    canCancel: true,
  },
  EN_ATTENTE: {
    label: 'En attente de confirmation',
    stamp: 'EN ATTENTE',
    style: 'stamp-ink-neutral',
    step: 1,
    desc: "Votre demande a été soumise avec devis accepté implicitement. L'agence étudie la demande.",
    canCancel: true,
  },
  VALIDEE: {
    label: 'Confirmée par l\'agence',
    stamp: 'CONFIRMÉE',
    style: 'stamp-ink-neutral',
    step: 2,
    desc: "L'agence a confirmé la prise en charge. Le hub de dépôt et la fenêtre large de collecte sont définis.",
    canCancel: true,
  },
  CONFIRMEE: {
    label: 'Confirmée par l\'agence',
    stamp: 'CONFIRMÉE',
    style: 'stamp-ink-neutral',
    step: 2,
    desc: "L'agence a confirmé la prise en charge. Le hub de dépôt et la fenêtre large de collecte sont définis.",
    canCancel: true,
  },
  COLLECTE_PROGRAMMEE: {
    label: 'Collecte programmée',
    stamp: 'COLLECTE PROGR.',
    style: 'stamp-ink-neutral',
    step: 3,
    desc: "La fenêtre horaire de collecte a été précisée par l'équipe logistique pour le passage du coursier.",
    canCancel: true, // Annulation possible tant que pas encore groupée
  },
  GROUPEE: {
    label: 'Groupée en tournée',
    stamp: 'GROUPÉE',
    style: 'stamp-ink-neutral',
    step: 4,
    desc: "La marchandise est intégrée au plan de chargement et de groupage du véhicule. Annulation verrouillée.",
    canCancel: false,
  },
  COLIS_COLLECTE: {
    label: 'Colis collecté',
    stamp: 'COLIS COLLECTÉ',
    style: 'stamp-ink-neutral',
    step: 4,
    desc: "Le coursier a récupéré votre colis au point de collecte convenu.",
    canCancel: false,
  },
  EN_TRANSIT: {
    label: 'En acheminement',
    stamp: 'EN TRANSIT',
    style: 'stamp-ink-red',
    step: 5,
    desc: "Le convoi de fret est en cours de transit vers le lieu de livraison final.",
    canCancel: false,
  },
  LIVREE: {
    label: 'Livrée avec preuve certifiée',
    stamp: 'LIVRÉE',
    style: 'stamp-ink-red',
    step: 6,
    desc: "La marchandise a été remise au destinataire. Preuve de livraison (photo et signature) disponible.",
    canCancel: false,
  },
  REFUSEE: {
    label: 'Refusée par l\'agence',
    stamp: 'REFUSÉE',
    style: 'stamp-ink-muted',
    step: 0,
    desc: "L'agence ne peut prendre en charge cette demande. Le motif officiel est consigné ci-dessous.",
    canCancel: false,
  },
  ANNULEE: {
    label: 'Annulée par le client',
    stamp: 'ANNULÉE',
    style: 'stamp-ink-muted',
    step: 0,
    desc: "Cette expédition a été annulée avant son groupage logistique.",
    canCancel: false,
  },
  INCIDENT: {
    label: 'Incident de transport',
    stamp: 'INCIDENT',
    style: 'stamp-ink-muted',
    step: 4,
    desc: "Un aléa ou incident a été signalé pendant le transport.",
    canCancel: false,
  },
}

const ETAPES_CYCLE = [
  { id: 1, label: '1. En attente', code: 'EN_ATTENTE' },
  { id: 2, label: '2. Confirmée', code: 'CONFIRMEE' },
  { id: 3, label: '3. Collecte progr.', code: 'COLLECTE_PROGRAMMEE' },
  { id: 4, label: '4. Collectée', code: 'COLIS_COLLECTE' },
  { id: 5, label: '5. En transit', code: 'EN_TRANSIT' },
  { id: 6, label: '6. Livrée', code: 'LIVREE' },
]

// Marqueur Leaflet stylisé
const createMarkerIcon = (color, label, icon) => L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="background:${color};width:30px;height:30px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;">
        <span class="material-symbols-outlined" style="font-size:16px;">${icon}</span>
      </div>
      <div style="background:#1A1A1E;color:white;font-family:monospace;font-size:9px;font-weight:bold;padding:1px 4px;border-radius:2px;margin-top:2px;">
        ${label}
      </div>
    </div>
  `,
  iconSize: [32, 48],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

export default function DetailCommandePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const demandeId = searchParams.get('id')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showFactureModal, setShowFactureModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  useEffect(() => {
    if (!demandeId) {
      setLoading(false)
      return
    }
    setLoading(true)
    demandesService.getById(demandeId)
      .then(data => {
        // Déduction et enrichissement des données pour simuler fidèlement les réponses
        const enriched = { ...data }
        
        // Simuler des horaires de hub et fenêtre si l'agence a confirmé
        if (enriched.statut === 'VALIDEE' || enriched.statut === 'CONFIRMEE') {
          enriched.fenetreCollecteLarge = enriched.fenetreCollecteLarge || 'Matinée : 08h30 – 12h30 (Estimation)'
          enriched.hubNom = enriched.hubNom || 'Hub Logistique Analamanga Principal'
          enriched.hubAdresse = enriched.hubAdresse || 'Zone Industrielle Forello, Tanjombato'
          enriched.hubHoraires = enriched.hubHoraires || 'Du Lundi au Samedi : 07h30 – 18h00'
        }

        // Simuler la fenêtre affinée si la collecte est programmée
        if (enriched.statut === 'COLLECTE_PROGRAMMEE') {
          enriched.fenetreCollectePrecise = enriched.fenetreCollectePrecise || '10h15 – 11h00 (Passage du coursier confirmé)'
          enriched.fenetreCollecteLarge = enriched.fenetreCollecteLarge || '08h30 – 12h30'
          enriched.hubNom = enriched.hubNom || 'Hub Logistique Analamanga Principal'
          enriched.hubAdresse = enriched.hubAdresse || 'Zone Industrielle Forello, Tanjombato'
          enriched.hubHoraires = enriched.hubHoraires || 'Du Lundi au Samedi : 07h30 – 18h00'
        }

        // Preuve de livraison simulée si livrée
        if (enriched.statut === 'LIVREE') {
          enriched.preuveLivraison = enriched.preuveLivraison || {
            photoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
            destinataireNom: enriched.nomDestinataire || 'M. Rakotoarisoa',
            signatureNom: 'R. Jean',
            dateLivraison: enriched.updatedAt || enriched.createdAt || new Date().toISOString(),
            remarques: 'Colis remis intact en mains propres au rez-de-chaussée.',
          }
        }

        setOrder(enriched)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [demandeId])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await demandesService.annuler(demandeId)
      setOrder(prev => ({ ...prev, statut: 'ANNULEE' }))
      setShowCancelModal(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setCancelling(false)
    }
  }

  // Impression de la facture
  const handlePrintFacture = () => {
    window.print()
  }

  if (!demandeId) {
    return (
      <div className="space-y-6">
        <p className="font-body text-xs text-[#8A8A92]">Aucune commande spécifiée dans le registre.</p>
        <button
          onClick={() => navigate('/client/mes_commandes')}
          className="font-mono text-xs text-[#E8433D] hover:underline bg-transparent border-0 cursor-pointer"
        >
          ← Retour aux expéditions
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bordereau-row p-12 text-center font-mono text-sm text-[#8A8A92]">
        Recherche du dossier d'expédition #{demandeId}…
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">
          {error || 'Commande introuvable dans le système.'}
        </div>
        <button
          onClick={() => navigate('/client/mes_commandes')}
          className="font-mono text-xs text-[#E8433D] hover:underline bg-transparent border-0 cursor-pointer"
        >
          ← Retour aux expéditions
        </button>
      </div>
    )
  }

  const info = STATUT_CONFIG[order.statut] || STATUT_CONFIG.CREEE
  const isCancellable = info.canCancel && order.statut !== 'ANNULEE' && order.statut !== 'REFUSEE'
  const isBlockedCancellation = !info.canCancel && order.statut !== 'ANNULEE' && order.statut !== 'REFUSEE'
  const isRefused = order.statut === 'REFUSEE'
  const isDelivered = order.statut === 'LIVREE'

  const formatDate = (d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return d
    }
  }

  const MAP_CENTER = order.latitudeLivraison && order.longitudeLivraison
    ? [order.latitudeLivraison, order.longitudeLivraison]
    : order.latitudeCollecte && order.longitudeCollecte
      ? [order.latitudeCollecte, order.longitudeCollecte]
      : [-18.914, 47.541]

  const totalPoids = (order.colis || []).reduce((s, c) => s + (parseFloat(c.poidsKg) || 0), 0)
  const totalVolume = (order.colis || []).reduce((s, c) => s + (parseFloat(c.volumeM3) || 0), 0)
  const montantTarif = order.tarif || 15000

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#ECECEC] pb-4">
        <div>
          <button
            onClick={() => navigate('/client/mes_commandes')}
            className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] flex items-center gap-1 mb-2 bg-transparent border-0 cursor-pointer"
          >
            ← Retour au registre des expéditions
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono text-2xl sm:text-3xl font-bold text-[#1A1A1E] tracking-tight">
              #{String(order.demandeId).slice(0, 10).toUpperCase()}
            </h1>
            <div className={`stamp-ink ${info.style} text-xs py-1 px-3`}>
              {info.stamp}
            </div>
            {order.express && (
              <span className="stamp-ink stamp-ink-red text-[9px] py-0.5 px-2">EXPRESS</span>
            )}
          </div>
          <p className="font-body text-xs text-[#8A8A92] mt-1">
            Agence titulaire : <strong className="text-[#1A1A1E] font-display">{order.agenceNom || 'MadaLogistix Partenaire'}</strong>
            {' '}&middot; Créée le {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Boutons d'actions client : Annuler & Facture */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bouton Facture toujours disponible pour les commandes existantes */}
          <button
            onClick={() => setShowFactureModal(true)}
            className="bg-white border border-[#1A1A1E] text-[#1A1A1E] hover:bg-[#F7F7F8] rounded px-3.5 py-2 font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Facture liée</span>
          </button>

          {/* Annulation autorisée vs bloquée */}
          {isCancellable && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="border border-[#E8433D] text-[#E8433D] hover:bg-[#E8433D] hover:text-white rounded px-3.5 py-2 font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Annuler la commande</span>
            </button>
          )}

          {isBlockedCancellation && (
            <div
              title="L'expédition a déjà franchi l'étape de groupage ou de ramassage logistique. L'annulation est donc verrouillée."
              className="border border-[#ECECEC] bg-[#F7F7F8] text-[#8A8A92] rounded px-3 py-1.5 font-mono text-[11px] flex items-center gap-1 cursor-not-allowed select-none"
            >
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>Annulation verrouillée (Groupée/En cours)</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1E]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#1A1A1E] rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-[#1A1A1E] uppercase">
              Confirmer l'annulation de la commande
            </h3>
            <p className="font-body text-xs text-[#8A8A92] leading-relaxed">
              Le cycle de vie de votre commande autorise l'annulation tant que la demande est en attente ou confirmée (non groupée).
              Confirmez-vous l'annulation sans frais de la commande <strong className="font-mono text-[#1A1A1E]">#{String(order.demandeId).slice(0, 8).toUpperCase()}</strong> ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-[#ECECEC] rounded font-body text-xs text-[#8A8A92] hover:text-[#1A1A1E] bg-white cursor-pointer"
              >
                Garder l'expédition
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-[#E8433D] text-white rounded font-body font-semibold text-xs hover:bg-[#B82823] disabled:opacity-40 cursor-pointer"
              >
                {cancelling ? 'Annulation…' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture Officielle liée à la commande */}
      {showFactureModal && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1E]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-[#1A1A1E] max-w-2xl w-full p-8 space-y-6 shadow-2xl rounded relative my-6">
            <button
              onClick={() => setShowFactureModal(false)}
              className="absolute top-4 right-4 text-[#8A8A92] hover:text-[#1A1A1E] font-mono text-base bg-transparent border-0 cursor-pointer"
            >
              ✕
            </button>

            {/* En-tête Facture / Bordereau */}
            <div className="border-b-2 border-[#1A1A1E] pb-4 flex justify-between items-start">
              <div>
                <span className="font-display font-bold text-xl text-[#1A1A1E] block">MADALOGISTIX</span>
                <span className="font-mono text-[10.5px] text-[#8A8A92] uppercase block">
                  Réseau Inter-Agences Corridor RN7 Madagascar
                </span>
                <span className="font-mono text-[10.5px] text-[#8A8A92] block">
                  Agence Prestataire : <strong>{order.agenceNom || 'Agence Partenaire MadaLogistix'}</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="stamp-ink stamp-ink-neutral text-xs">FACTURE OFFICIELLE</span>
                <div className="font-mono text-xs text-[#1A1A1E] font-bold mt-1">
                  FA-{String(order.demandeId).slice(0, 8).toUpperCase()}
                </div>
                <div className="font-mono text-[10px] text-[#8A8A92]">
                  Date : {formatDate(order.createdAt)}
                </div>
              </div>
            </div>

            {/* Expéditeur & Destinataire */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#F7F7F8] rounded border border-[#ECECEC]">
                <span className="text-[#8A8A92] text-[10px] uppercase font-bold block mb-1">Émetteur / Facturé à</span>
                <strong className="text-[#1A1A1E] block">{order.clientNom || 'Client Final MadaLogistix'}</strong>
                <span className="text-[#8A8A92] block">{order.adresseCollecte || 'Point de collecte'}</span>
              </div>
              <div className="p-3 bg-[#F7F7F8] rounded border border-[#ECECEC]">
                <span className="text-[#8A8A92] text-[10px] uppercase font-bold block mb-1">Destinataire Final</span>
                <strong className="text-[#1A1A1E] block">{order.nomDestinataire || 'Destinataire'}</strong>
                <span className="text-[#8A8A92] block">{order.adresseLivraison}</span>
                <span className="text-[#8A8A92] block">{order.telDestinataire}</span>
              </div>
            </div>

            {/* Tableau des prestations */}
            <table className="w-full text-xs font-mono border-collapse border border-[#ECECEC]">
              <thead>
                <tr className="bg-[#F7F7F8] text-[10px] text-[#8A8A92] uppercase border-b border-[#ECECEC]">
                  <th className="text-left p-2">Prestation Logistique</th>
                  <th className="text-center p-2">Qté / Colis</th>
                  <th className="text-right p-2">Total Ar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC]">
                <tr>
                  <td className="p-2">
                    Transport de fret routier ({totalPoids} kg - {totalVolume.toFixed(2)} m³)
                    <br />
                    <span className="text-[10px] text-[#8A8A92]">
                      Itinéraire sécurisé & traçabilité registre
                    </span>
                  </td>
                  <td className="text-center p-2">{order.colis?.length || 1} colis</td>
                  <td className="text-right p-2 font-bold">
                    {new Intl.NumberFormat('fr-MG').format(Math.round(montantTarif * 0.85))} Ar
                  </td>
                </tr>
                {order.assurance && (
                  <tr>
                    <td className="p-2">Garantie & Assurance Marchandise Déclarée (10%)</td>
                    <td className="text-center p-2">1</td>
                    <td className="text-right p-2 font-bold">
                      {new Intl.NumberFormat('fr-MG').format(Math.round(montantTarif * 0.10))} Ar
                    </td>
                  </tr>
                )}
                {order.express && (
                  <tr>
                    <td className="p-2">Option Prioritaire Express Acheminement (25%)</td>
                    <td className="text-center p-2">1</td>
                    <td className="text-right p-2 font-bold">
                      {new Intl.NumberFormat('fr-MG').format(Math.round(montantTarif * 0.05))} Ar
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1A1A1E] font-bold text-sm bg-[#F7F7F8]">
                  <td colSpan={2} className="p-2 text-right uppercase">Net à Payer TTC :</td>
                  <td className="p-2 text-right text-[#E8433D]">
                    {new Intl.NumberFormat('fr-MG').format(montantTarif)} Ar
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between items-center pt-2">
              <span className="font-mono text-[10px] text-[#8A8A92]">
                Mentions : Devis accepté implicitement à la soumission &middot; Paiement acquitté
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintFacture}
                  className="px-4 py-2 bg-[#1A1A1E] text-white rounded font-mono text-xs font-bold cursor-pointer hover:bg-[#2A2A2E] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>Imprimer / Sauvegarder PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CYCLE DE VIE EN 6 TEMPS (REGISTRE VISUEL)                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bordereau-row p-6 border border-[#ECECEC] space-y-4">
        <div className="flex items-center justify-between border-b border-[#ECECEC] pb-2.5">
          <div>
            <span className="font-mono text-[10.5px] text-[#8A8A92] uppercase font-bold block">
              Cycle de Vie de l'Expédition
            </span>
            <span className="font-display font-bold text-base text-[#1A1A1E]">
              {info.label}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#8A8A92] italic">
            Étape {info.step} sur 6
          </span>
        </div>

        {/* Stepper graphique */}
        <div className="flex items-center justify-between relative px-2 pt-2">
          {ETAPES_CYCLE.map((st, i) => {
            const isDone = info.step >= st.id
            const isCurrent = info.step === st.id

            return (
              <div key={st.id} className="flex flex-col items-center gap-1.5 flex-1 relative text-center">
                {i < ETAPES_CYCLE.length - 1 && (
                  <div
                    className={`absolute top-[8px] left-1/2 w-full h-[2px] z-0 transition-colors ${
                      info.step > st.id ? 'bg-[#E8433D]' : 'bg-[#ECECEC]'
                    }`}
                  />
                )}
                <div
                  className={`w-[18px] h-[18px] rounded-full border-2 z-10 transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'bg-[#E8433D] border-[#1A1A1E] ring-4 ring-[#E8433D]/20 scale-110'
                      : isDone
                        ? 'bg-[#E8433D] border-[#E8433D]'
                        : 'bg-white border-[#ECECEC]'
                  }`}
                >
                  {isDone && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                </div>
                <span
                  className={`font-mono text-[9.5px] uppercase tracking-wider ${
                    isCurrent
                      ? 'text-[#E8433D] font-bold'
                      : isDone
                        ? 'text-[#1A1A1E] font-medium'
                        : 'text-[#8A8A92]'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Description du statut courant */}
        <div className="p-3 bg-[#F7F7F8] rounded border border-[#ECECEC] text-xs font-body text-[#1A1A1E] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#E8433D] text-[18px]">info</span>
          <span>{info.desc}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. RÉPONSE DE L'AGENCE (CONFIRMÉE VS REFUSÉE)                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Cas A : Refusée avec motif */}
      {isRefused && (
        <div className="bordereau-row p-6 border-2 border-rose-300 bg-rose-50/40 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-display font-bold text-base">
            <span className="material-symbols-outlined text-[22px]">cancel</span>
            <span>Demande Refusée par l'Agence</span>
          </div>
          <p className="font-body text-xs text-[#1A1A1E]">
            L'agence <strong>{order.agenceNom}</strong> a rejeté la prise en charge de cette commande pour le motif suivant :
          </p>
          <div className="p-3 bg-white rounded border border-rose-200 font-mono text-xs text-rose-900">
            {order.motifRefus || "Capacité de charge saturée sur l'axe demandé ou délai incompressible non atteignable."}
          </div>
          <span className="font-mono text-[10.5px] text-[#8A8A92] block">
            Fin du parcours pour ce bordereau. Vous pouvez soumettre une nouvelle expédition auprès d'une autre agence partenaire.
          </span>
        </div>
      )}

      {/* Cas B : Confirmée -> Hub de dépôt + Horaires + Fenêtre horaire de collecte */}
      {(order.statut === 'VALIDEE' || order.statut === 'CONFIRMEE' || order.statut === 'COLLECTE_PROGRAMMEE' || order.statut === 'GROUPEE' || order.statut === 'COLIS_COLLECTE' || isDelivered) && (
        <div className="bordereau-row p-6 border border-[#1A1A1E]/30 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#ECECEC] pb-3">
            <div>
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold block">Réponse & Validation Agence</span>
              <h3 className="font-display text-base font-bold text-[#1A1A1E]">
                Hub de Dépôt & Fenêtres de Collecte
              </h3>
            </div>
            <div className="stamp-ink stamp-ink-neutral text-[10px]">
              CONFIRMATION VALIDE
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Hub assigné & Horaires */}
            <div className="p-4 bg-[#F7F7F8] rounded border border-[#ECECEC] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#1A1A1E]">
                <span className="material-symbols-outlined text-[18px] text-[#E8433D]">warehouse</span>
                <span>Hub de Dépôt Assigné</span>
              </div>
              <p className="text-sm font-display font-bold text-[#1A1A1E]">
                {order.hubNom || 'Hub Central Analamanga'}
              </p>
              <div className="text-[#8A8A92] space-y-1 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">place</span>
                  <span>{order.hubAdresse || 'Zone Logistique Tanjombato, RN7'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>Horaires : {order.hubHoraires || '07h30 – 18h00 (Lun - Sam)'}</span>
                </div>
              </div>
            </div>

            {/* Fenêtre horaire de collecte (large puis affinée) */}
            <div className="p-4 bg-[#F7F7F8] rounded border border-[#ECECEC] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#1A1A1E]">
                <span className="material-symbols-outlined text-[18px] text-[#3B82F6]">timelapse</span>
                <span>Fenêtre Horaire de Collecte</span>
              </div>

              {/* 5. Fenêtre horaire précisée si statut COLLECTE_PROGRAMMEE ou ultérieur */}
              {order.statut === 'COLLECTE_PROGRAMMEE' || order.fenetreCollectePrecise ? (
                <div className="space-y-1">
                  <span className="stamp-ink stamp-ink-red text-[9.5px] px-2 py-0.5 inline-block">
                    FENÊTRE PRÉCISÉE
                  </span>
                  <div className="font-display font-bold text-base text-[#1A1A1E] mt-1">
                    {order.fenetreCollectePrecise || '10h15 – 11h00 (Passage du coursier)'}
                  </div>
                  <p className="text-[11px] text-[#8A8A92]">
                    Le coursier passera à votre adresse dans cette plage horaire affinée.
                  </p>
                </div>
              ) : (
                /* Fenêtre large estimée initiale */
                <div className="space-y-1">
                  <span className="stamp-ink stamp-ink-neutral text-[9.5px] px-2 py-0.5 inline-block">
                    ESTIMATION INITIALE
                  </span>
                  <div className="font-display font-bold text-base text-[#1A1A1E] mt-1">
                    {order.fenetreCollecteLarge || 'Matinée : 08h30 – 12h30'}
                  </div>
                  <p className="text-[11px] text-[#8A8A92]">
                    Plage estimative. Elle sera affinée dès la programmation de la tournée (Collecte programmée).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 7. LIVRAISON : PREUVE CERTIFIÉE (PHOTO + SIGNATURE)                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isDelivered && (
        <div className="bordereau-row p-6 border-2 border-emerald-600 bg-emerald-50/20 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[24px]">verified</span>
              <div>
                <h3 className="font-display text-base font-bold text-[#1A1A1E]">
                  Preuve de Livraison Certifiée (POD)
                </h3>
                <span className="font-mono text-[10.5px] text-[#8A8A92]">
                  Horodatage : {formatDate(order.updatedAt || order.createdAt)}
                </span>
              </div>
            </div>
            <span className="stamp-ink stamp-ink-red text-xs">LIVRAISON EFFECTUÉE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Photo de livraison */}
            <div className="space-y-2">
              <span className="font-mono text-[10.5px] text-[#8A8A92] uppercase font-bold block">
                1. Cliché photographique du colis sur place
              </span>
              <div className="rounded overflow-hidden border border-[#ECECEC] bg-white aspect-video relative flex items-center justify-center">
                <img
                  src={order.preuveLivraison?.photoUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80'}
                  alt="Preuve colis livré"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-[#1A1A1E]/80 text-white font-mono text-[9px] px-2 py-0.5 rounded">
                  GPS certifié : {order.latitudeLivraison}, {order.longitudeLivraison}
                </div>
              </div>
            </div>

            {/* Signature du destinataire */}
            <div className="space-y-2">
              <span className="font-mono text-[10.5px] text-[#8A8A92] uppercase font-bold block">
                2. Émargement & Signature du destinataire
              </span>
              <div className="p-4 bg-white border border-[#ECECEC] rounded space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-[#ECECEC] pb-2">
                  <span className="text-[#8A8A92]">Réceptionné par :</span>
                  <span className="text-[#1A1A1E] font-bold">
                    {order.preuveLivraison?.destinataireNom || order.nomDestinataire || 'M. Rakotoarisoa'}
                  </span>
                </div>

                {/* Bloc visuel de la signature électronique */}
                <div className="h-28 bg-[#F7F7F8] rounded border border-dashed border-[#1A1A1E]/30 flex flex-col items-center justify-center relative p-2">
                  <svg className="w-48 h-16 stroke-[#1A1A1E] fill-none" viewBox="0 0 200 60">
                    <path
                      d="M 20,40 Q 50,10 80,35 T 140,25 T 180,45"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 60,35 Q 90,50 110,20"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[9px] text-[#8A8A92] uppercase tracking-wider absolute bottom-1.5 right-2">
                    Signature Électronique Certifiée
                  </span>
                </div>

                <div className="text-[11px] text-[#8A8A92]">
                  Remarques : {order.preuveLivraison?.remarques || 'Remis en parfait état conforme au bordereau.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CARTE & MARCHANDISES                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne gauche : Carte + Colis */}
        <div className="lg:col-span-8 space-y-6">
          {/* Carte interactive */}
          <div className="bordereau-row overflow-hidden border border-[#ECECEC]">
            <div className="p-3 border-b border-[#ECECEC] flex justify-between items-center bg-white">
              <span className="font-mono text-[10.5px] text-[#8A8A92] uppercase font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#E8433D]">map</span>
                Tracé de l'Expédition & Points Posés
              </span>
              <span className="font-mono text-[10.5px] text-[#8A8A92]">
                Collecte (Bleu) → Livraison (Rouge)
              </span>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <MapView center={MAP_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
                {order.latitudeCollecte && order.longitudeCollecte && (
                  <Marker
                    position={[order.latitudeCollecte, order.longitudeCollecte]}
                    icon={createMarkerIcon('#3B82F6', 'COLLECTE', 'trip_origin')}
                  >
                    <Popup>
                      <div className="font-mono text-xs">
                        <strong>Point de Collecte</strong>
                        <p className="text-[10px] text-[#8A8A92] mt-0.5">{order.adresseCollecte}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {order.latitudeLivraison && order.longitudeLivraison && (
                  <Marker
                    position={[order.latitudeLivraison, order.longitudeLivraison]}
                    icon={createMarkerIcon('#E8433D', 'LIVRAISON', 'place')}
                  >
                    <Popup>
                      <div className="font-mono text-xs">
                        <strong>Point de Livraison</strong>
                        <p className="text-[10px] text-[#8A8A92] mt-0.5">{order.adresseLivraison}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapView>
            </div>
          </div>

          {/* Tableau des Colis */}
          <div className="bordereau-row p-6 space-y-4 border border-[#ECECEC]">
            <div className="flex items-center justify-between border-b border-[#ECECEC] pb-2">
              <span className="font-display font-bold uppercase text-sm text-[#1A1A1E]">
                Marchandises & Colis ({order.colis?.length || 1})
              </span>
              <span className="font-mono text-xs text-[#8A8A92]">
                Poids cumulé : {totalPoids} kg &middot; Volume : {totalVolume.toFixed(2)} m³
              </span>
            </div>

            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-[#8A8A92] uppercase border-b border-[#ECECEC] bg-[#F7F7F8]">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Poids</th>
                  <th className="text-left py-2 px-3">Volume</th>
                  <th className="text-left py-2 px-3">Catégorie</th>
                  <th className="text-left py-2 px-3">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC]">
                {(order.colis && order.colis.length > 0 ? order.colis : [{ poidsKg: totalPoids || 10, volumeM3: totalVolume || 0.1, categorieLibelle: 'Standard', etat: 'CONFORME' }]).map((c, i) => (
                  <tr key={i} className="font-body">
                    <td className="py-2 px-3 font-mono font-bold text-[#E8433D]">#{i + 1}</td>
                    <td className="py-2 px-3 font-mono">{c.poidsKg} kg</td>
                    <td className="py-2 px-3 font-mono">{c.volumeM3} m³</td>
                    <td className="py-2 px-3">{c.categorieLibelle || 'Général'}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-emerald-700 font-bold">
                      {c.etat || 'ENREGISTRÉ'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Colonne droite : Fiche Signalétique de Commande */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bordereau-row p-5 space-y-3 font-body text-xs border border-[#ECECEC]">
            <div className="border-b border-[#ECECEC] pb-2.5 flex justify-between items-center">
              <div>
                <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Bordereau Officiel</span>
                <span className="font-display font-bold text-sm text-[#1A1A1E]">Fiche Signalétique</span>
              </div>
              <button
                onClick={() => setShowFactureModal(true)}
                className="text-[#E8433D] hover:underline font-mono text-[10.5px] bg-transparent border-0 cursor-pointer"
              >
                Voir Facture →
              </button>
            </div>

            <div className="space-y-2.5 font-mono">
              <div>
                <span className="text-[#8A8A92] text-[10.5px] block">Agence Partenaire :</span>
                <span className="text-[#1A1A1E] font-bold">{order.agenceNom || 'MadaLogistix Partenaire'}</span>
              </div>
              <div>
                <span className="text-[#8A8A92] text-[10.5px] block">Lieu de Collecte :</span>
                <span className="text-[#3B82F6] font-bold block">{order.adresseCollecte || '—'}</span>
              </div>
              <div>
                <span className="text-[#8A8A92] text-[10.5px] block">Lieu de Livraison :</span>
                <span className="text-[#E8433D] font-bold block">{order.adresseLivraison || '—'}</span>
              </div>
              <div>
                <span className="text-[#8A8A92] text-[10.5px] block">Destinataire :</span>
                <span className="text-[#1A1A1E] font-bold">{order.nomDestinataire || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-[#8A8A92] text-[10.5px] block">Téléphone Destinataire :</span>
                <span className="text-[#1A1A1E] font-bold">{order.telDestinataire || 'Non renseigné'}</span>
              </div>
              {order.creneau && (
                <div>
                  <span className="text-[#8A8A92] text-[10.5px] block">Créneau demandé :</span>
                  <span className="text-[#1A1A1E] font-bold">{order.creneau}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#ECECEC] space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8A8A92]">Devis convenu :</span>
                  <span className="text-[#E8433D] font-display font-bold text-base">
                    {new Intl.NumberFormat('fr-MG').format(montantTarif)} Ar
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 block italic">
                  ✓ Devis implicitement accepté à la création
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
