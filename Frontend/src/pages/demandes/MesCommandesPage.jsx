import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const activeOrders = [
  {
    ref: 'CMD-2026-8932',
    trackingCode: '#AUT-2026-RN7-8932',
    destination: 'Antsirabe Terminal RN7',
    depart: 'Tana Hub Analakely',
    agencyName: 'MadaExpress RN7 — Hub Antananarivo',
    status: 'LIVREE',
    stampText: 'LIVRÉE 02/09',
    stampStyle: 'stamp-ink-red',
    step: 4, // 0 to 4
    title: '12x Palettes Textiles',
    date: '02 Sept, 2026',
    montant: '1,450,000 MGA',
  },
  {
    ref: 'CMD-2026-9104',
    trackingCode: '#AUT-2026-RN7-9104',
    destination: 'Ambatolampy Relay',
    depart: 'Tana Hub Analakely',
    agencyName: 'ColisPlus Madagascar — Relay Ambatolampy',
    status: 'COLLECTE_CONFIRMEE',
    stampText: 'COLLECTE CONFIRMÉE',
    stampStyle: 'stamp-ink-neutral',
    step: 2,
    title: '02x Conteneurs Matériel Informatique',
    date: '01 Sept, 2026',
    montant: '2,100,000 MGA',
  },
  {
    ref: 'CMD-2026-9280',
    trackingCode: '#AUT-2026-RN7-9280',
    destination: 'Antsirabe Industrial Hub',
    depart: 'Tana Hub',
    agencyName: 'TransCorridor RN7 — Terminal Antsirabe',
    status: 'REFUSEE',
    stampText: 'NON PRISE EN CHARGE',
    stampStyle: 'stamp-ink-muted',
    step: 1,
    title: '05x Fûts Produits Chimiques',
    date: '31 Août, 2026',
    montant: '—',
  },
]

const steps = ['Créée', 'Préparation', 'En livraison', 'Livrée']

const historyOrders = [
  { ref: 'CMD-2024-7841', date: '12 Oct, 2024', dest: 'Antananarivo South', montant: '1,450,000 MGA', statut: 'LIVRÉE', stampStyle: 'stamp-ink-neutral' },
  { ref: 'CMD-2024-7629', date: '05 Oct, 2024', dest: 'Antsirabe Industrial', montant: '2,100,000 MGA', statut: 'LIVRÉE', stampStyle: 'stamp-ink-neutral' },
  { ref: 'CMD-2024-7410', date: '28 Sep, 2024', dest: 'Tulear Port', montant: '890,000 MGA', statut: 'LIVRÉE', stampStyle: 'stamp-ink-neutral' },
  { ref: 'CMD-2024-7233', date: '20 Sep, 2024', dest: 'Diego Suarez', montant: '3,540,000 MGA', statut: 'ANNULÉE', stampStyle: 'stamp-ink-muted' },
]

