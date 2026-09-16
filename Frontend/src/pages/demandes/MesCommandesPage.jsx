import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'

// Cycle de vie complet tel que spécifié :
// 1. En attente de confirmation
// 2. Confirmée (hub + créneau large)
// 3. Collecte programmée (créneau précis)
// 4. Colis collecté
// 5. En transit
// 6. Livrée (preuve photo + signature)
// Ou Refusée / Annulée
export const STATUT_LABELS = {
  CREEE: { text: 'En attente de confirmation', step: 1, stamp: 'EN ATTENTE', style: 'stamp-ink-neutral', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  EN_ATTENTE: { text: 'En attente de confirmation', step: 1, stamp: 'EN ATTENTE', style: 'stamp-ink-neutral', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  VALIDEE: { text: 'Confirmée', step: 2, stamp: 'CONFIRMÉE', style: 'stamp-ink-neutral', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300' },
  CONFIRMEE: { text: 'Confirmée', step: 2, stamp: 'CONFIRMÉE', style: 'stamp-ink-neutral', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300' },
  COLLECTE_PROGRAMMEE: { text: 'Collecte programmée', step: 3, stamp: 'COLLECTE PROGR.', style: 'stamp-ink-neutral', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300' },
  COLIS_COLLECTE: { text: 'Colis collecté', step: 4, stamp: 'COLIS COLLECTÉ', style: 'stamp-ink-neutral', badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  GROUPEE: { text: 'Groupée en tournée', step: 4, stamp: 'GROUPÉE', style: 'stamp-ink-neutral', badgeColor: 'bg-slate-100 text-slate-900 border-slate-300' },
  EN_TRANSIT: { text: 'En transit', step: 5, stamp: 'EN TRANSIT', style: 'stamp-ink-red', badgeColor: 'bg-orange-100 text-orange-900 border-orange-300' },
  LIVREE: { text: 'Livrée', step: 6, stamp: 'LIVRÉE', style: 'stamp-ink-red', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  REFUSEE: { text: 'Refusée', step: 0, stamp: 'REFUSÉE', style: 'stamp-ink-muted', badgeColor: 'bg-rose-100 text-rose-900 border-rose-300' },
  ANNULEE: { text: 'Annulée', step: 0, stamp: 'ANNULÉE', style: 'stamp-ink-muted', badgeColor: 'bg-gray-200 text-gray-800 border-gray-400' },
  INCIDENT: { text: 'Incident', step: 4, stamp: 'INCIDENT', style: 'stamp-ink-muted', badgeColor: 'bg-red-100 text-red-900 border-red-300' },
}

export const ETAPES_CYCLE = [
  { id: 1, label: 'En attente' },
  { id: 2, label: 'Confirmée' },
  { id: 3, label: 'Collecte progr.' },
  { id: 4, label: 'Collectée' },
  { id: 5, label: 'En transit' },
  { id: 6, label: 'Livrée' },
]

export default function MesCommandesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHistoryView = location.pathname.includes('historique')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    demandesService.getAll()
      .then(data => {
        const raw = Array.isArray(data) ? data : []
        setOrders(raw)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const terminal = ['LIVREE', 'REFUSEE', 'ANNULEE', 'INCIDENT']
  const activeOrders = orders.filter(o => !terminal.includes(o.statut))
  const historyOrders = orders.filter(o => terminal.includes(o.statut))

  const filteredActive = activeOrders.filter(o =>
    (o.demandeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.adresseLivraison || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.adresseCollecte || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clientNom || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.agenceNom || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = historyOrders.filter(o =>
    (o.demandeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.adresseLivraison || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.adresseCollecte || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clientNom || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.agenceNom || '').toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return d
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête registre */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-[#ECECEC] pb-4">
        <div>
          <h1 className="font-display text-[26px] font-bold text-[#1A1A1E] leading-tight">
            {isHistoryView ? 'Historique des Expéditions' : 'Mes Expéditions'}
          </h1>
          <p className="font-body text-[13.5px] text-[#8A8A92] mt-0.5">
            {isHistoryView
              ? 'Archives certifiées des bordereaux livrés, annulés ou clôturés.'
              : 'Suivez le cycle de vie de vos demandes de fret en temps réel.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/client/nouvelle_demande')}
          className="bg-[#E8433D] text-white border-0 rounded px-5 py-2.5 font-body font-semibold text-[13px] hover:bg-[#B82823] active:scale-[0.99] transition-all cursor-pointer shadow flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Nouvelle Expédition</span>
        </button>
      </div>

      {/* Barre de recherche & filtres */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[360px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A8A92] text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, adresse, agence..."
            className="w-full border border-[#ECECEC] bg-white rounded pl-9 pr-3.5 py-2 text-xs text-[#1A1A1E] font-mono placeholder:text-[#8A8A92] focus:outline-none focus:border-[#1A1A1E] transition-colors"
          />
        </div>
      </div>

      {loading && (
        <div className="bordereau-row p-12 text-center text-sm font-mono text-[#8A8A92]">
          Consultation du registre des expéditions…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">
          {error}
        </div>
      )}

      {/* Liste des commandes actives avec stepper à 6 jalons */}
      {!loading && !isHistoryView && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase font-bold text-[#8A8A92]">
              Expéditions en cours de traitement ({filteredActive.length})
            </span>
          </div>

          {filteredActive.length === 0 ? (
            <div className="bordereau-row p-10 text-center space-y-3">
              <span className="material-symbols-outlined text-[36px] text-[#8A8A92]">inbox</span>
              <p className="font-body text-sm text-[#8A8A92]">Aucune expédition active pour le moment.</p>
              <button
                onClick={() => navigate('/client/nouvelle_demande')}
                className="bg-[#1A1A1E] text-white rounded px-4 py-2 font-body text-xs cursor-pointer inline-block"
              >
                Créer une nouvelle demande de fret
              </button>
            </div>
          ) : (
            filteredActive.map((order) => {
              const info = STATUT_LABELS[order.statut] || STATUT_LABELS.CREEE
              return (
                <div
                  key={order.demandeId}
                  onClick={() => navigate(`/client/detail_commande?id=${order.demandeId}`)}
                  className="bordereau-row p-5 sm:p-6 cursor-pointer hover:border-[#1A1A1E] transition-all border border-[#ECECEC] hover:shadow-sm"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_auto] gap-5 items-center">
                    {/* Bloc descriptif */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#E8433D]">
                          #{String(order.demandeId).slice(0, 8).toUpperCase()}
                        </span>
                        {order.agenceNom && (
                          <span className="font-mono text-[10px] text-[#8A8A92] bg-[#F7F7F8] px-1.5 py-0.5 rounded border border-[#ECECEC]">
                            {order.agenceNom}
                          </span>
                        )}
                      </div>

                      <div className="font-display font-bold text-sm text-[#1A1A1E] mt-1 line-clamp-1">
                        {order.adresseLivraison || 'Destination non définie'}
                      </div>

                      <div className="font-body text-[11.5px] text-[#8A8A92] mt-0.5">
                        Départ : {order.adresseCollecte ? order.adresseCollecte.slice(0, 32) + '…' : '—'}
                      </div>

                      <div className="font-mono text-[11px] text-[#1A1A1E] font-semibold mt-1">
                        {order.nbColis || (order.colis ? order.colis.length : 1)} colis &middot; {order.tarif ? `${new Intl.NumberFormat('fr-MG').format(order.tarif)} Ar` : 'Devis accepté'}
                      </div>
                    </div>

                    {/* Stepper à 6 étapes du cycle de vie */}
                    <div className="w-full px-2">
                      <div className="flex items-center justify-between relative">
                        {ETAPES_CYCLE.map((stepItem, i) => {
                          const isDone = info.step >= stepItem.id
                          const isCurrent = info.step === stepItem.id

                          return (
                            <div key={stepItem.id} className="flex flex-col items-center gap-1.5 flex-1 relative text-center">
                              {i < ETAPES_CYCLE.length - 1 && (
                                <div
                                  className={`absolute top-[7px] left-1/2 w-full h-[2px] z-0 transition-colors ${
                                    info.step > stepItem.id ? 'bg-[#E8433D]' : 'bg-[#ECECEC]'
                                  }`}
                                />
                              )}
                              <div
                                className={`w-[15px] h-[15px] rounded-full border-2 z-10 transition-all ${
                                  isCurrent
                                    ? 'bg-[#E8433D] border-[#1A1A1E] ring-2 ring-[#E8433D]/30 scale-110'
                                    : isDone
                                      ? 'bg-[#E8433D] border-[#E8433D]'
                                      : 'bg-white border-[#ECECEC]'
                                }`}
                              />
                              <span
                                className={`font-mono text-[9px] uppercase tracking-wider ${
                                  isCurrent
                                    ? 'text-[#E8433D] font-bold'
                                    : isDone
                                      ? 'text-[#1A1A1E] font-medium'
                                      : 'text-[#8A8A92]'
                                }`}
                              >
                                {stepItem.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Cachet Registre */}
                    <div className="flex flex-col sm:items-end items-start gap-1">
                      <div className={`stamp-ink ${info.style} text-[10px]`}>
                        {info.stamp}
                      </div>
                      <span className="font-mono text-[10px] text-[#8A8A92]">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Registre des archives / Historique */}
      <div className="bordereau-row overflow-hidden mt-8 border border-[#ECECEC]">
        <div className="p-5 border-b border-[#ECECEC] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-display text-base font-bold uppercase text-[#1A1A1E]">
              {isHistoryView ? 'Registre Exhaustif des Expéditions' : 'Archives Récentes'}
            </h3>
            <p className="font-body text-xs text-[#8A8A92] mt-0.5">
              Bordereaux achevés, preuves de livraison et historiques clôturés.
            </p>
          </div>
          <span className="font-mono text-xs text-[#8A8A92] bg-[#F7F7F8] px-3 py-1 rounded border border-[#ECECEC]">
            {filteredHistory.length} DOSSIERS ARCHIVÉS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F7F8] border-b border-[#ECECEC]">
                <th className="px-5 py-3 font-mono text-[10.5px] font-bold text-[#8A8A92] uppercase">Réf. Bordereau</th>
                <th className="px-5 py-3 font-mono text-[10.5px] font-bold text-[#8A8A92] uppercase">Date</th>
                <th className="px-5 py-3 font-mono text-[10.5px] font-bold text-[#8A8A92] uppercase">Destination</th>
                <th className="px-5 py-3 font-mono text-[10.5px] font-bold text-[#8A8A92] uppercase">Montant</th>
                <th className="px-5 py-3 font-mono text-[10.5px] font-bold text-[#8A8A92] uppercase">Statut Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] font-body text-xs">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[#8A8A92]">Aucun bordereau archivé.</td>
                </tr>
              ) : (
                filteredHistory.map((row) => {
                  const info = STATUT_LABELS[row.statut] || STATUT_LABELS.CREEE
                  return (
                    <tr
                      key={row.demandeId}
                      onClick={() => navigate(`/client/detail_commande?id=${row.demandeId}`)}
                      className="hover:bg-[#F7F7F8] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-[#E8433D]">
                        #{String(row.demandeId).slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#8A8A92]">{formatDate(row.createdAt)}</td>
                      <td className="px-5 py-3.5 font-display font-semibold text-[#1A1A1E]">{row.adresseLivraison || '—'}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#1A1A1E]">
                        {row.tarif ? `${new Intl.NumberFormat('fr-MG').format(row.tarif)} Ar` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`stamp-ink text-[9.5px] py-0.5 px-2 ${info.style}`}>
                          {info.stamp}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
