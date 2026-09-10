import { apiClient } from './apiClient'

export const tarifsService = {
  async lister() {
    return apiClient.get('/direction/tarifs')
  },

  async creer(data) {
    return apiClient.post('/direction/tarifs', data)
  },

  async modifier(grilleId, data) {
    return apiClient.put(`/direction/tarifs/${grilleId}`, data)
  },

  async supprimer(grilleId) {
    return apiClient.delete(`/direction/tarifs/${grilleId}`)
  },

  async toggleActif(grilleId) {
    return apiClient.patch(`/direction/tarifs/${grilleId}/actif`)
  },
}
