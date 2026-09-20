import { apiClient } from './apiClient'

export const tourneesService = {
  async getAll() {
    return apiClient.get('/tournees')
  },

  async getById(tourneeId) {
    return apiClient.get(`/tournees/${tourneeId}`)
  },

  async getTrace(tourneeId) {
    return apiClient.get(`/tournees/${tourneeId}/trace`)
  },

  async remove(tourneeId) {
    return apiClient.delete(`/tournees/${tourneeId}`)
  },
}
