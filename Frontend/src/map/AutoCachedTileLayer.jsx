import { useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { getTile, touchTile, trim } from './mapCache'
import { useOffline } from '../hooks/useOffline'

const LRU_SIZE = 200
const TRIM_INTERVAL = 60_000

function createOnlineTileLayer(url, attribution) {
  const lru = new Map()
  let lastTrim = Date.now()

  function backgroundCache(coords, blob) {
    const key = `${coords.z}/${coords.x}/${coords.y}`
    lru.set(key, blob)
    if (lru.size > LRU_SIZE) {
      const first = lru.keys().next().value
      lru.delete(first)
    }
    if (Date.now() - lastTrim > TRIM_INTERVAL) {
      lastTrim = Date.now()
      trim('tiles')
    }
  }

  const layer = new L.TileLayer(url, {
    attribution,
    crossOrigin: 'anonymous',
    maxZoom: 19,
    keepBuffer: 4,
    updateWhenIdle: true,
  })

  layer.on('tileload', (e) => {
    const coords = e.coords
    const tileUrl = layer.getTileUrl(coords)
    const doCache = () => {
      fetch(tileUrl)
        .then(r => r.ok ? r.blob() : null)
        .then(blob => { if (blob) backgroundCache(coords, blob) })
        .catch(() => {})
    }
    if ('requestIdleCallback' in window) {
      requestIdleCallback(doCache, { timeout: 5000 })
    } else {
      setTimeout(doCache, 0)
    }
  })

  return layer
}

function createOfflineTileLayer(url, attribution) {
  const layer = new L.TileLayer(url, {
    attribution,
    crossOrigin: 'anonymous',
    maxZoom: 19,
    keepBuffer: 4,
    updateWhenIdle: true,
  })

  layer.createTile = function (coords, done) {
    const tile = document.createElement('img')
    tile.alt = ''
    tile.crossOrigin = 'anonymous'

    getTile(coords.z, coords.x, coords.y).then((cached) => {
      if (cached) {
        const objUrl = URL.createObjectURL(cached)
        tile.onload = () => { URL.revokeObjectURL(objUrl); done(null, tile) }
        tile.onerror = () => { URL.revokeObjectURL(objUrl); done(new Error('Tile render failed'), tile) }
        tile.src = objUrl
        touchTile(coords.z, coords.x, coords.y)
        return
      }
      const tileUrl = layer.getTileUrl(coords)
      tile.src = tileUrl
      tile.onload = () => done(null, tile)
      tile.onerror = () => done(new Error('Tile load failed offline'), tile)
    })

    return tile
  }

  return layer
}

function AutoCachedTileLayer({ url, attribution }) {
  const map = useMap()
  const online = useOffline()
  const layerRef = useRef(null)

  useEffect(() => {
    const layer = online
      ? createOnlineTileLayer(url, attribution)
      : createOfflineTileLayer(url, attribution)

    layer.addTo(map)
    layerRef.current = layer

    return () => {
      map.removeLayer(layer)
      layerRef.current = null
    }
  }, [map, url, attribution, online])

  return null
}

export default AutoCachedTileLayer
