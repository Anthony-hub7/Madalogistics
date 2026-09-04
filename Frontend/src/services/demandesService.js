import { apiClient } from './apiClient'

export const demandesService = {
  getAll() {
    return apiClient.get('/demandes')
  },
  create(data) {
    return apiClient.post('/demandes', data)
  },
}
