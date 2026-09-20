import { apiClient } from './apiClient'

export const vrpService = {
  async lancer(sacId) {
    return apiClient.post(`/optimisation/vrp?sacId=${sacId}`)
  },

  async preview(sacId) {
    return apiClient.post(`/optimisation/vrp/preview?sacId=${sacId}`)
  },

  async valider(sacId, etapes) {
    return apiClient.post('/optimisation/vrp/valider', { sacId, etapes })
  },
}
