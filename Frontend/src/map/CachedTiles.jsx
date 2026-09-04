import { useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import { getCachedTile, cacheTile, trimCache } from './tileCache'

function CachedTiles({ url, attribution }) {
  const map = useMap()

  useEffect(() => {
    const layer = new L.TileLayer(url, {
      attribution,
      crossOrigin: 'anonymous',
      maxZoom: 19,
    })

    const originalCreateTile = layer.createTile.bind(layer)
    layer.createTile = function (coords, done) {
      const tile = document.createElement('img')
      const tileUrl = this.getTileUrl(coords)
      tile.alt = ''
      tile.crossOrigin = 'anonymous'

      getCachedTile(tileUrl).then((cached) => {
        if (cached) {
          tile.src = URL.createObjectURL(cached)
          done(null, tile)
          return
        }

        fetch(tileUrl)
          .then((res) => {
            if (!res.ok) throw new Error('Tile fetch failed')
            return res.blob()
          })
          .then((blob) => {
            cacheTile(tileUrl, blob)
            trimCache()
            tile.src = URL.createObjectURL(blob)
            done(null, tile)
          })
          .catch(() => {
            tile.src = tileUrl
            tile.onload = () => done(null, tile)
            tile.onerror = () => done(new Error('Tile load failed'), tile)
          })
      })

      return tile
    }

    layer.addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [map, url, attribution])

  return null
}

export default CachedTiles
