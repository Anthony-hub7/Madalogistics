import { apiClient } from './apiClient'

export const agencesService = {
  getRecommandees(latCollecte = null, lonCollecte = null) {
    const params = new URLSearchParams()
    if (latCollecte != null) params.set('latCollecte', latCollecte)
    if (lonCollecte != null) params.set('lonCollecte', lonCollecte)
    const qs = params.toString()
    return apiClient.get(`/auth/public/agences/recommandees${qs ? '?' + qs : ''}`)
  },

  changerAgence(tenantId) {
    return apiClient.post('/auth/changer-agence', { tenantId })
  },
}
