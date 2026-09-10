import { useEffect, useRef, useCallback } from 'react'
import { putTile, getTile } from './mapCache'

const TILE_URL = 'https://tile.openstreetmap.org'
const DEBOUNCE_MS = 800
const MAX_TILES_PREFETCH = 32
const MAX_TILES_MANUAL = 200

function tileBBox(bounds, zoom) {
  const tiles = []
  const scale = Math.pow(2, zoom)
  const latToY = (lat) => {
    const latRad = lat * Math.PI / 180
    return Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale)
  }
  const xMin = Math.floor(((bounds.west + 180) / 360) * scale)
  const xMax = Math.floor(((bounds.east + 180) / 360) * scale)
  const yMin = latToY(bounds.north)
  const yMax = latToY(bounds.south)
  for (let x = Math.max(0, xMin); x <= Math.min(scale - 1, xMax); x++) {
    for (let y = Math.max(0, Math.min(yMin, yMax)); y <= Math.max(yMin, yMax); y++) {
      tiles.push({ z: zoom, x, y })
    }
  }
  return tiles
}

export function useMapPrefetch(map, routePoints = []) {
  const abortRef = useRef(null)
  const timerRef = useRef(null)
  const routePointsRef = useRef(routePoints)

  useEffect(() => {
    routePointsRef.current = routePoints
  }, [routePoints])

  const doPrefetch = useCallback(() => {
    if (!map || !navigator.onLine) return

    if (abortRef.current) abortRef.current.abort()
    if (timerRef.current) clearTimeout(timerRef.current)

    const controller = new AbortController()
    abortRef.current = controller

    timerRef.current = setTimeout(() => {
      const zoom = map.getZoom()
      const bounds = map.getBounds()
      const b = {
        west: bounds.getWest(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        south: bounds.getSouth(),
      }

      const saveData = navigator.connection?.saveData
      const zooms = saveData ? [zoom] : [zoom]

      let count = 0
      const abort = controller.signal

      const fetchTile = (t) => {
        if (abort.aborted || count >= MAX_TILES_PREFETCH) return
        const key = `${t.z}/${t.x}/${t.y}`
        getTile(t.z, t.x, t.y).then(cached => {
          if (cached || abort.aborted || count >= MAX_TILES_PREFETCH) return
          count++
          fetch(`${TILE_URL}/${key}.png`, { signal: abort })
            .then(r => r.ok ? r.blob() : null)
            .then(blob => { if (blob && !abort.aborted) putTile(t.z, t.x, t.y, blob) })
            .catch(() => {})
        })
      }

      for (const z of zooms) {
        const tiles = tileBBox(b, z)
        for (const t of tiles) fetchTile(t)
      }
    }, DEBOUNCE_MS)
  }, [map])

  useEffect(() => {
    if (!map) return
    map.on('zoomend moveend', doPrefetch)
    doPrefetch()
    return () => {
      map.off('zoomend moveend', doPrefetch)
      if (abortRef.current) abortRef.current.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [map, doPrefetch])
}

export function manualPrefetch(map, onProgress) {
  if (!map || !navigator.onLine) return Promise.resolve()

  const zoom = map.getZoom()
  const bounds = map.getBounds()
  const b = {
    west: bounds.getWest(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
    south: bounds.getSouth(),
  }

  const zooms = [zoom - 1, zoom, zoom + 1].filter(z => z >= 5 && z <= 19)
  const allTiles = []
  for (const z of zooms) {
    allTiles.push(...tileBBox(b, z))
  }

  const tiles = allTiles.slice(0, MAX_TILES_MANUAL)
  let done = 0
  const total = tiles.length
  const controller = new AbortController()

  const fetchOne = (t) => {
    const key = `${t.z}/${t.x}/${t.y}`
    return getTile(t.z, t.x, t.y).then(cached => {
      if (cached) { done++; onProgress?.(done, total); return }
      return fetch(`${TILE_URL}/${key}.png`, { signal: controller.signal })
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (blob) putTile(t.z, t.x, t.y, blob)
          done++
          onProgress?.(done, total)
        })
        .catch(() => { done++; onProgress?.(done, total) })
    })
  }

  const batches = []
  for (let i = 0; i < tiles.length; i += 6) {
    batches.push(tiles.slice(i, i + 6))
  }

  let p = Promise.resolve()
  for (const batch of batches) {
    p = p.then(() => Promise.all(batch.map(fetchOne)))
  }

  return p.then(() => controller)
}
