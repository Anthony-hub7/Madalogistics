import { Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../../map/MapView'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { missionsService } from '../../services/missionsService'

const DEFAULT_CENTER = [-18.914, 47.541]

// Memes couleurs que la carte gestionnaire (CarteOptimisationPage)
const traceColors = {
  aller: '#DC2626',
  retour: '#F97316',
}

const traceLabels = {
  aller: 'Aller',
  retour: 'Retour',
}

const TRACE_KEYS = ['aller', 'retour']
const VISIBLE_TRACES_KEY = 'carte-missions-traces'

const statusColors = {
  en_cours: '#2563EB',
  a_venir: '#F97316',
  terminee: '#16A34A',
}

const statusLabels = {
  en_cours: 'En cours',
  a_venir: 'À venir',
  terminee: 'Terminée',
}

function readVisibleTraces() {
  try {
    const raw = localStorage.getItem(VISIBLE_TRACES_KEY)
    if (raw) return { aller: true, retour: true, ...JSON.parse(raw) }
  } catch { /* noop */ }
  return { aller: true, retour: true }
}

function TraceToggles({ visible, onToggle, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {TRACE_KEYS.map((key) => {
        const color = traceColors[key]
        const on = !!visible[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={on}
            title={`${on ? 'Masquer' : 'Afficher'} : ${traceLabels[key]}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-label-md text-label-md transition-all cursor-pointer ${
              on
                ? 'border-outline-variant bg-surface-container-lowest text-on-surface shadow-sm'
                : 'border-dashed border-outline bg-surface-container-low text-on-surface-variant opacity-70'
            }`}
          >
            {key === 'retour'
              ? <span className="w-8 h-0 border-t-2 border-dashed" style={{ borderColor: color, opacity: on ? 1 : 0.4 }} />
              : <span className="w-8 h-1 rounded" style={{ background: color, opacity: on ? 1 : 0.4 }} />}
            <span style={{ textDecoration: on ? 'none' : 'line-through' }}>{traceLabels[key]}</span>
          </button>
        )
      })}
    </div>
  )
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

// Parse le GeoJSON OSRM brut (meme logique que CarteOptimisationPage)
// routes[0].geometry.coordinates sont en [lng,lat] → convertis en [lat,lng]
function parseTraceCoords(segment) {
  if (!segment) return []
  try {
    const geoJson = segment.raw ? JSON.parse(segment.raw) : segment
    if (!geoJson || !geoJson.routes || !geoJson.routes[0]) return []
    const geom = geoJson.routes[0].geometry
    if (!geom || !geom.coordinates) return []
    return geom.coordinates.map(c => [c[1], c[0]])
  } catch {
    return []
  }
}

function CarteMissionsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [mission, setMission] = useState(null)
  const [trace, setTrace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visibleTraces, setVisibleTraces] = useState(readVisibleTraces)

  const sacId = searchParams.get('sacId')

  useEffect(() => {
    try {
      localStorage.setItem(VISIBLE_TRACES_KEY, JSON.stringify(visibleTraces))
    } catch { /* noop */ }
  }, [visibleTraces])

  const toggleTrace = (key) => {
    setVisibleTraces(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const fetchData = useCallback(async ({ silencieux = false } = {}) => {
    if (!silencieux) {
      setLoading(true)
      setError(null)
    }

    try {
      let currentMission = null

      if (sacId) {
        currentMission = await missionsService.detail(sacId)
      } else {
        const missions = await missionsService.lister()
        const enCours = missions.find(m => m.statut === 'EN_TRANSIT')
        if (enCours) {
          currentMission = enCours
        } else {
          if (silencieux) return
          setError('Aucune mission en cours')
          setLoading(false)
          return
        }
      }

      setMission(currentMission)

      try {
        const traceData = await missionsService.trace(currentMission.sacId)
        setTrace(traceData)
      } catch {
        setTrace(null)
      }
    } catch (err) {
      // En arriere-plan, on conserve l'affichage courant
      if (silencieux) return
      console.error('Erreur chargement mission:', err)
      setError('Impossible de charger la mission')
    } finally {
      if (!silencieux) setLoading(false)
    }
  }, [sacId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Rafraichit apres validation d'une livraison (retour d'onglet) + suivi live
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData({ silencieux: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData({ silencieux: true })
    }, 30000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [fetchData])

  const hubIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="background:#E8433D;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="color:white;font-size:18px">home</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }), [])

  // Geometries routieres OSRM (comme la carte gestionnaire)
  const traceSegments = useMemo(() => {
    if (!trace) return { aller: [], retour: [] }
    return {
      aller: parseTraceCoords(trace.aller),
      retour: parseTraceCoords(trace.retour),
    }
  }, [trace])

  // Fallback ligne droite si OSRM indisponible (hub → etapes → hub)
  const fallbackRoute = useMemo(() => {
    if (traceSegments.aller.length > 0 || traceSegments.retour.length > 0) return []
    if (!trace?.hub?.lat) return []
    const pts = [[trace.hub.lat, trace.hub.lng]]
    ;(trace.etapes || []).forEach(e => {
      if (e.lat != null && e.lng != null) pts.push([e.lat, e.lng])
    })
    pts.push([trace.hub.lat, trace.hub.lng])
    return pts.length > 2 ? pts : []
  }, [trace, traceSegments])

  // Etat reel : la courante est la 1re étape non terminee (pas l'index 0)
  const premiereNonTerminee = useMemo(() => {
    const etapes = trace?.etapes || []
    return etapes.findIndex(e => !e.terminee)
  }, [trace])

  const statutEtape = (etape, i) =>
    etape.terminee ? 'terminee' : (i === premiereNonTerminee ? 'en_cours' : 'a_venir')

  const fitBounds = useMemo(() => {
    const pts = []
    if (trace?.hub?.lat != null) pts.push([trace.hub.lat, trace.hub.lng])
    ;(trace?.etapes || []).forEach(e => {
      if (e.lat != null && e.lng != null) pts.push([e.lat, e.lng])
    })
    if (visibleTraces.aller) traceSegments.aller.forEach(p => pts.push(p))
    if (visibleTraces.retour) traceSegments.retour.forEach(p => pts.push(p))
    return pts.length >= 2 ? pts : null
  }, [trace, traceSegments, visibleTraces])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-[#E8433D]">sync</span>
        <span className="ml-3 font-body text-[#8A8A92]">Chargement de la carte...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-5xl text-[#8A8A92]">map</span>
        <p className="font-body-md text-[#8A8A92] mt-3">{error}</p>
        <button onClick={() => navigate('/driver/missions')}
          className="mt-4 px-4 py-2 rounded-lg border-2 border-[#E8433D] text-[#E8433D] font-bold">
          Retour aux missions
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Ma tournée</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Itinéraire routier de votre tournée du jour.
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-outline-variant shadow-sm" style={{ height: '400px' }}>
        <MapView center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          {fitBounds && <FitBounds bounds={fitBounds} />}

          {trace?.hub?.lat != null && (
            <Marker position={[trace.hub.lat, trace.hub.lng]} icon={hubIcon}>
              <Popup><strong>Départ : {mission.hubNom}</strong></Popup>
            </Marker>
          )}

          {trace?.etapes?.map((etape, i) => {
            if (etape.lat == null || etape.lng == null) return null
            const status = statutEtape(etape, i)
            return (
              <Marker key={etape.etapeId} position={[etape.lat, etape.lng]} icon={makeIcon(statusColors[status], String(i + 1))}>
                <Popup>
                  <div>
                    <strong>Stop {i + 1} : {etape.clientNom || 'Destinataire'}</strong><br/>
                    {etape.adresse && <><small>{etape.adresse}</small><br/></>}
                    <span style={{ color: statusColors[status], fontWeight: 'bold' }}>{statusLabels[status]}</span>
                    {etape.photoPreuvePresente && <span style={{ color: '#16A34A', marginLeft: 6 }}>✓ Photo</span>}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Trace OSRM aller (rouge) + retour (orange pointille) */}
          {visibleTraces.aller && traceSegments.aller.length > 0 && (
            <Polyline
              positions={traceSegments.aller}
              pathOptions={{ color: traceColors.aller, weight: 4, smoothFactor: 1 }}
            />
          )}
          {visibleTraces.retour && traceSegments.retour.length > 0 && (
            <Polyline
              positions={traceSegments.retour}
              pathOptions={{ color: traceColors.retour, weight: 4, smoothFactor: 1, dashArray: '8 4' }}
            />
          )}
          {(visibleTraces.aller || visibleTraces.retour) && fallbackRoute.length > 1 && (
            <Polyline
              positions={fallbackRoute}
              pathOptions={{ color: '#2563EB', weight: 3, dashArray: '6 6', smoothFactor: 1 }}
            />
          )}
        </MapView>

        <div className="absolute top-2 right-2 z-[1000] rounded-lg border border-outline-variant bg-white/95 shadow-md p-2">
          <TraceToggles visible={visibleTraces} onToggle={toggleTrace} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#E8433D' }} />
          <span className="font-label-md text-label-md">Départ (Hub)</span>
        </div>
        <TraceToggles visible={visibleTraces} onToggle={toggleTrace} />
      </div>

      {trace?.etapes && (
        <div className="space-y-2">
          {trace.etapes.map((etape, i) => {
            const status = statutEtape(etape, i)
            return (
            <div key={etape.etapeId} className={`flex items-center gap-4 p-3 rounded-xl border ${status === 'terminee' ? 'border-[#16A34A] bg-[#16A34A]/5' : status === 'en_cours' ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-on-primary text-sm ${status === 'terminee' ? 'bg-[#16A34A]' : status === 'en_cours' ? 'bg-primary' : 'bg-tertiary'}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-label-md text-label-md font-bold">{etape.clientNom || 'Destinataire'}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{etape.adresse || '—'}</p>
              </div>
              <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm font-bold ${status === 'terminee' ? 'bg-[#16A34A]/10 text-[#16A34A]' : status === 'en_cours' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {status === 'terminee' ? '✓ Livré' : statusLabels[status]}
              </span>
            </div>
            )
          })}
        </div>
      )}

      <div className="bg-surface border border-outline-variant text-on-surface rounded-2xl p-4 shadow-sm flex justify-around items-center">
        <div className="text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Stops</p>
          <p className="font-headline-md text-headline-md font-bold">{trace?.nbStops || 0}</p>
        </div>
        <div className="text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Distance</p>
          <p className="font-headline-md text-headline-md font-bold">{trace?.distanceKm ? `${trace.distanceKm} km` : '—'}</p>
        </div>
        <div className="text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Colis</p>
          <p className="font-headline-md text-headline-md font-bold">{trace?.nbColis || 0}</p>
        </div>
      </div>
    </div>
  )
}

export default CarteMissionsPage
