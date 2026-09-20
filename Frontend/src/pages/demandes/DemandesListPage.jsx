import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'
import ValiderCommandeModal from '../../components/ValiderCommandeModal'

const STATUT_MAP = {
  CREEE: { label: 'Créée', dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  VALIDEE: { label: 'Validée', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  EN_ATTENTE_GROUPAGE: { label: 'En attente groupage', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  GROUPEE: { label: 'Groupée', dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  EN_TRANSIT: { label: 'En transit', dot: 'bg-[#E8433D]', badge: 'bg-red-50 text-[#E8433D] border-red-200' },
  LIVREE: { label: 'Livrée', dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' },
  INCIDENT: { label: 'Incident', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-700 border-gray-200' },
  REFUSEE: { label: 'Refusée', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-500 border-gray-200' },
  ANNULEE: { label: 'Annulée', dot: 'bg-gray-300', badge: 'bg-gray-50 text-gray-400 border-gray-200' },
}

const FILTERS = [
  { key: 'Tous', statut: null },
  { key: 'CREEE', statut: 'CREEE' },
  { key: 'EN_ATTENTE_GROUPAGE', statut: 'EN_ATTENTE_GROUPAGE' },
  { key: 'EN_TRANSIT', statut: 'EN_TRANSIT' },
  { key: 'LIVREE', statut: 'LIVREE' },
  { key: 'REFUSEE', statut: 'REFUSEE' },
]

function RefuseModal({ open, onClose, onConfirm }) {
  const [motif, setMotif] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#1A1A1E] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
        <h3 className="font-display text-lg font-bold text-[#1A1A1E] uppercase">Refuser la commande</h3>
        <textarea
          rows={3}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif du refus..."
          className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-body text-xs focus:outline-none focus:border-[#1A1A1E]"
        />
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 border border-[#ECECEC] rounded font-body text-xs text-[#8A8A92] hover:text-[#1A1A1E]">
            Annuler
          </button>
          <button onClick={() => onConfirm(motif)}
            className="px-4 py-2 bg-[#E8433D] text-white rounded font-body font-semibold text-xs hover:bg-[#B82823]">
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DemandesListPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  // Refuse modal
  const [refuseTarget, setRefuseTarget] = useState(null)
  // Valider modal (Phase 3bis)
  const [validerTarget, setValiderTarget] = useState(null)
  const [validerNbColis, setValiderNbColis] = useState(0)
  const [acting, setActing] = useState(false)

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await demandesService.getAll()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const filtreStatut = FILTERS.find(f => f.key === activeFilter)?.statut
  const filtered = orders.filter(o => {
    if (filtreStatut && o.statut !== filtreStatut) return false
    if (search) {
      const s = search.toLowerCase()
      const id = (o.demandeId || '').toLowerCase()
      const client = (o.clientNom || '').toLowerCase()
      const dest = (o.adresseLivraison || '').toLowerCase()
      if (!id.includes(s) && !client.includes(s) && !dest.includes(s)) return false
    }
    return true
  })

  const selectable = filtered.filter(o => o.statut === 'EN_ATTENTE_GROUPAGE')
  const allSelected = selectable.length > 0 && selectable.every(o => selectedIds.includes(o.demandeId))

  const toggleAll = () => setSelectedIds(allSelected ? [] : selectable.map(o => o.demandeId))
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleOptimisation = () => {
    const selected = orders.filter(o => selectedIds.includes(o.demandeId))
    navigate('/logistics/optimisation', { state: { selectedOrders: selected } })
  }

  const handleValider = async (demandeId, modeLivraison) => {
    setActing(true)
    try {
      await demandesService.valider(demandeId, modeLivraison)
      setValiderTarget(null)
      await loadOrders()
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(false)
    }
  }

  const openValiderModal = (o) => {
    setValiderTarget(o.demandeId)
    setValiderNbColis(getNbColis(o))
  }

  const handleRefuser = async (motif) => {
    if (!refuseTarget) return
    setActing(true)
    try {
      await demandesService.refuser(refuseTarget, motif)
      setRefuseTarget(null)
      await loadOrders()
    } catch (e) {
      setError(e.message)
    } finally {
      setActing(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const getNbColis = (o) => Array.isArray(o.colis) ? o.colis.length : (o.nbColis ?? 0)
  const countByStatut = (s) => orders.filter(o => o.statut === s).length

  return (
    <div className="space-y-6">
      <RefuseModal open={!!refuseTarget} onClose={() => setRefuseTarget(null)} onConfirm={handleRefuser} />
      <ValiderCommandeModal open={!!validerTarget} nbColis={validerNbColis}
        onClose={() => setValiderTarget(null)} onConfirm={(mode) => handleValider(validerTarget, mode)} acting={acting} />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-[#ECECEC] pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#1A1A1E]">Gestion des Commandes</h2>
          <p className="font-body text-sm text-[#8A8A92]">Validez, refusez et suivez les commandes de vos clients.</p>
        </div>
        <div className="inline-flex rounded border border-[#ECECEC] bg-[#F7F7F8] p-1 overflow-x-auto">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className={`rounded px-3 py-1 font-display text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                activeFilter === f.key ? 'bg-[#1A1A1E] text-white font-bold' : 'text-[#8A8A92] hover:bg-white'
              }`}>
              {f.key === 'Tous' ? 'Tous' : (STATUT_MAP[f.key]?.label || f.key)}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="rounded border-2 border-[#E8433D] bg-[#E8433D]/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold uppercase text-[#E8433D]">
              {selectedIds.length} commande(s) sélectionnée(s)
            </span>
            <button onClick={handleOptimisation}
              className="flex items-center gap-2 rounded bg-[#E8433D] px-4 py-2 font-display text-xs uppercase font-bold text-white hover:bg-[#B82823] transition-colors">
              <span className="material-symbols-outlined text-[18px]">auto_graph</span>
              Optimiser la sélection
            </button>
          </div>
          <p className="font-body text-[11px] text-[#E8433D]/80">
            Le groupage porte sur le hub des commandes sélectionnées — toutes les commandes en attente de ce hub seront incluses.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: orders.length, icon: 'assignment', color: '#1A1A1E' },
          { label: 'En attente', value: countByStatut('CREEE'), icon: 'pending', color: '#F59E0B' },
          { label: 'En cours', value: countByStatut('EN_TRANSIT') + countByStatut('EN_ATTENTE_GROUPAGE'), icon: 'local_shipping', color: '#E8433D' },
          { label: 'Livrées', value: countByStatut('LIVREE'), icon: 'check_circle', color: '#10B981' },
        ].map(c => (
          <div key={c.label} className="bordereau-row p-4 space-y-1" style={{ borderLeftColor: c.color, borderLeftWidth: '4px' }}>
            <span className="material-symbols-outlined" style={{ color: c.color }}>{c.icon}</span>
            <p className="font-mono text-[10px] text-[#8A8A92] uppercase">{c.label}</p>
            <h3 className="font-display text-2xl font-bold text-[#1A1A1E]">{loading ? '—' : c.value}</h3>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">{error}</div>
      )}

      <div className="bordereau-row overflow-hidden">
        <div className="border-b border-[#ECECEC] bg-[#F7F7F8] px-4 py-3 md:px-6">
          <div className="relative max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A92] text-[18px]">search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded border border-[#ECECEC] bg-white py-1.5 pl-10 pr-4 font-body text-xs focus:border-[#1A1A1E] focus:outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#E8433D]">progress_activity</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#8A8A92]">
            <span className="material-symbols-outlined text-5xl opacity-30">assignment</span>
            <p className="font-body text-sm mt-2">Aucune commande</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-[#ECECEC] bg-[#F7F7F8]">
                  <tr>
                    <th className="px-4 py-3 md:px-6 w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll}
                        className="w-4 h-4 rounded" />
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Réf.</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Client</th>
                    <th className="hidden md:table-cell px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Destination</th>
                    <th className="hidden sm:table-cell px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Colis</th>
                    <th className="hidden sm:table-cell px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Tarif</th>
                    <th className="hidden lg:table-cell px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Date souhaitée</th>
                    <th className="hidden lg:table-cell px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Urgence</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Statut</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase text-[#8A8A92]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECEC]">
                  {filtered.map(o => {
                    const st = STATUT_MAP[o.statut] || STATUT_MAP.CREEE
                    const isCree = o.statut === 'CREEE'
                    const isSelectable = o.statut === 'EN_ATTENTE_GROUPAGE'
                    return (
                      <tr key={o.demandeId} className="hover:bg-[#F7F7F8]/60 transition-colors">
                        <td className="px-4 py-3 md:px-6">
                          <input type="checkbox" checked={selectedIds.includes(o.demandeId)}
                            onChange={() => toggleOne(o.demandeId)} disabled={!isSelectable}
                            className="w-4 h-4 rounded disabled:opacity-30" />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#E8433D] cursor-pointer hover:underline"
                          onClick={() => navigate(`/logistics/commande_detail?id=${o.demandeId}`)}>
                          #{String(o.demandeId).slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-body text-xs">{o.clientNom || '—'}</td>
                        <td className="hidden md:table-cell px-4 py-3 font-body text-xs text-[#8A8A92] max-w-[200px] truncate">{o.adresseLivraison || '—'}</td>
                        <td className="hidden sm:table-cell px-4 py-3 font-mono text-xs">{getNbColis(o)}</td>
                        <td className="hidden sm:table-cell px-4 py-3 font-mono text-xs font-bold">
                          {o.tarif ? `${new Intl.NumberFormat('fr-MG').format(o.tarif)} Ar` : '—'}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 font-mono text-xs text-[#8A8A92]">
                          {o.dateSouhaitee || '—'} {o.creneau ? `(${o.creneau})` : ''}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          {(() => {
                            if (!o.dateDepartCalculee) return <span className="text-[10px] text-[#8A8A92]">—</span>
                            const today = new Date(); today.setHours(0,0,0,0)
                            const target = new Date(o.dateDepartCalculee); target.setHours(0,0,0,0)
                            const diff = Math.ceil((target - today) / 86400000)
                            const forced = o.departForceDelai || diff <= 0
                            const urgent = diff <= 2 && diff > 0
                            const cls = forced ? 'bg-red-100 text-red-700 border-red-300'
                              : urgent ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-green-100 text-green-700 border-green-300'
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${forced ? 'bg-red-500' : urgent ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                                {forced ? 'DEPART FORCE' : `J-${diff}`}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${st.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            {st.label}
                          </span>
                          {o.modeLivraison && (
                            <span className={`ml-1 inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                              o.modeLivraison === 'FREELANCE' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-blue-400 bg-blue-50 text-blue-700'
                            }`}>{o.modeLivraison}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isCree && (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openValiderModal(o)} disabled={acting}
                                className="bg-green-600 text-white rounded px-2 py-1 font-mono text-[10px] hover:bg-green-700 disabled:opacity-40 cursor-pointer"
                                title="Valider">
                                Valider
                              </button>
                              <button onClick={() => setRefuseTarget(o.demandeId)} disabled={acting}
                                className="border border-[#E8433D] text-[#E8433D] rounded px-2 py-1 font-mono text-[10px] hover:bg-[#E8433D] hover:text-white disabled:opacity-40 cursor-pointer"
                                title="Refuser">
                                Refuser
                              </button>
                            </div>
                          )}
                          {!isCree && (
                            <button onClick={() => navigate(`/logistics/commande_detail?id=${o.demandeId}`)}
                              className="font-mono text-[10px] text-[#8A8A92] hover:text-[#1A1A1E] bg-transparent border-0 cursor-pointer underline">
                              Voir
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#ECECEC] bg-[#F7F7F8] px-4 py-3 md:px-6 font-mono text-[10px] text-[#8A8A92]">
              <p>{filtered.length} commande(s)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
