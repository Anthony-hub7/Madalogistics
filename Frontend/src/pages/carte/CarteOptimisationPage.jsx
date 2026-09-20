import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../../map/MapView'
import { mapsService } from '../../services/mapsService'
import { tourneesService } from '../../services/tourneesService'

const DEFAULT_CENTER = [-18.914, 47.541]

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

const traceColors = {
  collecte: '#16A34A',
  aller: '#DC2626',
  retour: '#F97316',
}

const traceLabels = {
  collecte: 'Collecte',
  aller: 'Aller',
  retour: 'Retour',
}

function FitBounds({ bounds }) {
  const map = useMap()
  const prevRef = useRef(null)
  useEffect(() => {
    if (!bounds || bounds.length < 2) return
    const key = bounds.flat().join(',')
    if (prevRef.current === key) return
    prevRef.current = key
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false })
  }, [map, bounds])
  return null
}

function CarteOptimisationPage() {
  const [searchParams] = useSearchParams()
  const focusTourneeId = searchParams.get('tourneeId')
  const embed = searchParams.get('embed') === '1'

  const [tournees, setTournees] = useState([])
  const [traces, setTraces] = useState({})
  const [selectedTournee, setSelectedTournee] = useState(null)
  const [collecteStops, setCollecteStops] = useState([])

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

  const hubIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="background:#E8433D;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:20px">warehouse</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  }), [])

  const collecteIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="background:#16A34A;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:16px">inventory_2</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  }), [])

  useEffect(() => {
    async function loadTournees() {
      try {
        const data = await tourneesService.getAll()
        if (Array.isArray(data)) setTournees(data)
      } catch { /* noop */ }
    }
    loadTournees()
  }, [])

  const loadTrace = async (tourneeId) => {
    if (traces[tourneeId]) {
      setSelectedTournee(selectedTournee === tourneeId ? null : tourneeId)
      return
    }
    try {
      const data = await mapsService.getTrace(tourneeId)
      setTraces(prev => ({ ...prev, [tourneeId]: data }))
      setSelectedTournee(tourneeId)

      // Extraire les stops de collecte depuis les données tournees
      const tournee = tournees.find(t => t.tournee_id === tourneeId)
      if (tournee && tournee.etapes) {
        const seen = new Set()
        const stops = []
        tournee.etapes.forEach((e, ei) => {
          if (e.collecte_latitude != null && e.collecte_longitude != null) {
            const key = `${e.collecte_latitude}-${e.collecte_longitude}`
            if (!seen.has(key)) {
              seen.add(key)
              stops.push({
                id: `collecte-${tourneeId}-${ei}`,
                lat: e.collecte_latitude,
                lng: e.collecte_longitude,
                client: `Collecte — Colis ${(e.colis_id || '').slice(0,8)}`,
                address: e.adresse_collecte || '',
                tourneeId,
              })
            }
          }
        })
        setCollecteStops(stops)
      }
    } catch { /* noop */ }
  }

  // Auto-focus on tourneeId from URL
  useEffect(() => {
    if (!focusTourneeId) return
    if (tournees.length === 0) return
    const found = tournees.find(t => t.tournee_id === focusTourneeId)
    if (found) loadTrace(focusTourneeId)
  }, [focusTourneeId, tournees])

  // Auto-load trace when only 1 tournee and no focus
  useEffect(() => {
    if (focusTourneeId) return
    if (tournees.length !== 1) return
    const t = tournees[0]
    if (!traces[t.tournee_id]) loadTrace(t.tournee_id)
  }, [tournees])

  const allStops = useMemo(() => {
    const stops = []
    const tourneesToUse = focusTourneeId
      ? tournees.filter(t => t.tournee_id === focusTourneeId)
      : tournees

    tourneesToUse.forEach((t) => {
      if (t.etapes) {
        t.etapes.forEach((e, ei) => {
          if (e.latitude != null && e.longitude != null) {
            stops.push({
              id: `${t.tournee_id}-${ei}`,
              lat: e.latitude,
              lng: e.longitude,
              client: e.colis_id ? `Colis ${e.colis_id.slice(0,8)}` : `Étape ${ei+1}`,
              statut: ei === 0 ? 'en_cours' : 'a_venir',
              tourneeId: t.tournee_id,
              type_etape: e.type_etape,
            })
          }
        })
      }
    })
    return stops
  }, [tournees, focusTourneeId])

  // Hubs from tournées API (each tournée has t.hub)
  const hubsFromTournees = useMemo(() => {
    const seen = new Set()
    const hubs = []
    const tourneesToUse = focusTourneeId
      ? tournees.filter(t => t.tournee_id === focusTourneeId)
      : tournees

    tourneesToUse.forEach(t => {
      if (t.hub && t.hub.latitude != null && t.hub.longitude != null) {
        const key = `${t.hub.latitude}-${t.hub.longitude}`
        if (!seen.has(key)) {
          seen.add(key)
          hubs.push({ ...t.hub, tourneeId: t.tournee_id })
        }
      }
    })
    return hubs
  }, [tournees, focusTourneeId])

  const fitBounds = useMemo(() => {
    const pts = []
    hubsFromTournees.forEach(h => pts.push([h.latitude, h.longitude]))
    allStops.forEach(s => pts.push([s.lat, s.lng]))
    collecteStops.forEach(s => pts.push([s.lat, s.lng]))
    return pts.length >= 2 ? pts : null
  }, [hubsFromTournees, allStops, collecteStops])

  const filteredTournees = focusTourneeId
    ? tournees.filter(t => t.tournee_id === focusTourneeId)
    : tournees

  const parseTraceCoords = (segment) => {
    if (!segment) return []
    const geoJson = segment.raw ? JSON.parse(segment.raw) : segment
    if (!geoJson || !geoJson.routes || !geoJson.routes[0]) return []
    const geom = geoJson.routes[0].geometry
    if (!geom || !geom.coordinates) return []
    return geom.coordinates.map(c => [c[1], c[0]])
  }

  const traceSegments = useMemo(() => {
    if (!selectedTournee || !traces[selectedTournee]) return {}
    const data = traces[selectedTournee]
    return {
      collecte: parseTraceCoords(data.collecte),
      aller: parseTraceCoords(data.aller),
      retour: parseTraceCoords(data.retour),
    }
  }, [selectedTournee, traces])

  return (
    <div className={embed ? '' : 'space-y-4'}>
      {!embed && (
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Carte d'Optimisation</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Visualisation des tournées VRP et des points de livraison.
          </p>
        </div>
      )}

      <div className={`rounded-xl overflow-hidden border border-outline-variant shadow-sm ${embed ? '' : ''}`} style={{ height: embed ? '100%' : '500px' }}>
        <MapView center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          {fitBounds && <FitBounds bounds={fitBounds} />}

          {hubsFromTournees.map((h, i) => (
            <Marker key={`hub-${i}`} position={[h.latitude, h.longitude]} icon={hubIcon}>
              <Popup><strong>{h.nom || 'Hub'}</strong></Popup>
            </Marker>
          ))}

          {collecteStops.map((stop) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={collecteIcon}>
              <Popup>
                <div>
                  <strong>{stop.client}</strong><br/>
                  {stop.address && <span style={{ fontSize: '12px', color: '#666' }}>{stop.address}</span>}
                </div>
              </Popup>
            </Marker>
          ))}

          {allStops.map((stop) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={makeIcon(statutColors[stop.statut])}>
              <Popup>
                <div>
                  <strong>{stop.client}</strong><br/>
                  <span style={{ color: '#F97316', fontWeight: 'bold' }}>{stop.type_etape || 'LIVRAISON'}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {traceSegments.collecte && traceSegments.collecte.length > 0 && (
            <Polyline positions={traceSegments.collecte} pathOptions={{ color: traceColors.collecte, weight: 4, smoothFactor: 1 }} />
          )}
          {traceSegments.aller && traceSegments.aller.length > 0 && (
            <Polyline positions={traceSegments.aller} pathOptions={{ color: traceColors.aller, weight: 4, smoothFactor: 1 }} />
          )}
          {traceSegments.retour && traceSegments.retour.length > 0 && (
            <Polyline positions={traceSegments.retour} pathOptions={{ color: traceColors.retour, weight: 4, smoothFactor: 1, dashArray: '8 4' }} />
          )}
        </MapView>
      </div>

      {!embed && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: '#E8433D' }} />
            <span className="font-label-md text-label-md">Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: '#16A34A' }} />
            <span className="font-label-md text-label-md">Collecte</span>
          </div>
          {Object.entries(statutColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: color }} />
              <span className="font-label-md text-label-md">{statutLabels[key]}</span>
            </div>
          ))}
          {Object.entries(traceColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              {key === 'retour'
                ? <div className="w-8 h-0 border-t-2 border-dashed" style={{ borderColor: color }} />
                : <div className="w-8 h-1 rounded" style={{ background: color }} />
              }
              <span className="font-label-md text-label-md">{traceLabels[key]}</span>
            </div>
          ))}
        </div>
      )}

      {!embed && filteredTournees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTournees.map((t, i) => (
            <div key={t.tournee_id || i}
                 className={`rounded-xl border bg-surface-container-lowest p-4 cursor-pointer transition-all ${selectedTournee === t.tournee_id ? 'border-primary shadow-md' : 'border-outline-variant'}`}
                 onClick={() => loadTrace(t.tournee_id)}>
              <h4 className="font-label-md text-label-md font-bold mb-2">
                Tournée {(t.tournee_id || '').slice(0,8) || `T-${i+1}`}
                {t.hub && <span className="ml-2 text-xs text-on-surface-variant font-normal">Hub: {t.hub.nom}</span>}
                <span className="ml-2 text-xs text-on-surface-variant font-normal">{t.statut}</span>
              </h4>
              <div className="space-y-1">
                {(t.etapes || []).map((e, ei) => (
                  <div key={ei} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold">{e.ordre || ei+1}</span>
                    <span className="font-label-md text-label-md">{e.type_etape || 'LIVRAISON'}</span>
                    <span className="text-on-surface-variant">— {(e.colis_id || '').slice(0,8)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!embed && filteredTournees.length === 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">route</span>
          <p className="text-on-surface-variant">Aucune tournée trouvée. Lancez un VRP depuis la page d'optimisation.</p>
        </div>
      )}
    </div>
  )
}

export default CarteOptimisationPage
