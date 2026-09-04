import { apiClient } from './apiClient'

export const tourneesService = {
  getAll() {
    return apiClient.get('/tournees')
  },
  optimize(data) {
    return apiClient.post('/tournees/optimize', data)
  },
}
