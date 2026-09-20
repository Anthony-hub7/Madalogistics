import { apiClient } from './apiClient'

export const affectationService = {
  async preview(hubId) {
    return apiClient.post(`/optimisation/affectation/preview?hubId=${hubId}`)
  },

  async simuler(hubId, decisions) {
    return apiClient.post('/optimisation/affectation/simuler', { hubId, decisions })
  },

  async valider(hubId, decisions) {
    return apiClient.post('/optimisation/affectation/valider', { hubId, decisions })
  },

  async lancer(hubId) {
    return apiClient.post(`/optimisation/affectation?hubId=${hubId}`)
  },
}
