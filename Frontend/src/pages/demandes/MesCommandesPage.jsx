import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'

const STATUT_LABELS = {
  CREEE: { text: 'Créée', step: 0, stamp: 'CRÉÉE', style: 'stamp-ink-neutral' },
  VALIDEE: { text: 'Validée', step: 1, stamp: 'VALIDÉE', style: 'stamp-ink-neutral' },
  EN_ATTENTE_GROUPAGE: { text: 'En attente', step: 1, stamp: 'EN ATTENTE', style: 'stamp-ink-neutral' },
  GROUPEE: { text: 'Groupée', step: 2, stamp: 'GROUPÉE', style: 'stamp-ink-neutral' },
  EN_TRANSIT: { text: 'En transit', step: 3, stamp: 'EN TRANSIT', style: 'stamp-ink-red' },
  LIVREE: { text: 'Livrée', step: 4, stamp: 'LIVRÉE', style: 'stamp-ink-red' },
  INCIDENT: { text: 'Incident', step: 3, stamp: 'INCIDENT', style: 'stamp-ink-muted' },
  REFUSEE: { text: 'Refusée', step: 0, stamp: 'REFUSÉE', style: 'stamp-ink-muted' },
  ANNULEE: { text: 'Annulée', step: 0, stamp: 'ANNULÉE', style: 'stamp-ink-muted' },
}

const STEPS = ['Créée', 'Préparation', 'En livraison', 'Livrée']

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
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const terminal = ['LIVREE', 'REFUSEE', 'ANNULEE', 'INCIDENT']
  const activeOrders = orders.filter(o => !terminal.includes(o.statut))
  const historyOrders = orders.filter(o => terminal.includes(o.statut))

  const filteredActive = activeOrders.filter(o =>
    (o.demandeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.adresseLivraison || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clientNom || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = historyOrders.filter(o =>
    (o.demandeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.adresseLivraison || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clientNom || '').toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[25px] font-bold text-[#1A1A1E] leading-tight">
          {isHistoryView ? 'Historique des expéditions' : 'Mes expéditions'}
        </h1>
        <p className="font-body text-[13.5px] text-[#8A8A92] mt-1">
          {isHistoryView
            ? 'Archives des bordereaux clôturés.'
            : 'Gérez vos expéditions en cours et consultez votre historique.'}
        </p>
      </div>

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

      {loading && (
        <div className="bordereau-row p-8 text-center text-sm font-mono text-[#8A8A92]">
          Chargement…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">
          {error}
        </div>
      )}

      {!loading && !isHistoryView && (
        <div className="space-y-3.5">
          {filteredActive.length === 0 ? (
            <div className="bordereau-row p-8 text-center text-sm font-mono text-[#8A8A92]">
              Aucune expédition en cours.
            </div>
          ) : (
            filteredActive.map((order) => {
              const info = STATUT_LABELS[order.statut] || STATUT_LABELS.CREEE
              return (
                <div
                  key={order.demandeId}
                  onClick={() => navigate(`/client/detail_commande?id=${order.demandeId}`)}
                  className="bordereau-row p-5 sm:p-[22px_26px] cursor-pointer hover:border-[#1A1A1E] transition-colors"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-5 lg:gap-8 items-center">
                    <div className="min-w-[220px]">
                      <div className="font-mono font-bold text-xs text-[#8A8A92] tracking-[0.5px]">
                        #{String(order.demandeId).slice(0, 8).toUpperCase()}
                      </div>
                      <div className="font-display font-bold text-base text-[#1A1A1E] mt-0.5 mb-1">
                        {order.adresseLivraison || '—'}
                      </div>
                      <div className="font-body text-[12.5px] text-[#8A8A92]">
                        {order.nbColis} colis &middot; {order.hubNom || '—'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between min-w-[280px] max-w-[500px] w-full mx-auto px-2">
                      {STEPS.map((label, i) => {
                        const isDone = i < info.step
                        return (
                          <div key={label} className="flex flex-col items-center gap-1.5 flex-1 relative text-center">
                            {i < STEPS.length - 1 && (
                              <div className={`absolute top-[7px] left-1/2 w-full h-[2px] z-0 ${
                                i < info.step - 1 ? 'bg-[#E8433D]' : 'bg-[#ECECEC]'
                              }`} />
                            )}
                            <div className={`w-[14px] h-[14px] rounded-full border-2 z-10 transition-colors ${
                              isDone ? 'bg-[#E8433D] border-[#E8433D]' : 'bg-white border-[#ECECEC]'
                            }`} />
                            <span className={`font-display text-[9.5px] uppercase tracking-[0.4px] ${
                              isDone ? 'text-[#1A1A1E] font-bold' : 'text-[#8A8A92]'
                            }`}>
                              {label}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-end">
                      <div className={`stamp-ink ${info.style}`}>{info.stamp}</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <div className="bordereau-row overflow-hidden mt-8">
        <div className="p-5 border-b border-[#ECECEC] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-display text-base font-bold uppercase text-[#1A1A1E]">
              {isHistoryView ? 'Registre Général des Expéditions' : 'Archives Récentes'}
            </h3>
            <p className="font-body text-xs text-[#8A8A92] mt-0.5">
              Bordereaux clôturés, refusés ou annulés.
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
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">Référence</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">Date</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">Destination</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">Tarif</th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold text-[#8A8A92] uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC] font-body text-xs">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[#8A8A92]">Aucune archive.</td>
                </tr>
              ) : (
                filteredHistory.map((row) => {
                  const info = STATUT_LABELS[row.statut] || STATUT_LABELS.CREEE
                  return (
                    <tr
                      key={row.demandeId}
                      onClick={() => navigate(`/client/detail_commande?id=${row.demandeId}`)}
                      className="hover:bg-[#F7F7F8]/80 cursor-pointer transition-colors"
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
                        <span className={`stamp-ink text-[10px] py-0.5 px-2 ${info.style}`}>
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
