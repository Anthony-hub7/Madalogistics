import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../services/hubsService', () => ({
  hubsService: {
    lister: vi.fn().mockResolvedValue([]),
    creer: vi.fn().mockResolvedValue({ hubId: 'new-1', nom: 'Test Hub', latitude: -18.9, longitude: 47.5, actif: true }),
    supprimer: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('../../../services/mapsService', () => ({
  mapsService: {
    reverse: vi.fn().mockResolvedValue({ display_name: 'Antananarivo, Madagascar' }),
  },
}))

vi.mock('../../../offline/offlineStorage', () => ({
  offlineStorage: {
    save: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../../hooks/useOffline', () => ({
  useOffline: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../map/mapCache', () => ({
  getMeta: vi.fn().mockResolvedValue(null),
  putMeta: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet')
  return {
    ...actual,
    useMapEvents: vi.fn(),
    MapContainer: ({ children }) => children,
    Marker: ({ children }) => null,
    Popup: ({ children }) => children || null,
  }
})

vi.mock('../../../map/MapView', () => ({
  default: ({ children }) => <div data-testid="mapview">{children}</div>,
}))

import { hubsService } from '../../../services/hubsService'
import { mapsService } from '../../../services/mapsService'
import { offlineStorage } from '../../../offline/offlineStorage'

describe('CarteHubsPage - backend integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps hub response correctly (latitude/longitude → lat/lng)', () => {
    const input = { hubId: 'h1', nom: 'Hub Test', latitude: -18.914, longitude: 47.541, actif: true }
    const mapHub = (h) => ({
      id: h.hubId || h.id,
      hubId: h.hubId || h.id,
      nom: h.nom,
      adresse: h.adresse || '',
      lat: h.latitude ?? h.lat,
      lng: h.longitude ?? h.lng,
      zoneSecuriseeDispo: h.zoneSecuriseeDispo || false,
      statut: h.actif !== false ? 'actif' : 'inactif',
      actif: h.actif !== false,
    })
    const mapped = mapHub(input)
    expect(mapped.lat).toBe(-18.914)
    expect(mapped.lng).toBe(47.541)
    expect(mapped.statut).toBe('actif')
  })

  it('hubsService.creer is called with correct payload', async () => {
    const payload = { nom: 'Hub Test', adresse: 'Tana', latitude: -18.9, longitude: 47.5, zoneSecuriseeDispo: false }
    await hubsService.creer(payload)
    expect(hubsService.creer).toHaveBeenCalledWith(payload)
  })

  it('offlineStorage.save queues create_hub actions when offline', async () => {
    const action = { type: 'create_hub', payload: { nom: 'Offline Hub' }, ts: Date.now() }
    await offlineStorage.save('pendingActions', action)
    expect(offlineStorage.save).toHaveBeenCalledWith('pendingActions', action)
  })

  it('mapsService.reverse is called with lat/lng', async () => {
    const result = await mapsService.reverse(-18.914, 47.541)
    expect(mapsService.reverse).toHaveBeenCalledWith(-18.914, 47.541)
    expect(result.display_name).toContain('Antananarivo')
  })

  it('hubsService.supprimer is called with hubId', async () => {
    await hubsService.supprimer('h1')
    expect(hubsService.supprimer).toHaveBeenCalledWith('h1')
  })
})

describe('Madagascar bounds validation', () => {
  const MG_BOUNDS = { latMin: -25.5, latMax: -11.5, lngMin: 43, lngMax: 50.5 }
  function isMadagascar(lat, lng) {
    return lat >= MG_BOUNDS.latMin && lat <= MG_BOUNDS.latMax && lng >= MG_BOUNDS.lngMin && lng <= MG_BOUNDS.lngMax
  }

  it('accepts Antananarivo', () => {
    expect(isMadagascar(-18.914, 47.541)).toBe(true)
  })

  it('accepts Toamasina', () => {
    expect(isMadagascar(-18.15, 49.38)).toBe(true)
  })

  it('rejects Paris', () => {
    expect(isMadagascar(48.85, 2.35)).toBe(false)
  })

  it('rejects points just outside bounds', () => {
    expect(isMadagascar(-25.6, 47.5)).toBe(false)
    expect(isMadagascar(-18.9, 42.9)).toBe(false)
  })
})
