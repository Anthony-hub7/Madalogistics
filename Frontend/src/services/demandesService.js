import { apiClient } from './apiClient'

export const demandesService = {
  getAll(statut = null) {
    const params = statut ? `?statut=${statut}` : ''
    return apiClient.get(`/demandes${params}`)
  },

  getById(id) {
    return apiClient.get(`/demandes/${id}`)
  },

  create(data) {
    return apiClient.post('/demandes', data)
  },

  devis(data) {
    return apiClient.post('/demandes/devis', data)
  },

  valider(id) {
    return apiClient.post(`/demandes/${id}/valider`)
  },

  refuser(id, motif) {
    return apiClient.post(`/demandes/${id}/refuser`, { motif })
  },

  annuler(id) {
    return apiClient.post(`/demandes/${id}/annuler`)
  },
}
