import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { demandesService } from '../../services/demandesService'
import MapView from '../../map/MapView'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const STATUT_MAP = {
  CREEE: { label: 'Créée', stamp: 'CRÉÉE', style: 'stamp-ink-neutral', step: 0 },
  VALIDEE: { label: 'Validée', stamp: 'VALIDÉE', style: 'stamp-ink-neutral', step: 1 },
  EN_ATTENTE_GROUPAGE: { label: 'En attente', stamp: 'EN ATTENTE', style: 'stamp-ink-neutral', step: 1 },
  GROUPEE: { label: 'Groupée', stamp: 'GROUPÉE', style: 'stamp-ink-neutral', step: 2 },
  EN_TRANSIT: { label: 'En transit', stamp: 'EN TRANSIT', style: 'stamp-ink-red', step: 3 },
  LIVREE: { label: 'Livrée', stamp: 'LIVRÉE', style: 'stamp-ink-red', step: 4 },
  INCIDENT: { label: 'Incident', stamp: 'INCIDENT', style: 'stamp-ink-muted', step: 3 },
  REFUSEE: { label: 'Refusée', stamp: 'REFUSÉE', style: 'stamp-ink-muted', step: 0 },
  ANNULEE: { label: 'Annulée', stamp: 'ANNULÉE', style: 'stamp-ink-muted', step: 0 },
}

const STEPS = ['Créée', 'Préparation', 'En livraison', 'Livrée']

const markerIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

export default function CommandeDetailLogistiquePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(false)
  const [showRefuse, setShowRefuse] = useState(false)
  const [motif, setMotif] = useState('')

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    demandesService.getById(id)
      .then(setOrder)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleValider = async () => {
    setActing(true)
    try {
      await demandesService.valider(id)
      setOrder(prev => ({ ...prev, statut: 'EN_ATTENTE_GROUPAGE' }))
    } catch (e) { setError(e.message) }
    finally { setActing(false) }
  }

  const handleRefuser = async () => {
    setActing(true)
    try {
      await demandesService.refuser(id, motif)
      setOrder(prev => ({ ...prev, statut: 'REFUSEE', motifRefus: motif }))
      setShowRefuse(false)
    } catch (e) { setError(e.message) }
    finally { setActing(false) }
  }

  if (!id) return <p className="font-body text-xs text-[#8A8A92]">Aucune commande spécifiée.</p>
  if (loading) return <div className="bordereau-row p-8 text-center font-mono text-sm text-[#8A8A92]">Chargement…</div>
  if (error || !order) return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 font-body text-xs">{error || 'Introuvable'}</div>
      <button onClick={() => navigate('/logistics/commandes')} className="font-mono text-xs text-[#E8433D] bg-transparent border-0 cursor-pointer">← Retour</button>
    </div>
  )

  const info = STATUT_MAP[order.statut] || STATUT_MAP.CREEE
  const isCree = order.statut === 'CREEE'

  const MAP_CENTER = order.latitudeLivraison ? [order.latitudeLivraison, order.longitudeLivraison] : [-18.8792, 47.5079]
  const MARKERS = []
  if (order.latitudeCollecte) MARKERS.push({ pos: [order.latitudeCollecte, order.longitudeCollecte], color: '#3B82F6', label: 'Collecte' })
  if (order.latitudeLivraison) MARKERS.push({ pos: [order.latitudeLivraison, order.longitudeLivraison], color: '#E8433D', label: 'Livraison' })

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const totalPoids = (order.colis || []).reduce((s, c) => s + (parseFloat(c.poidsKg) || 0), 0)
  const totalVolume = (order.colis || []).reduce((s, c) => s + (parseFloat(c.volumeM3) || 0), 0)

  return (
    <div className="space-y-6">
      {showRefuse && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1E]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#1A1A1E] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-[#1A1A1E] uppercase">Refuser la commande</h3>
            <textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du refus..."
              className="w-full bg-white border border-[#ECECEC] rounded px-3 py-2 font-body text-xs focus:outline-none focus:border-[#1A1A1E]" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRefuse(false)} className="px-4 py-2 border border-[#ECECEC] rounded font-body text-xs text-[#8A8A92]">Annuler</button>
              <button onClick={handleRefuser} disabled={acting} className="px-4 py-2 bg-[#E8433D] text-white rounded font-body font-semibold text-xs disabled:opacity-40">
                {acting ? '…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#ECECEC] pb-4">
        <div>
          <button onClick={() => navigate('/logistics/commandes')}
            className="font-mono text-xs text-[#8A8A92] hover:text-[#1A1A1E] flex items-center gap-1 mb-2 bg-transparent border-0 cursor-pointer">
            ← Retour aux commandes
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-[#1A1A1E]">#{String(order.demandeId).slice(0, 8).toUpperCase()}</h1>
            <div className={`stamp-ink ${info.style}`}>{info.stamp}</div>
          </div>
          <p className="font-body text-xs text-[#8A8A92] mt-0.5">
            Client : <strong>{order.clientNom || '—'}</strong> &middot; Hub : <strong>{order.hubNom || '—'}</strong>
          </p>
        </div>
        {isCree && (
          <div className="flex gap-2">
            <button onClick={handleValider} disabled={acting}
              className="bg-green-600 text-white rounded px-4 py-2 font-mono text-xs font-bold hover:bg-green-700 disabled:opacity-40">
              Valider
            </button>
            <button onClick={() => setShowRefuse(true)} disabled={acting}
              className="border border-[#E8433D] text-[#E8433D] rounded px-4 py-2 font-mono text-xs font-bold hover:bg-[#E8433D] hover:text-white disabled:opacity-40">
              Refuser
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {MARKERS.length > 0 && (
            <div className="bordereau-row overflow-hidden">
              <div className="p-3 border-b border-[#ECECEC]"><span className="font-mono text-[10px] text-[#8A8A92] uppercase font-bold">Carte</span></div>
              <div style={{ height: '280px' }}>
                <MapView center={MAP_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
                  {MARKERS.map((m, i) => (
                    <Marker key={i} position={m.pos} icon={markerIcon(m.color)}>
                      <Popup>{m.label}</Popup>
                    </Marker>
                  ))}
                </MapView>
              </div>
            </div>
          )}

          <div className="bordereau-row p-6">
            <span className="font-display font-bold uppercase text-sm text-[#1A1A1E] mb-4 block">Suivi</span>
            <div className="flex items-center justify-between px-2">
              {STEPS.map((label, i) => {
                const isDone = i < info.step
                return (
                  <div key={label} className="flex flex-col items-center gap-1.5 flex-1 relative text-center">
                    {i < STEPS.length - 1 && <div className={`absolute top-[7px] left-1/2 w-full h-[2px] z-0 ${i < info.step - 1 ? 'bg-[#E8433D]' : 'bg-[#ECECEC]'}`} />}
                    <div className={`w-[14px] h-[14px] rounded-full border-2 z-10 ${isDone ? 'bg-[#E8433D] border-[#E8433D]' : 'bg-white border-[#ECECEC]'}`} />
                    <span className={`font-display text-[9.5px] uppercase ${isDone ? 'text-[#1A1A1E] font-bold' : 'text-[#8A8A92]'}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {order.colis && order.colis.length > 0 && (
            <div className="bordereau-row p-6 space-y-3">
              <span className="font-display font-bold uppercase text-sm text-[#1A1A1E]">Colis ({order.colis.length})</span>
              <table className="w-full text-xs">
                <thead>
                  <tr className="font-mono text-[10px] text-[#8A8A92] uppercase border-b border-[#ECECEC]">
                    <th className="text-left py-2">#</th><th className="text-left py-2">Poids</th><th className="text-left py-2">Volume</th><th className="text-left py-2">Catégorie</th><th className="text-left py-2">État</th>
                  </tr>
                </thead>
                <tbody>
                  {order.colis.map((c, i) => (
                    <tr key={c.colisId || i} className="border-b border-[#ECECEC] last:border-0">
                      <td className="py-2 font-mono text-[#E8433D]">{i + 1}</td>
                      <td className="py-2 font-mono">{c.poidsKg} kg</td>
                      <td className="py-2 font-mono">{c.volumeM3} m³</td>
                      <td className="py-2 font-body">{c.categorieLibelle || '—'}</td>
                      <td className="py-2 font-mono text-[10px]">{c.etat || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1A1A1E] font-bold">
                    <td className="py-1.5 font-mono text-[10px] uppercase">Total</td>
                    <td className="py-1.5 font-mono">{totalPoids} kg</td>
                    <td className="py-1.5 font-mono">{totalVolume} m³</td>
                    <td></td><td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {order.statut === 'REFUSEE' && order.motifRefus && (
            <div className="bordereau-row p-6 space-y-2">
              <span className="stamp-ink stamp-ink-muted text-xs">REFUSÉE</span>
              <p className="font-body text-sm font-bold text-[#1A1A1E]">Motif</p>
              <p className="font-body text-xs text-[#8A8A92]">{order.motifRefus}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bordereau-row p-5 space-y-3 font-body text-xs">
            <div className="border-b border-[#ECECEC] pb-2.5">
              <span className="font-mono text-[10px] text-[#8A8A92] uppercase block">Détails</span>
            </div>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between"><span className="text-[#8A8A92]">Collecte :</span><span className="font-bold text-right max-w-[200px]">{order.adresseCollecte || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8A8A92]">Livraison :</span><span className="font-bold text-[#E8433D] text-right max-w-[200px]">{order.adresseLivraison || '—'}</span></div>
              {order.dateSouhaitee && <div className="flex justify-between"><span className="text-[#8A8A92]">Date souhaitée :</span><span className="font-bold">{order.dateSouhaitee}</span></div>}
              {order.creneau && <div className="flex justify-between"><span className="text-[#8A8A92]">Créneau :</span><span className="font-bold">{order.creneau}</span></div>}
              {order.nomDestinataire && <div className="flex justify-between"><span className="text-[#8A8A92]">Destinataire :</span><span className="font-bold">{order.nomDestinataire}</span></div>}
              {order.telDestinataire && <div className="flex justify-between"><span className="text-[#8A8A92]">Tél. :</span><span className="font-bold">{order.telDestinataire}</span></div>}
              <div className="flex justify-between pt-2 border-t border-[#ECECEC] font-display">
                <span className="text-[#8A8A92] uppercase font-bold">Tarif :</span>
                <span className="text-[#E8433D] font-bold text-sm">{order.tarif ? `${new Intl.NumberFormat('fr-MG').format(order.tarif)} Ar` : '—'}</span>
              </div>
              <div className="flex justify-between"><span className="text-[#8A8A92]">Créée le :</span><span className="font-bold">{formatDate(order.createdAt)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
