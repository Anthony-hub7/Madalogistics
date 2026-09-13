import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DetailCommandePage() {
  const navigate = useNavigate()
  const [activeStatus, setActiveStatus] = useState('LIVREE')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelConfirmed, setCancelConfirmed] = useState(false)

  const mockOrders = {
    LIVREE: {
      ref: 'CMD-2026-8932',
      trackingCode: '#AUT-2026-RN7-8932',
      destination: 'Antsirabe Terminal RN7 (Zone Industrielle)',
      depart: 'Tana Hub Analakely (Gare Soarano)',
      agencyName: 'MadaExpress RN7 — Hub Antananarivo',
      status: 'LIVREE',
      statusStamp: 'LIVRÉE 02/09',
      stampStyle: 'stamp-ink-red',
      dateCreation: '01 Septembre 2026 à 08:15',
      contenu: '12x Palettes Textiles Habillement',
      poids: '570 kg',
      volume: '1.2 m³',
      montant: '1,450,000 MGA',
      factureGeneree: true,
      numFacture: 'FACT-2026-8932',
      hubInfo: {
        name: 'Hub Antananarivo RN7 (Gare Soarano)',
        address: 'Enceinte Gare Soarano, Route Nationale 7, Antananarivo 101',
        horaires: 'Du Lundi au Samedi : 06:00 - 18:00 (Guichet Fret #2)',
        contact: '+261 34 07 890 12',
      },
      preciseTimeSlot: 'Mardi 2 Septembre 2026 entre 09:30 et 11:30',
      etaArrival: '15:45 (Arrivée conforme)',
      pod: {
        deliveredAt: '02/09/2026 à 15:42',
        receiverName: 'R. RANDRIAMAMPIANINA (Dépôt)',
        signatureName: 'R. RANDRIA',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
        status: 'Livraison conforme sous réserve d\'emballage',
      },
    },
    COLLECTE_CONFIRMEE: {
      ref: 'CMD-2026-9104',
      trackingCode: '#AUT-2026-RN7-9104',
      destination: 'Ambatolampy Relay',
      depart: 'Tana Hub Analakely',
      agencyName: 'ColisPlus Madagascar — Relay Ambatolampy',
      status: 'COLLECTE_CONFIRMEE',
      statusStamp: 'COLLECTE CONFIRMÉE',
      stampStyle: 'stamp-ink-neutral',
      dateCreation: '01 Septembre 2026 à 10:30',
      contenu: '02x Conteneurs Matériel Informatique',
      poids: '400 kg',
      volume: '2.5 m³',
      montant: '2,100,000 MGA',
      factureGeneree: true,
      numFacture: 'FACT-2026-9104',
      hubInfo: {
        name: 'Hub Antananarivo RN7 (Gare Soarano)',
        address: 'Enceinte Gare Soarano, Route Nationale 7, Antananarivo 101',
        horaires: 'Du Lundi au Samedi : 06:00 - 18:00',
        contact: '+261 34 07 890 12',
      },
      preciseTimeSlot: 'Mardi 2 Septembre 2026 entre 14:00 et 16:00',
      etaArrival: 'Mercredi 3 Septembre à 10:00 (Corridor RN7)',
    },
    REFUSEE: {
      ref: 'CMD-2026-9280',
      trackingCode: '#AUT-2026-RN7-9280',
      destination: 'Antsirabe Industrial Hub',
      depart: 'Tana Hub',
      agencyName: 'TransCorridor RN7 — Terminal Antsirabe',
      status: 'REFUSEE',
      statusStamp: 'NON PRISE EN CHARGE',
      stampStyle: 'stamp-ink-muted',
      dateCreation: '31 Août 2026 à 17:00',
      contenu: '05x Fûts Produits Chimiques',
      poids: '850 kg',
      volume: '3.2 m³',
      montant: '—',
      refusalReason: 'Capacité pleine sur le camion citerne / matières réglementées du 02/09 — Gabarit incompatible.',
      refusalMessage: 'Veuillez réajuster le conditionnement ou sélectionner le Relais Ambatolampy.',
    },
  }

  const o = mockOrders[activeStatus] || mockOrders.LIVREE
  const isRefused = o.status === 'REFUSEE'
  const isCancellable = o.status === 'CREEE' || o.status === 'CONFIRMEE'

  return (
    <div className="space-y-6">
      
      {/* Navigateur de test de statut */}
      <div className="bg-white border border-[#ECECEC] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-mono text-[#8A8A92] uppercase font-bold">
          [ Échantillon Registre ] :
        </span>
        <div className="flex gap-2">
          {Object.keys(mockOrders).map((st) => (
            <button
              key={st}
              onClick={() => { setActiveStatus(st); setCancelConfirmed(false) }}
              className={`px-2.5 py-1 rounded font-mono text-xs cursor-pointer border ${
                activeStatus === st
                  ? 'bg-[#1A1A1E] text-white border-[#1A1A1E]'
                  : 'bg-[#F7F7F8] text-[#8A8A92] border-[#ECECEC] hover:text-[#1A1A1E]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* En-tête du bordereau officiel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#ECECEC] pb-4">
        <div>
          <button
            onClick={() => navigate('/client/mes_commandes')}
            className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] flex items-center gap-1 mb-2 bg-transparent border-0 cursor-pointer"
          >
            ← Revenir au sommaire des expéditions
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-[#1A1A1E]">
              {o.ref}
            </h1>
            <span className="font-mono text-xs text-[#E8433D] font-bold">
              {o.trackingCode}
            </span>
          </div>
          <p className="font-body text-xs text-[#8A8A92] mt-0.5">
            Transporteur officiel : <strong className="font-display text-[#1A1A1E]">{o.agencyName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`stamp-ink ${o.stampStyle}`}>
            {cancelConfirmed ? 'DEMANDE ANNULÉE' : o.statusStamp}
          </div>
          {isCancellable && !cancelConfirmed && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="border border-[#E8433D] text-[#E8433D] hover:bg-[#E8433D] hover:text-white rounded px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Annuler bordereau
            </button>
          )}
        </div>
      </div>

      {/* Modal d'annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1E]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#1A1A1E] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-[#1A1A1E] uppercase">
              Confirmation d'annulation
            </h3>
            <p className="font-body text-xs text-[#8A8A92] leading-relaxed">
              Confirmez-vous l'annulation définitive du bordereau <strong className="font-mono text-[#1A1A1E]">{o.ref}</strong> auprès du registre et du transporteur ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-[#ECECEC] rounded font-body text-xs text-[#8A8A92] hover:text-[#1A1A1E]"
              >
                Garder le bordereau
              </button>
              <button
                onClick={() => { setCancelConfirmed(true); setShowCancelModal(false) }}
                className="px-4 py-2 bg-[#E8433D] text-white rounded font-body font-semibold text-xs hover:bg-[#B82823]"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corps du bordereau */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Colonne gauche : Étapes & Manifeste détaillé */}
        <div className="lg:col-span-8 space-y-6">
          
          {isRefused ? (
            <div className="bordereau-row p-6 space-y-3">
              <span className="stamp-ink stamp-ink-muted text-xs">AVIS DE NON-PRISE EN CHARGE</span>
              <p className="font-body text-sm font-bold text-[#1A1A1E]">{o.refusalReason}</p>
              <p className="font-body text-xs text-[#8A8A92]">{o.refusalMessage}</p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/client/nouvelle_demande')}
                  className="bg-[#E8433D] text-white rounded px-4 py-2 font-body text-xs font-semibold"
                >
                  Régulariser un nouveau bordereau
                </button>
              </div>
            </div>
          ) : (
            <div className="bordereau-row p-6 space-y-6">
              <div className="border-b border-[#ECECEC] pb-3 flex justify-between items-center">
                <span className="font-display font-bold uppercase text-sm text-[#1A1A1E]">
                  Procès-Verbal d'Acheminement & Émargement
                </span>
                <span className="font-mono text-xs text-[#8A8A92]">AXE RN7</span>
              </div>

              {/* Étapes détaillées */}
              <div className="space-y-6 font-body text-xs">
                
                <div className="border-l-2 border-[#1A1A1E] pl-4 space-y-1">
                  <div className="flex justify-between font-mono text-[11px] text-[#8A8A92]">
                    <span>1. ENREGISTREMENT OFFICIEL</span>
                    <span>{o.dateCreation}</span>
                  </div>
                  <p className="font-bold text-[#1A1A1E]">Demande prise en compte sous le code {o.trackingCode}</p>
                </div>

                {o.hubInfo && (
                  <div className="border-l-2 border-[#1A1A1E] pl-4 space-y-1">
                    <span className="font-mono text-[11px] text-[#8A8A92]">2. HUB DE COLLECTE VALIDÉ</span>
                    <p className="font-bold text-[#1A1A1E]">{o.hubInfo.name}</p>
                    <p className="text-[#8A8A92]">{o.hubInfo.address}</p>
                    <p className="font-mono text-[#8A8A92]">Contact : {o.hubInfo.contact} — {o.hubInfo.horaires}</p>
                  </div>
                )}

                {o.preciseTimeSlot && (
                  <div className="border-l-2 border-[#E8433D] pl-4 space-y-1 bg-[#F7F7F8] p-3 rounded-r">
                    <span className="font-mono text-[11px] text-[#E8433D] font-bold">3. CRÉNEAU DE COLLECTE OPTIMISÉ</span>
                    <p className="font-display font-bold text-sm text-[#1A1A1E]">{o.preciseTimeSlot}</p>
                  </div>
                )}

                {o.pod && (
                  <div className="border-l-2 border-[#1A1A1E] pl-4 space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[11px] text-[#1A1A1E] font-bold">4. ÉMARGEMENT CLIENT & PREUVE (POD)</span>
                      <span className="font-mono text-[11px] text-[#8A8A92]">{o.pod.deliveredAt}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-[#8A8A92] block uppercase">Photo de Réception sur Site</span>
                        <div className="h-32 rounded border border-[#ECECEC] overflow-hidden">
                          <img src={o.pod.photoUrl} alt="POD" className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-[#8A8A92] block uppercase">Signature Numérique Émargée</span>
                        <div className="h-32 rounded border border-[#ECECEC] bg-[#F7F7F8] p-3 flex flex-col justify-between text-center">
                          <span className="font-mono text-[10px] text-[#8A8A92]">RÉCEPTIONNAIRE</span>
                          <span className="font-display text-xl font-bold text-[#1A1A1E] italic tracking-widest">
                            {o.pod.signatureName}
                          </span>
                          <span className="font-mono text-[10px] text-[#8A8A92]">{o.pod.receiverName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* Colonne droite : Fiche Signalétique de la Marchandise */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bordereau-row p-5 space-y-3 font-body text-xs">
            <div className="border-b border-[#ECECEC] pb-2.5">
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Fiche Signalétique</span>
              <span className="font-display font-bold text-sm text-[#1A1A1E]">Contenu du Bordereau</span>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-[#8A8A92]">Départ :</span>
                <span className="text-[#1A1A1E] font-bold text-right">{o.depart}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A92]">Arrivée :</span>
                <span className="text-[#1A1A1E] font-bold text-right">{o.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A92]">Poids :</span>
                <span className="text-[#1A1A1E] font-bold">{o.poids}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A92]">Volume :</span>
                <span className="text-[#1A1A1E] font-bold">{o.volume}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#ECECEC] font-display">
                <span className="text-[#8A8A92] uppercase font-bold">Affrètement :</span>
                <span className="text-[#E8433D] font-bold text-sm">{o.montant}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
