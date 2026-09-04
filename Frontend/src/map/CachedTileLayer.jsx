import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getCachedTile, cacheTile, trimCache } from './tileCache'

class CachedTileLayer extends L.TileLayer {
  createTile(coords, done) {
    const tile = document.createElement('img')
    const url = this.getTileUrl(coords)

    tile.crossOrigin = 'anonymous'
    tile.alt = ''

    getCachedTile(url).then((cached) => {
      if (cached) {
        tile.src = URL.createObjectURL(cached)
        done(null, tile)
        return
      }

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Tile fetch failed')
          return res.blob()
        })
        .then((blob) => {
          cacheTile(url, blob)
          trimCache()
          tile.src = URL.createObjectURL(blob)
          done(null, tile)
        })
        .catch(() => {
          tile.src = url
          tile.onload = () => done(null, tile)
          tile.onerror = () => done(new Error('Tile load failed'), tile)
        })
    })

    return tile
  }
}

export function CachedTileLayerJS(url, options) {
  return new CachedTileLayer(url, options)
}

export default CachedTileLayer
