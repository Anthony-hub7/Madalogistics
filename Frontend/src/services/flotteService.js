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

  // Mise hors service sur incident (panne) : annule en douceur les sacs
  // actifs rattachés au véhicule puis bascule celui-ci en HORS_SERVICE.
  mettreHorsService(vehiculeId, { motif } = {}) {
    return apiClient.post(`/vehicules/${vehiculeId}/hors-service`, { motif })
  },

  remove(vehiculeId) {
    return apiClient.delete(`/vehicules/${vehiculeId}`)
  },
}
