import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'

const FALLBACK_ORDERS = [
  { id: '#ANT-9405', client: 'Telma Madagascar', destination: 'Ankorondrano', weight: '120kg', volume: '0.8m³', priority: 'Haute', priorityClass: 'text-primary font-bold', status: 'En attente', isGreen: false, statusDot: true },
  { id: '#ANT-9404', client: 'Jovenna', destination: 'Ivato', weight: '450kg', volume: '2.5m³', priority: 'Normale', priorityClass: 'text-on-surface-variant', status: 'En cours', isGreen: false, statusDot: false },
  { id: '#ANT-9403', client: 'Galana', destination: 'Tamatave Port', weight: '1200kg', volume: '8m³', priority: 'Critique', priorityClass: 'text-primary font-bold', status: 'Livrée', isGreen: true, statusDot: false },
  { id: '#ANT-9402', client: 'BASF Madagascar', destination: 'Antsirabe', weight: '800kg', volume: '4.2m³', priority: 'Haute', priorityClass: 'text-primary font-bold', status: 'En attente', isGreen: false, statusDot: true },
  { id: '#ANT-9401', client: 'SHIP', destination: 'Toamasina', weight: '2200kg', volume: '12m³', priority: 'Critique', priorityClass: 'text-primary font-bold', status: 'En cours', isGreen: false, statusDot: false },
  { id: '#ANT-9400', client: 'Star Madagascar', destination: 'Antananarivo', weight: '350kg', volume: '1.5m³', priority: 'Normale', priorityClass: 'text-on-surface-variant', status: 'Livrée', isGreen: true, statusDot: false },
]

function mapApiOrder(o) {
  return {
    id: o.id || o.numero || o.reference,
    client: o.client?.nom || o.clientNom || o.client,
    destination: o.destination || o.villeDestination || '—',
    weight: o.poids ? `${o.poids}kg` : o.weight || '—',
    volume: o.volume ? `${o.volume}m³` : o.volume || '—',
    priority: o.priorite || o.priority || 'Normale',
    priorityClass: (o.priorite || o.priority) === 'Haute' || (o.priorite || o.priority) === 'Critique'
      ? 'text-primary font-bold' : 'text-on-surface-variant',
    status: o.statut || o.status || 'En attente',
    isGreen: (o.statut || o.status) === 'Livrée',
    statusDot: (o.statut || o.status) === 'En attente',
  }
}

const filters = ['Tous', 'En attente', 'En cours', 'Livrée']

function DemandesListPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [selectedOrders, setSelectedOrders] = useState([])
  const [orders, setOrders] = useState(FALLBACK_ORDERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await demandesService.getAll()
        if (!cancelled && Array.isArray(data)) {
          setOrders(data.map(mapApiOrder))
        }
      } catch {
        // fallback mock
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = orders.filter((o) => {
    const matchStatus = activeFilter === 'Tous' || o.status === activeFilter
    const matchSearch = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.client.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const selectableOrders = filtered.filter(o => o.status === 'En attente')
  const allSelectableSelected = selectableOrders.length > 0 && selectableOrders.every(o => selectedOrders.includes(o.id))

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(selectableOrders.map(o => o.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSendToOptimisation = () => {
    const selected = orders.filter(o => selectedOrders.includes(o.id))
    navigate('/logistics/optimisation', { state: { selectedOrders: selected } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-stamp text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">BORDEREAUX & MANIFESTES</span>
            <span className="text-xs font-mono text-on-surface-variant">RN7-LOG</span>
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-on-surface mt-1">Gestion des Commandes</h2>
          <p className="font-body text-sm text-on-surface-variant">
            Gérez et suivez vos flux logistiques en temps réel sur le corridor Antananarivo–Antsirabe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded border border-outline-variant bg-surface-light p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded px-3 py-1 font-display text-xs uppercase tracking-wider transition-all ${
                  activeFilter === f
                    ? 'bg-primary text-white font-bold'
                    : 'text-on-surface-variant hover:bg-surface'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedOrders.length > 0 && (
        <div className="flex items-center justify-between rounded border-2 border-primary bg-primary/10 p-4">
          <span className="font-display text-sm font-bold uppercase tracking-wide text-primary">
            {selectedOrders.length} commande{selectedOrders.length > 1 ? 's' : ''} sélectionnée{selectedOrders.length > 1 ? 's' : ''} pour optimisation
          </span>
          <button
            onClick={handleSendToOptimisation}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 font-display text-xs uppercase tracking-wider font-bold text-white shadow transition-all hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">auto_graph</span>
            Envoyer vers Optimisation
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Commandes', value: orders.length.toLocaleString(), trend: '+12%', icon: 'assignment' },
          { label: 'En attente', value: orders.filter(o => o.status === 'En attente').length, icon: 'pending' },
          { label: 'En cours', value: orders.filter(o => o.status === 'En cours').length, icon: 'local_shipping' },
          { label: 'Livrées (24h)', value: orders.filter(o => o.status === 'Livrée').length, icon: 'check_circle' },
        ].map((card) => (
          <div key={card.label} className="waybill-card p-4 border-l-4 border-l-primary space-y-2">
            <div className="flex items-start justify-between">
              <span className="material-symbols-outlined text-primary">{card.icon}</span>
              {card.trend && <span className="font-display text-xs font-bold text-primary">{card.trend}</span>}
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-on-surface-variant">{card.label}</p>
              <h3 className="font-display text-2xl font-bold text-on-surface tabular-nums">{loading ? '—' : card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="waybill-card overflow-hidden">
        <div className="border-b border-outline-variant bg-surface-light px-4 py-3 md:px-6">
          <div className="relative max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une commande..."
              className="w-full rounded border border-outline-variant bg-surface py-1.5 pl-10 pr-4 font-body text-xs focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-outline-variant bg-surface-light">
              <tr>
                <th className="px-4 py-3.5 md:px-6 w-12">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-4 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant md:px-6">ID commande</th>
                <th className="px-4 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant md:px-6">Client</th>
                <th className="hidden px-4 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant md:table-cell md:px-6">Destination</th>
                <th className="hidden px-4 py-3.5 text-right font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant sm:table-cell md:px-6">Logistique</th>
                <th className="hidden px-4 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant lg:table-cell md:px-6">Priorité</th>
                <th className="px-4 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant md:px-6">Statut Stamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface">
              {filtered.map((order) => {
                const isSelectable = order.status === 'En attente'
                const isSelected = selectedOrders.includes(order.id)
                return (
                  <tr key={order.id} className={`transition-colors hover:bg-surface-light/70 ${isSelected ? 'bg-primary/10' : ''}`}>
                    <td className="px-4 py-4 md:px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                        disabled={!isSelectable}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-4 font-stamp text-sm font-bold text-primary md:px-6">{order.id}</td>
                    <td className="px-4 py-4 font-body text-sm text-on-surface md:px-6">{order.client}</td>
                    <td className="hidden px-4 py-4 font-body text-sm text-on-surface-variant md:table-cell md:px-6">{order.destination}</td>
                    <td className="hidden px-4 py-4 text-right sm:table-cell md:px-6">
                      <div className="font-display text-sm font-bold text-on-surface tabular-nums">{order.weight}</div>
                      <div className="font-body text-xs text-on-surface-variant">{order.volume}</div>
                    </td>
                    <td className="hidden px-4 py-4 lg:table-cell md:px-6">
                      <span className={`font-display text-xs uppercase tracking-wider ${order.priorityClass}`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 md:px-6">
                      <span className={`stamp-badge text-xs ${order.isGreen ? 'stamp-badge-green' : 'stamp-badge-red'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant bg-surface-light px-4 py-3 md:px-6 font-display text-xs uppercase tracking-wider text-on-surface-variant">
          <p>Affichage de 1-{filtered.length} sur {orders.length} commandes</p>
          <div className="flex gap-2">
            <button className="rounded border border-outline-variant px-3 py-1 transition-colors hover:bg-surface disabled:opacity-40" disabled>Précédent</button>
            <button className="rounded border border-outline-variant px-3 py-1 transition-colors hover:bg-surface">Suivant</button>
          </div>
        </div>
      </div>

      <div className="waybill-card flex h-[260px] flex-col p-5">
        <h4 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-on-surface border-b border-outline-variant/40 pb-2">Journal d'Activités Opérationnelles</h4>
        <div className="relative flex-1 space-y-3 overflow-y-auto pl-6 pr-2">
          <div className="absolute left-[7px] top-2 h-[calc(100%-16px)] w-0.5 bg-outline-variant" />
          {[
            { title: 'Bordereau #ANT-9405 enregistré', desc: 'Il y a 10 minutes par Admin Hub Tana', dot: 'bg-primary' },
            { title: '#ANT-9403 livrée au terminal Antsirabe', desc: 'Il y a 45 minutes', dot: 'bg-green-600' },
            { title: 'Chargement optimisé (Camion KAPPA 26)', desc: 'Il y a 2 heures', dot: 'bg-primary' },
            { title: 'Alerte corridor RN7 : Ambatolampy', desc: 'Il y a 3 heures', dot: 'bg-primary' },
          ].map((event, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-2 ring-surface ${event.dot}`} />
              <p className="font-display text-xs font-bold uppercase tracking-wide text-on-surface">{event.title}</p>
              <p className="font-body text-xs italic text-on-surface-variant">{event.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DemandesListPage
