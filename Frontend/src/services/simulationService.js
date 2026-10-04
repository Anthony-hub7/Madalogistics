import { apiClient } from './apiClient'

export const simulationService = {
  grouper(payload) {
    return apiClient.post('/simulation/groupage', payload)
  },
}
