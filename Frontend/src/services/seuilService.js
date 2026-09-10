import { apiClient } from './apiClient'

export const seuilService = {
  async obtenir() {
    return apiClient.get('/direction/seuil')
  },

  async mettreAJour(seuil) {
    return apiClient.put('/direction/seuil', { seuil })
  },
}
