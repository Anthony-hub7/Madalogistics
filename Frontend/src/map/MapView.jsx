import { MapContainer, useMap } from 'react-leaflet'
import { useEffect, useRef, useState, Suspense } from 'react'
import 'leaflet/dist/leaflet.css'
import { MAPS_CONFIG } from '../config/maps'
import AutoCachedTileLayer from './AutoCachedTileLayer'
import OfflineBadge from '../components/OfflineBadge'
import { useMapPrefetch } from './useMapPrefetch'

function ChangeView({ center, zoom }) {
  const map = useMap()
  const prevRef = useRef({ lat: center[0], lng: center[1], zoom })
  useEffect(() => {
    const prev = prevRef.current
    const latDist = Math.abs(prev.lat - center[0])
    const lngDist = Math.abs(prev.lng - center[1])
    const zoomChanged = prev.zoom !== zoom
    if (latDist < 1e-6 && lngDist < 1e-6 && !zoomChanged) return
    map.setView(center, zoom, { animate: false })
    prevRef.current = { lat: center[0], lng: center[1], zoom }
  }, [map, center, zoom])
  useEffect(() => {
    const container = map.getContainer()
    if (!container) return
    const ro = new ResizeObserver(() => { map.invalidateSize() })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
}

function MapPrefetcher({ routePoints }) {
  const map = useMap()
  useMapPrefetch(map, routePoints)
  return null
}

const MAP_OPTIONS = {
  preferCanvas: true,
  zoomControl: true,
  attributionControl: true,
  updateWhenIdle: true,
  keepBuffer: 4,
}

function MapViewInner({ center, zoom = 13, style, children, routePoints = [] }) {
  const resolvedStyle = style || { height: '400px', width: '100%' }
  const [ready, setReady] = useState(false)
  return (
    <div className="relative h-full w-full z-0">
      <OfflineBadge />
      <MapContainer center={center} zoom={zoom} style={resolvedStyle} {...MAP_OPTIONS} whenReady={() => setReady(true)}>
        <ChangeView center={center} zoom={zoom} />
        <AutoCachedTileLayer
          attribution={MAPS_CONFIG.attribution}
          url={MAPS_CONFIG.tileUrl}
        />
        {ready && <MapPrefetcher routePoints={routePoints} />}
        {children}
      </MapContainer>
    </div>
  )
}

function MapSkeleton({ style }) {
  return (
    <div className="relative h-full w-full z-0 rounded-xl overflow-hidden bg-surface-container-high flex items-center justify-center" style={style}>
      <span className="material-symbols-outlined text-4xl animate-spin text-outline">progress_activity</span>
    </div>
  )
}

function MapView({ center, zoom = 13, style, children, routePoints = [] }) {
  const resolvedStyle = style || { height: '400px', width: '100%' }
  return (
    <Suspense fallback={<MapSkeleton style={resolvedStyle} />}>
      <MapViewInner center={center} zoom={zoom} style={style} routePoints={routePoints}>
        {children}
      </MapViewInner>
    </Suspense>
  )
}

export default MapView
