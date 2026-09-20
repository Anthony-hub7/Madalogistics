import { apiClient } from './apiClient'

export const sacsService = {
  async getAll() {
    return apiClient.get('/sacs')
  },
}
