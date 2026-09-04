import { useState } from 'react'

export default function DetailCommandePage({ order: initialOrder, onNavigate }) {
  // Interactive status switcher for easy testing in UI demo
  const [activeStatus, setActiveStatus] = useState(initialOrder?.status || 'LIVREE')
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelConfirmed, setCancelConfirmed] = useState(false)

  // Dictionary of mock orders covering all 7 client lifecycle statuses
  const mockOrders = {
    LIVREE: {
      ref: initialOrder?.ref || 'CMD-2026-8932',
      trackingCode: '#AUT-2026-RN7-8932',
      destination: 'Antsirabe Terminal RN7',
      depart: 'Tana Hub Analakely',
      agencyName: 'MadaExpress RN7 — Hub Antananarivo',
      status: 'LIVREE',
      statusLabel: 'LIVRÉ LE 02/09/2026 A 15:42',
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
      broadEstimate: 'Collecte estimée initiale : Sous 24h à 48h',
      preciseTimeSlot: 'Mardi 2 Septembre 2026 entre 09:30 et 11:30',
      etaArrival: '15:45 (Livraison effectuée)',
      pod: {
        deliveredAt: '02/09/2026 à 15:42',
        receiverName: 'R. RANDRIAMAMPIANINA (Responsable Dépôt)',
        signatureName: 'R. RANDRIA',
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
        status: 'Livraison conforme sous réserve d\'emballage',
      },
      colis: [
        { id: 'PKG-001', name: 'Palettes Textiles Habillement', qty: 6, poids: '300kg' },
        { id: 'PKG-002', name: 'Cartons accessoires couture', qty: 6, poids: '270kg' },
      ],
    },
    COLLECTE_CONFIRMEE: {
      ref: initialOrder?.ref || 'CMD-2026-9104',
      trackingCode: '#AUT-2026-RN7-9104',
      destination: 'Ambatolampy Relay',
      depart: 'Tana Hub Analakely',
      agencyName: 'ColisPlus Madagascar — Relay Ambatolampy',
      status: 'COLLECTE_CONFIRMEE',
      statusLabel: 'COLLECTE CONFIRMÉE VRP',
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
        horaires: 'Du Lundi au Samedi : 06:00 - 18:00 (Guichet Fret #2)',
        contact: '+261 34 07 890 12',
      },
      broadEstimate: 'Collecte estimée initiale : Sous 24h à 48h',
      preciseTimeSlot: 'Mardi 2 Septembre 2026 entre 14:00 et 16:00',
      etaArrival: 'Mercredi 3 Septembre à 10:00 (Corridor RN7)',
      colis: [
        { id: 'PKG-003', name: 'Serveurs Rack 42U', qty: 2, poids: '400kg' },
      ],
    },
    CONFIRMEE: {
      ref: initialOrder?.ref || 'CMD-2026-9350',
      trackingCode: '#AUT-2026-RN7-9350',
      destination: 'Antsirabe Terminal',
      depart: 'Tana Hub',
      agencyName: 'TransCorridor RN7 — Terminal Antsirabe',
      status: 'CONFIRMEE',
      statusLabel: 'CONFIRMEE — TRAITEMENT GROUPAGE',
      dateCreation: '01 Septembre 2026 à 14:00',
      contenu: '08x Cartons Outillage Industriel',
      poids: '180 kg',
      volume: '0.8 m³',
      montant: '890,000 MGA',
      factureGeneree: false,
      hubInfo: {
        name: 'Hub Antananarivo RN7 (Gare Soarano)',
        address: 'Enceinte Gare Soarano, Route Nationale 7, Antananarivo 101',
        horaires: 'Du Lundi au Samedi : 06:00 - 18:00 (Guichet Fret #2)',
        contact: '+261 34 07 890 12',
      },
      broadEstimate: 'Collecte estimée : Sous 24h à 48h (Entre le 01/09 et 03/09)',
      preciseTimeSlot: 'Planification VRP en cours d\'attribution...',
      etaArrival: 'En attente de départ camion',
      colis: [
        { id: 'PKG-005', name: 'Outillage Industriel', qty: 8, poids: '180kg' },
      ],
    },
    CREEE: {
      ref: initialOrder?.ref || 'CMD-2026-9400',
      trackingCode: '#AUT-2026-RN7-9400',
      destination: 'Ambatolampy Centre',
      depart: 'Tana Hub Analakely',
      agencyName: 'MadaExpress RN7 — Hub Antananarivo',
      status: 'CREEE',
      statusLabel: 'DEMANDE REÇUE',
      dateCreation: '01 Septembre 2026 à 16:45',
      contenu: '04x Caisses Pièces Automobiles',
      poids: '95 kg',
      volume: '0.4 m³',
      montant: '450,000 MGA',
      factureGeneree: false,
      hubInfo: {
        name: 'Hub Antananarivo RN7 (Gare Soarano)',
        address: 'Enceinte Gare Soarano, Route Nationale 7, Antananarivo 101',
        horaires: 'Du Lundi au Samedi : 06:00 - 18:00',
        contact: '+261 34 07 890 12',
      },
      broadEstimate: 'Traitement sous 12h à 24h par l\'agence',
      preciseTimeSlot: 'En cours de validation agence',
      etaArrival: 'En attente',
      colis: [
        { id: 'PKG-006', name: 'Pièces Auto', qty: 4, poids: '95kg' },
      ],
    },
    REFUSEE: {
      ref: initialOrder?.ref || 'CMD-2026-9280',
      trackingCode: '#AUT-2026-RN7-9280',
      destination: 'Antsirabe Industrial Hub',
      depart: 'Tana Hub',
      agencyName: 'TransCorridor RN7 — Terminal Antsirabe',
      status: 'REFUSEE',
      statusLabel: 'NON PRISE EN CHARGE',
      dateCreation: '31 Août 2026 à 17:00',
      contenu: '05x Fûts Produits Chimiques',
      poids: '850 kg',
      volume: '3.2 m³',
      montant: '—',
      factureGeneree: false,
      refusalReason: 'Capacité pleine sur le camion frigorifique/groupage du 02/09 — Gabarit non conforme pour départ direct.',
      refusalMessage: 'Notre équipe vous invite à ajuster le créneau ou choisir l\'agence relais Ambatolampy.',
      colis: [
        { id: 'PKG-004', name: 'Fûts Produits Chimiques', qty: 5, poids: '850kg' },
      ],
    },
  }

  const o = mockOrders[activeStatus] || mockOrders.LIVREE

  const statusStepMap = {
    'CREEE': 1,
    'CONFIRMEE': 2,
    'COLLECTE_CONFIRMEE': 3,
    'EN_TRANSIT': 4,
    'LIVREE': 5,
    'REFUSEE': -1,
  }

  const currentStep = statusStepMap[o.status] || 5
  const isRefused = o.status === 'REFUSEE'

  // Cancellation logic:
  // - Cancellable: CREEE or CONFIRMEE (before precise VRP time slot)
  // - Locked: COLLECTE_CONFIRMEE, EN_TRANSIT, LIVREE, REFUSEE
  const isCancellable = o.status === 'CREEE' || o.status === 'CONFIRMEE'
  const isLocked = !isCancellable && !isRefused && o.status !== 'CREEE'

  const handleCancelConfirm = () => {
    setCancelConfirmed(true)
    setShowCancelModal(false)
    // In production this would call an API to cancel the order
  }

  return (
    <div className="space-y-6">
      
      {/* Interactive Status State Selector Bar for Demo Preview */}
      <div className="waybill-card p-3 bg-surface-light border border-outline-variant flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-sm">preview</span>
          Simulateur de Statuts du Cycle Client :
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'CREEE', label: '1. Reçue (CREEE)' },
            { id: 'CONFIRMEE', label: '2. Confirmée + Hub' },
            { id: 'COLLECTE_CONFIRMEE', label: '3. Créneau VRP' },
            { id: 'LIVREE', label: '5. Livré + POD (Photo & Signature)' },
            { id: 'REFUSEE', label: '⛔ Refusée (REFUSEE)' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStatus(st.id)}
              className={`px-2.5 py-1 rounded font-display text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeStatus === st.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white border border-outline-variant text-on-surface-variant hover:bg-surface-high'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Back Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
        <div>
          <button
            onClick={() => onNavigate && onNavigate('mes_commandes')}
            className="flex items-center gap-1.5 text-primary font-display text-xs font-bold uppercase tracking-wider hover:underline mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Retour à Mes Expéditions
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-on-surface">
              {o.ref}
            </h2>
            <span className="font-mono text-xs font-bold text-primary">{o.trackingCode}</span>
          </div>
          <p className="font-body text-xs text-on-surface-variant mt-0.5">
            Agence traitante : <strong className="text-on-surface font-display">{o.agencyName}</strong>
          </p>
        </div>

        {/* Status badges + Cancellation Action Area */}
        <div className="flex flex-wrap items-center gap-2">
          {isRefused ? (
            <span className="stamp-badge stamp-badge-red text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">cancel</span>
              DEMANDE NON PRISE EN CHARGE
            </span>
          ) : cancelConfirmed ? (
            <span className="stamp-badge stamp-badge-red text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">cancel</span>
              DEMANDE ANNULÉE
            </span>
          ) : o.status === 'LIVREE' ? (
            <span className="stamp-badge stamp-badge-green text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">task_alt</span>
              LIVRÉ CONFORME
            </span>
          ) : (
            <span className="stamp-badge stamp-badge-red text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">sync</span>
              EN COURS DE TRAITEMENT
            </span>
          )}

          {o.factureGeneree && (
            <span className="waybill-card px-3 py-1 bg-surface-light border border-outline-variant text-on-surface font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary">receipt_long</span>
              Facture Émise ({o.numFacture})
            </span>
          )}

          {/* ─── CANCEL BUTTON: visible only for CREEE / CONFIRMEE ─── */}
          {isCancellable && !cancelConfirmed && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-1.5 rounded border-2 border-primary bg-white px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-primary shadow-sm hover:bg-primary hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
              Annuler la demande
            </button>
          )}

          {/* ─── LOCK NOTICE: visible from COLLECTE_CONFIRMEE onwards ─── */}
          {isLocked && !cancelConfirmed && (
            <span className="flex items-center gap-1.5 rounded border border-outline-variant bg-surface-light px-3 py-1.5 font-body text-[11px] text-on-surface-variant">
              <span className="material-symbols-outlined text-sm text-on-surface-variant">lock</span>
              Collecte confirmée — cette demande ne peut plus être annulée
            </span>
          )}
        </div>
      </div>

      {/* ===== CANCELLATION CONFIRMATION MODAL ===== */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(26,26,30,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowCancelModal(false)}
        >
          <div className="waybill-card w-full max-w-md space-y-5 p-6 bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h3 className="font-display text-base font-bold uppercase tracking-wide text-on-surface">
                    Confirmer l'annulation
                  </h3>
                  <p className="font-body text-xs text-on-surface-variant mt-0.5">
                    Cette action est irréversible
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="rounded p-1 hover:bg-surface-light text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Order summary in modal */}
            <div className="rounded border border-outline-variant bg-surface-light p-4 space-y-2 font-body text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Référence :</span>
                <span className="font-display font-bold text-on-surface">{o.ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Contenu :</span>
                <span className="font-bold text-on-surface">{o.contenu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Destination :</span>
                <span className="font-bold text-on-surface">{o.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Statut actuel :</span>
                <span className="font-bold text-primary">{o.statusLabel}</span>
              </div>
            </div>

            <p className="font-body text-sm text-on-surface">
              Êtes-vous sûr de vouloir annuler cette demande de transport ?
              L'agence <strong className="font-display">{o.agencyName}</strong> sera notifiée.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded border border-outline-variant bg-white px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-light transition-all"
              >
                Non, conserver
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 rounded bg-primary px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                Oui, annuler la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CAS SPECIAL : DEMANDE ANNULÉE (post-confirmation) ===== */}
      {cancelConfirmed && (
        <div className="waybill-card p-5 border border-outline-variant bg-surface-light rounded-xl flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">
              Demande annulée avec succès
            </p>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              L'agence <strong>{o.agencyName}</strong> a été notifiée. Vous pouvez soumettre une nouvelle demande.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('nouvelle_demande')}
            className="shrink-0 rounded bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-primary/90 transition-all"
          >
            Nouvelle demande
          </button>
        </div>
      )}

      {/* ===== CAS SPECIAL : DEMANDE REFUSÉE ===== */}
      {isRefused && (
        <div className="waybill-card p-6 border-2 border-primary bg-primary/5 rounded-xl space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">block</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold uppercase tracking-wide text-on-surface">Demande Non Prise en Charge par l'Agence</h3>
                <p className="font-body text-xs text-on-surface-variant">Le cycle de transport direct est interrompu pour cette demande</p>
              </div>
            </div>
            <span className="stamp-badge stamp-badge-red text-xs">REFUSÉ / INTERROMPU</span>
          </div>

          <div className="p-4 bg-white rounded border border-outline-variant space-y-2">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">Motif de non prise en charge :</p>
            <p className="font-body text-sm font-semibold text-on-surface">{o.refusalReason}</p>
            <p className="font-body text-xs text-on-surface-variant">{o.refusalMessage}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <p className="font-body text-xs text-on-surface-variant">
              Vous pouvez réajuster les dimensions ou choisir une agence alternative.
            </p>
            <button
              onClick={() => onNavigate && onNavigate('nouvelle_demande')}
              className="flex items-center gap-2 rounded bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>Modifier la Demande / Renvoyer</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== ENRICHED VERTICAL TIMELINE FOR NORMAL FLOW ===== */}
      {!isRefused && (
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* Main Timeline Column */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            <div className="waybill-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">route</span>
                  Suivi Enrichi du Parcours Expédition
                </h3>
                <span className="license-plate-tag text-xs">CORRIDOR RN7</span>
              </div>

              {/* Vertical Steps */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-outline-variant/60">
                
                {/* STEP 1: DEMANDE REÇUE */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= 1 ? 'bg-primary text-white' : 'bg-surface-light border border-outline-variant text-on-surface-variant'
                  }`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </div>
                  <div className="pl-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">1. Demande Reçue & Enregistrée</h4>
                      <span className="font-mono text-xs text-on-surface-variant">{o.dateCreation}</span>
                    </div>
                    <p className="font-body text-xs text-on-surface-variant mt-1">
                      Numéro de suivi officiel attribué : <strong className="font-mono text-primary">{o.trackingCode}</strong>. Récapitulatif : {o.contenu} ({o.poids}).
                    </p>
                  </div>
                </div>

                {/* STEP 2: CONFIRMATION & DEPOSIT HUB ADDRESS */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= 2 ? 'bg-primary text-white' : 'bg-surface-light border border-outline-variant text-on-surface-variant'
                  }`}>
                    {currentStep > 2 ? '✓' : '2'}
                  </div>
                  <div className="pl-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">2. Demande Confirmée — En cours de traitement</h4>
                      <span className="stamp-badge stamp-badge-green text-[10px]">CONFIRMÉ</span>
                    </div>

                    {/* Drop-off Hub Address Box (Visible as soon as confirmed) */}
                    <div className="waybill-card p-4 bg-surface-light border border-outline-variant/80 rounded space-y-2">
                      <div className="flex items-center gap-2 text-primary font-display text-xs font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-base">location_city</span>
                        <span>Hub de Dépôt / Collecte Validé</span>
                      </div>
                      <p className="font-display text-sm font-bold text-on-surface">{o.hubInfo.name}</p>
                      <p className="font-body text-xs text-on-surface-variant">📍 {o.hubInfo.address}</p>
                      <p className="font-body text-xs text-on-surface-variant">🕒 Horaires : {o.hubInfo.horaires}</p>
                      <p className="font-body text-xs text-on-surface-variant">📞 Contact Guichet : {o.hubInfo.contact}</p>

                      <div className="pt-2 border-t border-outline-variant/40 font-body text-xs text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">timelapse</span>
                        <span>{o.broadEstimate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 3: PRECISE TIME SLOT (AFTER VRP OPTIMIZATION) */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= 3 ? 'bg-primary text-white' : 'bg-surface-light border border-outline-variant text-on-surface-variant'
                  }`}>
                    {currentStep > 3 ? '✓' : '3'}
                  </div>
                  <div className="pl-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">3. Fenêtre Horaire Précise de Collecte</h4>
                      {currentStep >= 3 && <span className="stamp-badge stamp-badge-red text-[10px]">CRENEAU VALIDÉ</span>}
                    </div>

                    {/* Precise Slot Visual Box */}
                    <div className={`waybill-card p-4 rounded border ${
                      currentStep >= 3 ? 'border-primary/60 bg-primary/5' : 'border-outline-variant bg-surface-light'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">event_available</span>
                            Collecte confirmée sur le créneau exact :
                          </p>
                          <p className="font-display text-base font-bold text-on-surface mt-1">{o.preciseTimeSlot}</p>
                          <p className="font-body text-xs text-on-surface-variant mt-0.5">
                            * Ce créneau remplace l'estimation large de 24-48h après optimisation du parcours camion.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 4: EN TRANSIT RN7 */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= 4 ? 'bg-primary text-white' : 'bg-surface-light border border-outline-variant text-on-surface-variant'
                  }`}>
                    {currentStep > 4 ? '✓' : '4'}
                  </div>
                  <div className="pl-4 space-y-1">
                    <h4 className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">4. En Cours de Livraison (Transit RN7)</h4>
                    <p className="font-body text-xs text-on-surface-variant">
                      🚚 Heure estimée d'arrivée à destination (ETA) : <strong className="font-display text-primary">{o.etaArrival}</strong>
                    </p>
                  </div>
                </div>

                {/* STEP 5: PROOF OF DELIVERY (POD PHOTO & SIGNATURE) */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= 5 ? 'bg-primary text-white' : 'bg-surface-light border border-outline-variant text-on-surface-variant'
                  }`}>
                    {currentStep >= 5 ? '✓' : '5'}
                  </div>
                  <div className="pl-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-bold uppercase tracking-wide text-on-surface">5. Preuve de Livraison & Émargement (POD)</h4>
                      {currentStep >= 5 && <span className="stamp-badge stamp-badge-green text-[10px]">LIVRÉ & ÉMARGÉ</span>}
                    </div>

                    {currentStep >= 5 && o.pod ? (
                      <div className="waybill-card p-4 bg-surface border border-outline-variant rounded space-y-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                          <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface">
                            Livré le : {o.pod.deliveredAt}
                          </span>
                          <span className="font-body text-xs font-semibold text-primary">Réceptionné par : {o.pod.receiverName}</span>
                        </div>

                        {/* Directly Visible POD Photo & Signature Thumbnail Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          
                          {/* POD Photo Preview */}
                          <div className="space-y-1">
                            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                              📷 Photo de réception sur site :
                            </span>
                            <div className="h-36 w-full rounded border border-outline-variant overflow-hidden relative bg-surface-light">
                              <img
                                src={o.pod.photoUrl}
                                alt="Preuve de livraison colis"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute bottom-1 right-1 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white font-mono">
                                GPS RN7 OK
                              </div>
                            </div>
                          </div>

                          {/* Digital Signature Preview */}
                          <div className="space-y-1">
                            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                              ✍️ Émargement / Signature numérique client :
                            </span>
                            <div className="h-36 w-full rounded border border-outline-variant bg-surface-light p-3 flex flex-col justify-between">
                              <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
                                <span>SIGNATURE CLIENT</span>
                                <span className="text-primary font-bold">#POD-EMARGE</span>
                              </div>
                              <div className="my-auto text-center font-display text-xl italic font-bold text-on-surface tracking-widest border-b border-dashed border-outline-variant pb-2">
                                {o.pod.signatureName}
                              </div>
                              <p className="text-[10px] text-on-surface-variant text-right">{o.pod.status}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="font-body text-xs text-on-surface-variant italic">
                        La photo de réception et la signature numérique d'émargement seront affichées directement ici une fois le colis livré.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column: Parcel Info & Invoice Tag */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* Shipment Summary Box */}
            <div className="waybill-card p-5 space-y-4">
              <h3 className="font-display text-base font-bold uppercase tracking-wide text-on-surface flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <span className="material-symbols-outlined text-primary">inventory_2</span>
                Détails du Bordereau
              </h3>

              <div className="space-y-2.5 font-body text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Départ :</span>
                  <span className="font-bold text-on-surface">{o.depart}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Destination :</span>
                  <span className="font-bold text-on-surface">{o.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Contenu :</span>
                  <span className="font-bold text-on-surface">{o.contenu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Poids Total :</span>
                  <span className="font-bold text-on-surface font-mono">{o.poids}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Volume Total :</span>
                  <span className="font-bold text-on-surface font-mono">{o.volume}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-outline-variant/40">
                  <span className="font-display font-bold uppercase text-on-surface">Montant Transport :</span>
                  <span className="font-display font-bold text-sm text-primary">{o.montant}</span>
                </div>
              </div>
            </div>

            {/* Colis List Breakdown */}
            <div className="waybill-card p-5 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Colis Inclus ({o.colis?.length || 0})
              </h4>
              <div className="space-y-2">
                {o.colis?.map((pkg) => (
                  <div key={pkg.id} className="p-2.5 rounded border border-outline-variant bg-surface-light flex items-center justify-between text-xs">
                    <div>
                      <p className="font-display font-bold text-on-surface">{pkg.name}</p>
                      <p className="font-mono text-[11px] text-on-surface-variant">{pkg.id} • {pkg.poids}</p>
                    </div>
                    <span className="font-mono font-bold text-primary">{pkg.qty} unit.</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
