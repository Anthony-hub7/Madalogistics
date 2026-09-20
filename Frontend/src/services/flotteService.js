import { apiClient } from './apiClient'

export const flotteService = {
  getAll({ statut, hubId } = {}) {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    if (hubId) params.set('hubId', hubId)
    const qs = params.toString()
    return apiClient.get(`/vehicules${qs ? `?${qs}` : ''}`)
  },

  getById(vehiculeId) {
    return apiClient.get(`/vehicules/${vehiculeId}`)
  },

  create(data) {
    return apiClient.post('/vehicules', data)
  },

  update(vehiculeId, data) {
    return apiClient.put(`/vehicules/${vehiculeId}`, data)
  },

  patchStatut(vehiculeId, statut) {
    return apiClient.patch(`/vehicules/${vehiculeId}/statut`, { statut })
  },

  remove(vehiculeId) {
    return apiClient.delete(`/vehicules/${vehiculeId}`)
  },
}
