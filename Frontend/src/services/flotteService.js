import { apiClient } from './apiClient'

export const flotteService = {
  getAll() {
    return apiClient.get('/vehicules')
  },
  create(data) {
    return apiClient.post('/vehicules', data)
  },
}
