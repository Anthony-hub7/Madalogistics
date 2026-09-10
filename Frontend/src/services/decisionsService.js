import { apiClient } from './apiClient'

export const decisionsService = {
  async lister({ hubId, type } = {}) {
    const params = new URLSearchParams()
    if (hubId) params.set('hubId', hubId)
    if (type) params.set('type', type)
    const qs = params.toString()
    return apiClient.get(`/direction/decisions${qs ? '?' + qs : ''}`)
  },
}
