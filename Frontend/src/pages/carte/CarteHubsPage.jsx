import { useState, useEffect, useCallback, useRef } from 'react'
import { Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../../map/MapView'
import { getMeta, putMeta } from '../../map/mapCache'
import { hubsService } from '../../services/hubsService'
import { mapsService } from '../../services/mapsService'
import { offlineStorage } from '../../offline/offlineStorage'
import { useOffline } from '../../hooks/useOffline'

const DEFAULT_CENTER = [-18.914, 47.541]
const MG_BOUNDS = { latMin: -25.5, latMax: -11.5, lngMin: 43, lngMax: 50.5 }

function isMadagascar(lat, lng) {
  return lat >= MG_BOUNDS.latMin && lat <= MG_BOUNDS.latMax && lng >= MG_BOUNDS.lngMin && lng <= MG_BOUNDS.lngMax
}

function mapHub(h) {
  return {
    id: h.hubId || h.id,
    hubId: h.hubId || h.id,
    nom: h.nom,
    adresse: h.adresse || '',
    lat: h.latitude ?? h.lat,
    lng: h.longitude ?? h.lng,
    zoneSecuriseeDispo: h.zoneSecuriseeDispo || false,
    statut: h.actif !== false ? 'actif' : 'inactif',
    actif: h.actif !== false,
  }
}

const hubIcon = L.divIcon({
  className: '',
  html: `<div style="background:#E8433D;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:18px">location_on</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

function MapClickHandler({ active, onClick }) {
  useMapEvents({ click: (e) => { if (active) onClick(e.latlng) } })
  return null
}

function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null)
  const eventHandlers = useRef({ dragend: () => { const m = markerRef.current; if (m) onDragEnd(m.getLatLng()) } })
  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={hubIcon}
      draggable
      eventHandlers={eventHandlers.current}
    />
  )
}

function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'error' ? 'bg-error text-on-error' : type === 'success' ? 'bg-secondary text-on-secondary' : 'bg-tertiary-container text-on-tertiary-container'
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${bg} rounded-xl px-5 py-3 font-label-md text-label-md shadow-lg flex items-center gap-3`}>
      <span>{message}</span>
      <button onClick={onClose} className="font-bold ml-2">✕</button>
    </div>
  )
}

