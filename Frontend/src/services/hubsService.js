import { apiClient } from './apiClient'

export const hubsService = {
  async lister() {
    return apiClient.get('/direction/hubs')
  },

  async obtenir(hubId) {
    return apiClient.get(`/direction/hubs/${hubId}`)
  },

  async creer(data) {
    return apiClient.post('/direction/hubs', data)
  },

  async modifier(hubId, data) {
    return apiClient.put(`/direction/hubs/${hubId}`, data)
  },

  async supprimer(hubId) {
    return apiClient.delete(`/direction/hubs/${hubId}`)
  },

  async toggleActif(hubId) {
    return apiClient.patch(`/direction/hubs/${hubId}/actif`)
  },
}
