import StatusBadge from '../../components/StatusBadge'

const activeOrders = [
  {
    ref: 'CMD-2026-8932',
    trackingCode: '#AUT-2026-RN7-8932',
    destination: 'Antsirabe Terminal RN7',
    depart: 'Tana Hub Analakely',
    agencyName: 'MadaExpress RN7 — Hub Antananarivo',
    status: 'LIVREE',
    statusLabel: 'LIVRÉ LE 02/09/2026 A 15:42',
    statusColor: 'stamp-badge-green',
    date: '02 Sept, 2026',
    contenu: '12x Palettes Textiles',
    montant: '1,450,000 MGA',
    factureGeneree: true,
    numFacture: 'FACT-2026-8932',
    hubInfo: {
      name: 'Hub Antananarivo RN7 (Gare Soarano)',
      address: 'Enceinte Gare Soarano, Route Nationale 7, Antananarivo 101',
      horaires: 'Du Lundi au Samedi : 06:00 - 18:00 (Guichet Fret #2)',
      contact: '+261 34 07 890 12',
    },
    broadEstimate: 'Collecte estimée : Sous 24h à 48h',
    preciseTimeSlot: 'Mardi 2 Septembre 2026 entre 09:30 et 11:30',
    etaArrival: '15:45 (Corridor RN7)',
    pod: {
      deliveredAt: '02/09/2026 à 15:42',
      receiverName: 'R. RANDRIAMAMPIANINA',
      signatureName: 'R. RANDRIA',
      photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
      status: 'Livraison conforme sous réserve d\'emballage',
    },
    colis: [
      { id: 'PKG-001', name: 'Palettes Textiles Habillement', qty: 6, poids: '300kg' },
      { id: 'PKG-002', name: 'Cartons accessoires couture', qty: 6, poids: '270kg' },
    ],
  },
  {
    ref: 'CMD-2026-9104',
    trackingCode: '#AUT-2026-RN7-9104',
    destination: 'Ambatolampy Relay',
    depart: 'Tana Hub Analakely',
    agencyName: 'ColisPlus Madagascar — Relay Ambatolampy',
    status: 'COLLECTE_CONFIRMEE',
    statusLabel: 'COLLECTE CONFIRMÉE (02/09)',
    statusColor: 'stamp-badge-red',
    date: '01 Sept, 2026',
    contenu: '02x Conteneurs Matériel Informatique',
    montant: '2,100,000 MGA',
    factureGeneree: true,
    numFacture: 'FACT-2026-9104',
    hubInfo: {
      name: 'Hub Antananarivo RN7 (Gare Soarano)',
      address: 'Enceinte Gare Soarano, Route Nationale 7, Tana 101',
      horaires: 'Du Lundi au Samedi : 06:00 - 18:00',
      contact: '+261 34 07 890 12',
    },
    broadEstimate: 'Collecte estimée : Sous 24h à 48h',
    preciseTimeSlot: 'Mardi 2 Septembre 2026 entre 14:00 et 16:00',
    etaArrival: 'Mercredi 3 Septembre à 10:00',
    colis: [
      { id: 'PKG-003', name: 'Serveurs Rack 42U', qty: 2, poids: '400kg' },
    ],
  },
  {
    ref: 'CMD-2026-9280',
    trackingCode: '#AUT-2026-RN7-9280',
    destination: 'Antsirabe Industrial Hub',
    depart: 'Tana Hub',
    agencyName: 'TransCorridor RN7 — Terminal Antsirabe',
    status: 'REFUSEE',
    statusLabel: 'NON PRISE EN CHARGE',
    statusColor: 'stamp-badge-red',
    date: '31 Août, 2026',
    contenu: '05x Fûts Produits Chimiques',
    montant: '—',
    factureGeneree: false,
    refusalReason: 'Capacité pleine sur le camion frigorifique/groupage du 02/09 — Gabarit non conforme pour départ direct.',
    refusalMessage: 'Notre équipe vous invite à ajuster le créneau ou choisir l\'agence relais Ambatolampy.',
    colis: [
      { id: 'PKG-004', name: 'Fûts Produits Chimiques', qty: 5, poids: '850kg' },
    ],
  },
]

const steps = ['Créée', 'Préparation', 'En livraison', 'Livrée']
const stepIcons = ['check', 'package_2', 'local_shipping', 'flag']

const historyOrders = [
  { ref: 'CMD-2024-7841', date: '12 Oct, 2024', dest: 'Antananarivo South', montant: '1,450,000 MGA', statut: 'LIVRÉE', statutColor: 'text-secondary bg-secondary/10', factureGeneree: true },
  { ref: 'CMD-2024-7629', date: '05 Oct, 2024', dest: 'Antsirabe Industrial', montant: '2,100,000 MGA', statut: 'LIVRÉE', statutColor: 'text-secondary bg-secondary/10', factureGeneree: true },
  { ref: 'CMD-2024-7410', date: '28 Sep, 2024', dest: 'Tulear Port', montant: '890,000 MGA', statut: 'LIVRÉE', statutColor: 'text-secondary bg-secondary/10', factureGeneree: true },
  { ref: 'CMD-2024-7233', date: '20 Sep, 2024', dest: 'Diego Suarez', montant: '3,540,000 MGA', statut: 'ANNULÉE', statutColor: 'text-error bg-error/10', factureGeneree: false },
]

