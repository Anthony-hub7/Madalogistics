import { useEffect, useRef, useCallback } from 'react'

const DEBOUNCE_MS = 1500

export function useMapPrefetch(map, routePoints = []) {
  const mapRef = useRef(map)
  mapRef.current = map

  useEffect(() => {
    if (!map) return
    // Leaflet loads tiles natively via <img> — no fetch() needed.
    // Prefetch disabled: OSM tile.openstreetmap.org has no CORS headers,
    // and fetch() calls trigger ERR_FAILED / blocked by CORS policy.
    return () => {}
  }, [map])
}

export function manualPrefetch() {
  return Promise.resolve()
}