export default function MesCommandesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHistoryView = location.pathname.includes('historique')
  const [search, setSearch] = useState('')

  const filteredOrders = activeOrders.filter(o =>
    o.ref.toLowerCase().includes(search.toLowerCase()) ||
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.destination.toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = historyOrders.filter(h =>
    h.ref.toLowerCase().includes(search.toLowerCase()) ||
    h.dest.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      
      {/* Titre & Sous-titre officiel */}
      <div>
        <h1 className="font-display text-[25px] font-bold text-[#1A1A1E] leading-tight">
          {isHistoryView ? 'Historique des expéditions' : 'Mes expéditions'}
        </h1>
        <p className="font-body text-[13.5px] text-[#8A8A92] mt-1">
          {isHistoryView
            ? 'Archives des bordereaux clôturés et relevés antérieurs du corridor RN7.'
            : 'Gérez vos expéditions en cours et consultez votre historique.'}
        </p>
      </div>

      {/* Barre d'outils registre : recherche monospace + bouton d'action franc */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-1 pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une expédition..."
          className="border border-[#ECECEC] bg-white rounded-md px-3.5 py-2.5 text-[13px] text-[#1A1A1E] w-full sm:w-[280px] font-mono placeholder:text-[#8A8A92] focus:outline-none focus:border-[#1A1A1E] transition-colors"
        />
        <button
          onClick={() => navigate('/client/nouvelle_demande')}
          className="bg-[#E8433D] text-white border-0 rounded-md px-5 py-2.5 font-body font-semibold text-[13.5px] hover:bg-[#B82823] active:scale-[0.99] transition-all cursor-pointer shadow-sm text-center"
        >
          + Nouvelle expédition
        </button>
      </div>

      {/* LISTE BORDEREAUX EN COURS (OU ARCHIVES) */}
      {!isHistoryView ? (
        <div className="space-y-3.5">
          {filteredOrders.length === 0 ? (
            <div className="bordereau-row p-8 text-center text-sm font-mono text-[#8A8A92]">
              Aucun bordereau ne correspond à votre recherche.
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.ref}
                onClick={() => navigate('/client/detail_commande')}
                className="bordereau-row p-5 sm:p-[22px_26px] cursor-pointer"
                title="Cliquer pour consulter le détail du bordereau"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-5 lg:gap-8 items-center">
                  
                  {/* Colonne gauche : Identifiants & Titre */}
                  <div className="min-w-[220px]">
                    <div className="font-mono font-bold text-xs text-[#8A8A92] tracking-[0.5px]">
                      {order.ref}
                    </div>
                    <div className="font-display font-bold text-base text-[#1A1A1E] mt-0.5 mb-1">
                      {order.title}
                    </div>
                    <div className="font-body text-[12.5px] text-[#8A8A92]">
                      Destination : {order.destination}
                    </div>
                  </div>

                  {/* Colonne centrale : Échelons de suivi (manifeste) */}
                  <div className="flex items-center justify-between min-w-[280px] max-w-[500px] w-full mx-auto px-2">
                    {steps.map((label, i) => {
                      const isDone = i < order.step
                      return (
                        <div key={label} className="flex flex-col items-center gap-1.5 flex-1 relative text-center">
                          {/* Ligne de connexion */}
                          {i < steps.length - 1 && (
                            <div
                              className={`absolute top-[7px] left-1/2 w-full h-[2px] z-0 ${
                                i < order.step - 1 ? 'bg-[#E8433D]' : 'bg-[#ECECEC]'
                              }`}
                            />
                          )}

                          {/* Nœud */}
                          <div
                            className={`w-[14px] h-[14px] rounded-full border-2 z-10 transition-colors ${
                              isDone
                                ? 'bg-[#E8433D] border-[#E8433D]'
                                : 'bg-white border-[#ECECEC]'
                            }`}
                          />

                          {/* Libellé */}
                          <span className={`font-display text-[9.5px] uppercase tracking-[0.4px] ${
                            isDone ? 'text-[#1A1A1E] font-bold' : 'text-[#8A8A92]'
                          }`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Colonne droite : Tampon d'encre officiel */}
                  <div className="flex items-center justify-end">
                    <div className={`stamp-ink ${order.stampStyle}`}>
                      {order.stampText}
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* TABLEAU HISTORIQUE / ARCHIVES */}
      <div className="bordereau-row overflow-hidden mt-8">
        <div className="p-5 border-b border-[#ECECEC] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-display text-base font-bold uppercase text-[#1A1A1E]">
              {isHistoryView ? 'Registre Général des Expéditions' : 'Archives Récentes'}
            </h3>
            <p className="font-body text-xs text-[#8A8A92] mt-0.5">
              Bordereaux scellés et factures d'affrètement acquittées.
            </p>
          </div>
          <span className="font-mono text-xs text-[#8A8A92] bg-[#F7F7F8] px-3 py-1 rounded border border-[#ECECEC]">
            {filteredHistory.length} ARCHIVES
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F7F8] border-b border-[#ECECEC]">
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">RÉFÉRENCE</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">DATE CLÔTURE</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">DESTINATION RN7</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">AFFRÈTEMENT</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">MENTION LÉGALE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] font-body text-xs">
              {filteredHistory.map((row) => (
                <tr
                  key={row.ref}
                  onClick={() => navigate('/client/detail_commande')}
                  className="hover:bg-[#F7F7F8]/80 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono font-bold text-[#E8433D]">{row.ref}</td>
                  <td className="px-5 py-3.5 font-mono text-[#8A8A92]">{row.date}</td>
                  <td className="px-5 py-3.5 font-display font-semibold text-[#1A1A1E]">{row.dest}</td>
                  <td className="px-5 py-3.5 font-mono font-bold text-[#1A1A1E]">{row.montant}</td>
                  <td className="px-5 py-3.5">
                    <span className={`stamp-ink text-[10px] py-0.5 px-2 ${row.stampStyle}`}>
                      {row.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
