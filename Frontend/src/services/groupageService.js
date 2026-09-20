import { apiClient } from './apiClient'

export const groupageService = {
  lancer(hubId) {
    return apiClient.post(`/optimisation/groupage?hubId=${hubId}`)
  },

  async preview(hubId, algo = 'BIN_PACKING') {
    const params = new URLSearchParams({ hubId, algo })
    return apiClient.post(`/optimisation/groupage/preview?${params.toString()}`)
  },

  validerEdit(runId, sacs) {
    return apiClient.post('/optimisation/groupage/valider-edite', { runId, sacs })
  },

  async comparer(hubId) {
    return apiClient.post(`/optimisation/groupage/comparer?hubId=${hubId}`)
  },

  async valider(runId) {
    return apiClient.post(`/optimisation/groupage/valider?runId=${runId}`)
  },
}
