import { apiClient } from './apiClient'
import { getRoute, putRoute, getGeo, putGeo, hashGeo } from '../map/mapCache'

async function cacheFirstApi(storeGetter, storeSetter, fetcher) {
  const cached = await storeGetter()
  if (cached) return cached

  if (!navigator.onLine) return null

  try {
    const data = await fetcher()
    if (data != null) await storeSetter(data)
    return data
  } catch {
    return null
  }
}

export const mapsService = {
  async geocode(query, limit = 5, lat = null, lon = null) {
    const key = hashGeo(query, lat, lon)
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (lat != null && lon != null) {
      params.set('lat', String(lat))
      params.set('lon', String(lon))
    }
    return cacheFirstApi(
      () => getGeo(key),
      (data) => putGeo(key, data),
      () => apiClient.get(`/maps/geocode?${params.toString()}`)
    )
  },

  async reverse(lat, lon) {
    const key = hashGeo('reverse', lat, lon)
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
    return cacheFirstApi(
      () => getGeo(key),
      (data) => putGeo(key, data),
      () => apiClient.get(`/maps/reverse?${params.toString()}`)
    )
  },

  async route(points, profile = 'driving') {
    return cacheFirstApi(
      () => getRoute(points, profile),
      (data) => putRoute(points, profile, data),
      () => apiClient.post('/maps/route', { points, profile })
    )
  },

  async distanceMatrix(points, profile = 'driving') {
    const cacheKey = `dm:${JSON.stringify(points)}:${profile}`
    return cacheFirstApi(
      () => getGeo(cacheKey),
      (data) => putGeo(cacheKey, data),
      () => apiClient.post('/maps/distance-matrix', { points, profile })
    )
  },

  async getTrace(tourneeId) {
    return apiClient.get(`/tournees/${tourneeId}/trace`)
  },
}