function MesCommandesPage({ onNavigate }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Mes Expéditions</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Gérez vos expéditions en cours et consultez votre historique.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouvelle Expédition
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>switch_account</span>
          <h3 className="font-headline-md text-headline-md text-on-surface">Commandes Actives</h3>
          <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-label-sm text-label-sm">{activeOrders.length} en cours</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {activeOrders.map((order) => (
            <div key={order.ref} className="bg-surface-lowest border border-outline-variant rounded-xl p-6 hover:border-primary transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">
                      {order.status === 'en_livraison' ? 'local_shipping' : 'inventory_2'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-body-lg font-bold text-on-surface">{order.ref}</h4>
                    <p className="font-label-md text-label-md text-on-surface-variant">Destination: {order.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${order.statusColor} px-3 py-1 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1`}>
                    {order.pulse && <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />}
                    {order.statusLabel}
                  </span>
                  {order.factureGeneree && (
                    <StatusBadge label="Facture générée" bg="bg-secondary/10 text-secondary" dotColor="bg-secondary" />
                  )}
                </div>
              </div>

              <div className="relative py-3">
                <div className="flex items-center justify-between">
                  {steps.map((label, i) => {
                    const isDone = i < order.step
                    const isCurrent = i === order.step

                    return (
                      <div key={label} className="flex flex-col items-center gap-1 relative z-10">
                        {i > 0 && (
                          <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${
                            i <= order.step ? 'bg-primary' : 'bg-outline-variant'
                          }`} style={{ left: '-50%' }} />
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[18px] ${
                          isDone ? 'bg-primary text-on-primary' :
                          isCurrent ? 'w-10 h-10 border-2 border-primary bg-surface-lowest text-primary' :
                          'border border-outline-variant bg-surface text-outline'
                        }`}>
                          <span className={`material-symbols-outlined ${isCurrent ? 'animate-bounce' : ''}`}>
                            {isDone ? 'check' : stepIcons[i]}
                          </span>
                        </div>
                        <span className={`font-label-sm text-label-sm whitespace-nowrap ${
                          isDone || isCurrent ? 'text-primary font-bold' : 'text-on-surface-variant'
                        }`}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-outline-variant flex justify-between items-center">
                <div className="flex gap-6">
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Date Estimée</p>
                    <p className="font-label-md text-label-md text-on-surface">{order.date}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Contenu</p>
                    <p className="font-label-md text-label-md text-on-surface">{order.contenu}</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('detail_commande', { order })}
                  className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline"
                >
                  Voir détails <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-low/30">
          <h3 className="font-headline-md text-headline-md text-on-surface">Historique des commandes</h3>
          <div className="flex items-center gap-4">
            <select className="bg-surface border border-outline-variant rounded-lg font-label-md text-label-md px-3 py-1 outline-none">
              <option>Derniers 30 jours</option>
              <option>Derniers 6 mois</option>
              <option>Année 2024</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-low/50">
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">RÉFÉRENCE</th>
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">DATE</th>
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">DESTINATION</th>
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">MONTANT</th>
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">STATUT</th>
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">FACTURE</th>
                <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant font-bold border-b border-outline-variant">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {historyOrders.map((row) => (
                <tr key={row.ref} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4"><p className="font-label-md text-label-md text-primary font-bold">{row.ref}</p></td>
                  <td className="px-6 py-4"><p className="font-body-sm text-body-sm text-on-surface">{row.date}</p></td>
                  <td className="px-6 py-4"><p className="font-body-sm text-body-sm text-on-surface">{row.dest}</p></td>
                  <td className="px-6 py-4"><p className="font-body-sm text-body-sm font-bold text-on-surface">{row.montant}</p></td>
                  <td className="px-6 py-4"><span className={`${row.statutColor} px-2 py-1 rounded font-label-sm text-label-sm font-bold`}>{row.statut}</span></td>
                  <td className="px-6 py-4">
                    {row.factureGeneree ? (
                      <StatusBadge label="Générée" bg="bg-secondary/10 text-secondary" dotColor="bg-secondary" />
                    ) : (
                      <span className="font-label-sm text-label-sm text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button className="text-on-surface-variant hover:text-primary transition-colors" title="Détails">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-surface border-t border-outline-variant flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Affichage 1-4 sur 12 commandes</p>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-outline-variant rounded hover:bg-surface-container disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="px-3 py-1 bg-primary text-on-primary rounded font-label-md text-label-md">1</button>
            <button className="px-3 py-1 hover:bg-surface-container rounded font-label-md text-label-md text-on-surface">2</button>
            <button className="px-3 py-1 hover:bg-surface-container rounded font-label-md text-label-md text-on-surface">3</button>
            <button className="p-2 border border-outline-variant rounded hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <footer className="bg-surface border-t border-outline-variant pt-6 pb-2 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Commandes ce mois</p><p className="font-headline-md text-headline-md font-bold text-primary">28</p></div>
          <div className="md:border-x border-outline-variant"><p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Taux de livraison</p><p className="font-headline-md text-headline-md font-bold text-secondary">98.4%</p></div>
          <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Volume Expédié</p><p className="font-headline-md text-headline-md font-bold text-primary">145 T</p></div>
        </div>
      </footer>
    </div>
  )
}

export default MesCommandesPage
