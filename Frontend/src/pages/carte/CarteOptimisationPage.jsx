import { useState, useEffect, useMemo } from 'react'
import { Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../../map/MapView'
import { getMeta } from '../../map/mapCache'

const HUB_KEY = 'madalogistix_hubs'
const DEFAULT_CENTER = [-18.914, 47.541]

const mockStops = [
  { id: 1, nom: 'Antananarivo Centre', lat: -18.913, lng: 47.516, client: 'Telma Madagascar', statut: 'livree' },
  { id: 2, nom: 'Ankorondrano', lat: -18.914, lng: 47.541, client: 'Jovenna', statut: 'en_cours' },
  { id: 3, nom: 'Analakely', lat: -18.920, lng: 47.517, client: 'Pharmacie Centrale', statut: 'a_venir' },
  { id: 4, nom: 'Ivandry', lat: -18.900, lng: 47.525, client: 'Supermaki', statut: 'a_venir' },
  { id: 5, nom: 'Ambohijatovo', lat: -18.927, lng: 47.523, client: 'Dépôt Logistique', statut: 'a_venir' },
]

const statutColors = {
  livree: '#16A34A',
  en_cours: '#2563EB',
  a_venir: '#F97316',
}

const statutLabels = {
  livree: 'Livrée',
  en_cours: 'En cours',
  a_venir: 'À venir',
}

function CarteOptimisationPage() {
  const [hubs, setHubs] = useState([])
  const [stops] = useState(mockStops)

  const makeIcon = useMemo(() => {
    const cache = {}
    return (color) => {
      if (!cache[color]) {
        cache[color] = L.divIcon({
          className: '',
          html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14],
        })
      }
      return cache[color]
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const stored = localStorage.getItem(HUB_KEY)
        if (stored) { setHubs(JSON.parse(stored)); return }
      } catch { /* fallback */ }
      try {
        const cached = await getMeta('hubs_list')
        if (cached) { setHubs(cached); return }
      } catch { /* noop */ }
      setHubs([])
    }
    load()
  }, [])

  const activeHubs = useMemo(() => hubs.filter(h => h.statut === 'actif' && typeof h.lat === 'number' && typeof h.lng === 'number'), [hubs])
  const center = useMemo(() => activeHubs.length > 0 ? [activeHubs[0].lat, activeHubs[0].lng] : DEFAULT_CENTER, [activeHubs])

  const hubIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="background:#E8433D;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:20px">warehouse</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  }), [])

  const route1 = useMemo(() => activeHubs.length > 0
    ? [[activeHubs[0].lat, activeHubs[0].lng], ...stops.slice(0, 3).map(s => [s.lat, s.lng]), [activeHubs[0].lat, activeHubs[0].lng]]
    : [],
  [activeHubs, stops])

  const route2 = useMemo(() => activeHubs.length > 0
    ? [[activeHubs[0].lat, activeHubs[0].lng], ...stops.slice(3).map(s => [s.lat, s.lng]), [activeHubs[0].lat, activeHubs[0].lng]]
    : [],
  [activeHubs, stops])

  const allRoutePoints = useMemo(() => [...route1, ...route2], [route1, route2])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Carte d'Optimisation</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Visualisation des tournées VRP et des points de livraison.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm" style={{ height: '500px' }}>
        <MapView center={center} zoom={13} style={{ height: '100%', width: '100%' }} routePoints={allRoutePoints}>
          {activeHubs.map((hub) => (
            <Marker key={hub.id} position={[hub.lat, hub.lng]} icon={hubIcon}>
              <Popup><strong>{hub.nom}</strong><br/>{hub.adresse}</Popup>
            </Marker>
          ))}

          {stops.map((stop) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={makeIcon(statutColors[stop.statut])}>
              <Popup>
                <div>
                  <strong>{stop.client}</strong><br/>
                  {stop.nom}<br/>
                  <span style={{ color: statutColors[stop.statut], fontWeight: 'bold' }}>{statutLabels[stop.statut]}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {route1.length > 0 && <Polyline positions={route1} pathOptions={{ color: '#2563EB', weight: 4, dashArray: '8 8', smoothFactor: 1 }} />}
          {route2.length > 0 && <Polyline positions={route2} pathOptions={{ color: '#F97316', weight: 4, dashArray: '8 8', smoothFactor: 1 }} />}
        </MapView>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#E8433D' }} />
          <span className="font-label-md text-label-md">Hub</span>
        </div>
        {Object.entries(statutColors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: color }} />
            <span className="font-label-md text-label-md">{statutLabels[key]}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 rounded" style={{ background: '#2563EB', borderStyle: 'dashed' }} />
          <span className="font-label-md text-label-md">Tournée 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 rounded" style={{ background: '#F97316', borderStyle: 'dashed' }} />
          <span className="font-label-md text-label-md">Tournée 2</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h4 className="font-label-md text-label-md font-bold mb-2">Tournée 1 (T-01)</h4>
          <div className="space-y-1">
            {stops.slice(0, 3).map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                <span className="font-label-md text-label-md">{s.client}</span>
                <span className="text-on-surface-variant">— {s.nom}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h4 className="font-label-md text-label-md font-bold mb-2">Tournée 2 (T-02)</h4>
          <div className="space-y-1">
            {stops.slice(3).map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                <span className="font-label-md text-label-md">{s.client}</span>
                <span className="text-on-surface-variant">— {s.nom}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CarteOptimisationPage
