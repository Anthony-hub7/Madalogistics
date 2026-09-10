import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Service de gestion equipe chauffeur côté agence (DIRECTION).
 * Endpoints : /api/agences/equipe/chauffeurs
 */
export const agenceEquipeService = {
  async lister(statut) {
    const params = statut ? `?statut=${statut}` : ''
    return apiClient.get(`/agences/equipe/chauffeurs${params}`)
  },

  async detail(chauffeurId) {
    return apiClient.get(`/agences/equipe/chauffeurs/${chauffeurId}`)
  },

  async valider(chauffeurId) {
    return apiClient.post(`/agences/equipe/chauffeurs/${chauffeurId}/valider`)
  },

  async refuser(chauffeurId, motif) {
    return apiClient.post(`/agences/equipe/chauffeurs/${chauffeurId}/refuser`, { motif })
  },

  async desactiver(chauffeurId, motif) {
    return apiClient.post(`/agences/equipe/chauffeurs/${chauffeurId}/desactiver`, { motif })
  },

  async reactiver(chauffeurId) {
    return apiClient.post(`/agences/equipe/chauffeurs/${chauffeurId}/reactiver`)
  },

  async fetchPermis(chauffeurId) {
    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(`${BASE_URL}/agences/equipe/chauffeurs/${chauffeurId}/permis`, {
      headers,
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Impossible de charger le permis')
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  },
}