export default function CarteHubsPage() {
  const online = useOffline()
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState(null)
  const [form, setForm] = useState({ nom: '', adresse: '' })
  const [reverseLoading, setReverseLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [center, setCenter] = useState(DEFAULT_CENTER)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchHubs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await hubsService.lister()
      const mapped = data.map(mapHub)
      setHubs(mapped)
      putMeta('hubs_list', mapped)
    } catch {
      if (!online) {
        try {
          const cached = await getMeta('hubs_list')
          if (cached) { setHubs(cached); return }
        } catch { /* noop */ }
      }
      try {
        const stored = localStorage.getItem('madalogistix_hubs')
        if (stored) setHubs(JSON.parse(stored))
      } catch { /* noop */ }
    } finally {
      setLoading(false)
    }
  }, [online])

  useEffect(() => { fetchHubs() }, [fetchHubs])

  const flushQueue = useCallback(async () => {
    const actions = await offlineStorage.getAll('pendingActions')
    const hubActions = actions.filter(a => a.type === 'create_hub')
    if (hubActions.length === 0) return
    for (const action of hubActions) {
      try {
        await hubsService.creer(action.payload)
        await offlineStorage.save('pendingActions', { ...action, synced: true })
      } catch { /* retry next time */ }
    }
    setPendingCount(0)
    fetchHubs()
    showToast(`${hubActions.length} hub(s) synchronisé(s)`, 'success')
  }, [fetchHubs, showToast])

  useEffect(() => {
    if (online) flushQueue()
  }, [online, flushQueue])

  useEffect(() => {
    offlineStorage.getAll('pendingActions').then(actions => {
      setPendingCount(actions.filter(a => a.type === 'create_hub').length)
    })
  }, [])

  const handleMapClick = useCallback((latlng) => {
    if (!isMadagascar(latlng.lat, latlng.lng)) {
      showToast('Position hors de Madagascar', 'error')
      return
    }
    setPendingLatLng(latlng)
    setForm(f => ({ ...f, adresse: '' }))
    setReverseLoading(true)
    mapsService.reverse(latlng.lat, latlng.lng).then(data => {
      setForm(f => ({ ...f, adresse: data?.display_name || data?.formatted || '' }))
    }).catch(() => {}).finally(() => setReverseLoading(false))
  }, [showToast])

  const handleDragEnd = useCallback((latlng) => {
    if (!isMadagascar(latlng.lat, latlng.lng)) {
      showToast('Position hors de Madagascar', 'error')
      return
    }
    setPendingLatLng(latlng)
    setReverseLoading(true)
    mapsService.reverse(latlng.lat, latlng.lng).then(data => {
      setForm(f => ({ ...f, adresse: data?.display_name || data?.formatted || '' }))
    }).catch(() => {}).finally(() => setReverseLoading(false))
  }, [showToast])

  const handleSave = async () => {
    if (!form.nom.trim() || !pendingLatLng) return
    setSaving(true)
    const payload = {
      nom: form.nom,
      adresse: form.adresse || `${pendingLatLng.lat.toFixed(4)}, ${pendingLatLng.lng.toFixed(4)}`,
      latitude: pendingLatLng.lat,
      longitude: pendingLatLng.lng,
      zoneSecuriseeDispo: false,
    }
    try {
      if (!online) {
        await offlineStorage.save('pendingActions', { type: 'create_hub', payload, ts: Date.now() })
        const newHub = { id: `pending_${Date.now()}`, hubId: null, ...payload, statut: 'actif', actif: true, pending: true }
        setHubs(prev => [...prev, newHub])
        setPendingCount(c => c + 1)
        showToast('Hub enregistré — sera créé à la reconnexion', 'info')
      } else {
        const created = await hubsService.creer(payload)
        setHubs(prev => [...prev, mapHub(created)])
        showToast('Hub créé avec succès', 'success')
      }
      resetForm()
    } catch (err) {
      showToast(err.message || 'Erreur lors de la création', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (hub) => {
    if (!hub.hubId) {
      setHubs(prev => prev.filter(h => h.id !== hub.id))
      return
    }
    try {
      await hubsService.supprimer(hub.hubId)
      setHubs(prev => prev.filter(h => h.hubId !== hub.hubId))
      showToast('Hub supprimé', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur lors de la suppression', 'error')
    }
  }

  const resetForm = () => {
    setForm({ nom: '', adresse: '' })
    setPendingLatLng(null)
    setPlacing(false)
    setReverseLoading(false)
  }

  const handleMyLocation = () => {
    if (!navigator.geolocation) return showToast('Géolocalisation non disponible', 'error')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        if (!isMadagascar(ll.lat, ll.lng)) return showToast('Position hors de Madagascar', 'error')
        setPlacing(true)
        handleMapClick(ll)
      },
      () => showToast('Impossible d\'obtenir votre position', 'error'),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const handleRecentrer = () => setCenter(DEFAULT_CENTER)

  const handleSync = async () => {
    if (!online) return showToast('Pas de connexion — synchronisation impossible', 'error')
    setSyncing(true)
    try {
      await flushQueue()
      await fetchHubs()
      showToast('Hubs synchronisés', 'success')
    } catch {
      showToast('Erreur lors de la synchronisation', 'error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Carte des Hubs</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {placing ? 'Cliquez sur la carte pour placer le hub.' : 'Gérez vos points de regroupement.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing || !online} className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 font-label-sm text-label-sm hover:bg-surface-container-highest transition-colors disabled:opacity-50" title="Synchroniser les hubs">
            <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
            {pendingCount > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>}
          </button>
          <button onClick={handleRecentrer} className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 font-label-sm text-label-sm hover:bg-surface-container-highest transition-colors" title="Recentrer Tana">
            <span className="material-symbols-outlined text-[16px]">my_location</span>
          </button>
          <button onClick={handleMyLocation} className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 font-label-sm text-label-sm hover:bg-surface-container-highest transition-colors" title="Ma position">
            <span className="material-symbols-outlined text-[16px]">gps_fixed</span>
          </button>
          <button
            onClick={() => placing ? resetForm() : setPlacing(true)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-label-md text-label-md shadow-sm transition-all ${placing ? 'bg-error text-on-error' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{placing ? 'close' : 'add'}</span>
            {placing ? 'Annuler' : 'Ajouter un hub'}
          </button>
        </div>
      </div>

      {placing && (
        <div className="rounded-xl border-2 border-primary bg-surface-container-lowest p-4 shadow-sm">
          {pendingLatLng ? (
            <p className="font-label-md text-label-md text-primary font-bold mb-2">
              {reverseLoading ? 'Recherche de l\'adresse...' : `Position : ${pendingLatLng.lat.toFixed(4)}, ${pendingLatLng.lng.toFixed(4)}`}
            </p>
          ) : (
            <p className="font-label-md text-label-md text-on-surface-variant mb-2">Cliquez sur la carte pour placer le hub</p>
          )}
          <div className="flex gap-3">
            <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du hub *" className="flex-1 rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md" />
            <input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse (auto)" className="flex-1 rounded-lg border border-outline-variant px-3 py-2 font-label-md text-label-md" />
            <button onClick={handleSave} disabled={saving || !pendingLatLng || !form.nom.trim()} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md font-bold disabled:opacity-50 flex items-center gap-2">
              {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm" style={{ height: '500px' }}>
        <MapView center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <MapClickHandler active={placing} onClick={handleMapClick} />
          {pendingLatLng && (
            <DraggableMarker position={[pendingLatLng.lat, pendingLatLng.lng]} onDragEnd={handleDragEnd} />
          )}
          {hubs.filter(h => typeof h.lat === 'number' && typeof h.lng === 'number').map((hub) => (
            <Marker key={hub.id} position={[hub.lat, hub.lng]} icon={hubIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-bold">{hub.nom}</p>
                  {hub.adresse && <p className="text-sm text-gray-600">{hub.adresse}</p>}
                  {hub.pending && <p className="text-xs text-amber-600 mt-1">En attente de synchro</p>}
                  <button onClick={() => handleDelete(hub)} className="mt-2 text-red-600 text-sm font-bold hover:underline">Supprimer</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapView>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-xl border border-amber-400 bg-amber-50 p-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-600">cloud_off</span>
          <p className="font-label-md text-label-sm text-amber-800">{pendingCount} hub(s) en attente de synchronisation</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hubs.map((hub) => (
          <div key={hub.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-surface-container-lowest ${hub.pending ? 'border-amber-300 border-dashed' : 'border-outline-variant'}`}>
            <span className={`material-symbols-outlined ${hub.pending ? 'text-amber-500' : 'text-primary'}`}>location_on</span>
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-label-md font-bold truncate">{hub.nom}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{hub.adresse || '—'}</p>
              {hub.pending && <p className="text-[10px] text-amber-600 mt-0.5">En attente de synchro</p>}
            </div>
          </div>
        ))}
      </div>

      {hubs.length === 0 && !loading && (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl opacity-30">add_location</span>
          <p className="font-body-md text-body-md mt-2">Aucun hub configuré</p>
          <p className="font-label-sm text-label-sm text-outline mt-1">Cliquez « Ajouter un hub » puis placez-le sur la carte.</p>
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}
