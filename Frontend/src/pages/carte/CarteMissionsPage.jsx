import { Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../../map/MapView'
import { getMeta } from '../../map/mapCache'
import { useState, useEffect, useMemo } from 'react'

const HUB_KEY = 'madalogistix_hubs'
const DEFAULT_CENTER = [-18.914, 47.541]

const mockMissionStops = [
  { id: 1, nom: 'Pharmacie Centrale', lat: -18.920, lng: 47.517, status: 'en_cours', order: 1 },
  { id: 2, nom: 'Supermaki Ivandry', lat: -18.900, lng: 47.525, status: 'a_venir', order: 2 },
  { id: 3, nom: 'Dépôt Logistique Est', lat: -18.914, lng: 47.541, status: 'a_venir', order: 3 },
]

const statusColors = {
  en_cours: '#2563EB',
  a_venir: '#F97316',
  livree: '#16A34A',
}

const statusLabels = {
  en_cours: 'En cours',
  a_venir: 'À venir',
  livree: 'Terminée',
}

function makeIcon(color, label) {
  const key = `${color}:${label}`
  if (!makeIcon._cache) makeIcon._cache = {}
  if (!makeIcon._cache[key]) {
    makeIcon._cache[key] = L.divIcon({
      className: '',
      html: `<div style="position:relative"><div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold">${label}</div></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    })
  }
  return makeIcon._cache[key]
}

function CarteMissionsPage() {
  const [hub, setHub] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const stored = localStorage.getItem(HUB_KEY)
        if (stored) {
          const hubs = JSON.parse(stored)
          const active = hubs.find(h => h.statut === 'actif' && typeof h.lat === 'number' && typeof h.lng === 'number')
          if (active) { setHub(active); return }
        }
      } catch { /* fallback */ }
      try {
        const cached = await getMeta('hubs_list')
        if (cached && Array.isArray(cached)) {
          const active = cached.find(h => h.statut === 'actif' && typeof h.lat === 'number' && typeof h.lng === 'number')
          if (active) { setHub(active); return }
        }
      } catch { /* noop */ }
      setHub(null)
    }
    load()
  }, [])

  const center = useMemo(() => hub ? [hub.lat, hub.lng] : DEFAULT_CENTER, [hub])

  const hubIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="background:#E8433D;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:18px">home</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }), [])

  const route = useMemo(() => hub
    ? [[hub.lat, hub.lng], ...mockMissionStops.map(s => [s.lat, s.lng]), [hub.lat, hub.lng]]
    : mockMissionStops.map(s => [s.lat, s.lng]),
  [hub])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Ma tournée</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Itinéraire optimisé de votre tournée du jour.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm" style={{ height: '400px' }}>
        <MapView center={center} zoom={14} style={{ height: '100%', width: '100%' }} routePoints={route}>
          {hub && (
            <Marker position={[hub.lat, hub.lng]} icon={hubIcon}>
              <Popup><strong>Départ : {hub.nom}</strong><br/>{hub.adresse}</Popup>
            </Marker>
          )}

          {mockMissionStops.map((stop, i) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={makeIcon(statusColors[stop.status], String(i + 1))}>
              <Popup>
                <div>
                  <strong>Stop {stop.order} : {stop.nom}</strong><br/>
                  <span style={{ color: statusColors[stop.status], fontWeight: 'bold' }}>{statusLabels[stop.status]}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {route.length > 1 && (
            <Polyline
              positions={route}
              pathOptions={{ color: '#2563EB', weight: 4, smoothFactor: 1 }}
            />
          )}
        </MapView>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#E8433D' }} />
          <span className="font-label-md text-label-md">Départ (Hub)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#2563EB' }} />
          <span className="font-label-md text-label-md">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#F97316' }} />
          <span className="font-label-md text-label-md">À venir</span>
        </div>
      </div>

      <div className="space-y-2">
        {mockMissionStops.map((stop, i) => (
          <div key={stop.id} className={`flex items-center gap-4 p-3 rounded-xl border ${stop.status === 'en_cours' ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-on-primary text-sm ${stop.status === 'en_cours' ? 'bg-primary' : 'bg-tertiary'}`}>
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-label-md text-label-md font-bold">{stop.nom}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</p>
            </div>
            <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm font-bold ${stop.status === 'en_cours' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {statusLabels[stop.status]}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-outline-variant text-on-surface rounded-2xl p-4 shadow-sm flex justify-around items-center">
        <div className="text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Stops</p>
          <p className="font-headline-md text-headline-md font-bold">{mockMissionStops.length}</p>
        </div>
        <div className="text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Distance</p>
          <p className="font-headline-md text-headline-md font-bold">18.4 km</p>
        </div>
        <div className="text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Durée est.</p>
          <p className="font-headline-md text-headline-md font-bold">1h05</p>
        </div>
      </div>
    </div>
  )
}

export default CarteMissionsPage
