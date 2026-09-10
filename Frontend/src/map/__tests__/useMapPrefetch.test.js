import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { manualPrefetch } from '../useMapPrefetch'

function mockMap(zoom = 13, bounds = { west: 47.5, east: 47.6, north: -18.9, south: -19.0 }) {
  return {
    getZoom: () => zoom,
    getBounds: () => ({
      getWest: () => bounds.west,
      getEast: () => bounds.east,
      getNorth: () => bounds.north,
      getSouth: () => bounds.south,
    }),
    on: vi.fn(),
    off: vi.fn(),
    getContainer: () => null,
  }
}

describe('manualPrefetch', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true, connection: {} })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a promise that resolves to an AbortController', async () => {
    const map = mockMap()
    const result = await manualPrefetch(map)
    expect(result).toBeDefined()
    expect(typeof result.abort).toBe('function')
  })

  it('calls onProgress with total > 0', async () => {
    const map = mockMap(13, { west: 47.53, east: 47.55, north: -18.90, south: -18.92 })
    const onProgress = vi.fn()
    await manualPrefetch(map, onProgress)
    expect(onProgress).toHaveBeenCalled()
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
    expect(lastCall[1]).toBeGreaterThan(0)
  })

  it('does nothing when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const map = mockMap()
    const onProgress = vi.fn()
    const result = await manualPrefetch(map, onProgress)
    expect(result).toBeUndefined()
    expect(onProgress).not.toHaveBeenCalled()
  })

  it('caps tiles at MAX_TILES_MANUAL (200)', async () => {
    const map = mockMap(19, { west: 40, east: 50, north: -10, south: -30 })
    const onProgress = vi.fn()
    const controller = await manualPrefetch(map, onProgress)
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
    expect(lastCall[1]).toBeLessThanOrEqual(200)
    controller?.abort()
  })
})
