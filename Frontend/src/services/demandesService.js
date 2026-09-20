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

  valider(id, modeLivraison) {
    return apiClient.post(`/demandes/${id}/valider`, { modeLivraison: modeLivraison || null })
  },

  refuser(id, motif) {
    return apiClient.post(`/demandes/${id}/refuser`, { motif })
  },

  annuler(id) {
    return apiClient.post(`/demandes/${id}/annuler`)
  },

  programmer(id, data) {
    return apiClient.post(`/demandes/${id}/programmer`, data)
  },

  livrer(id, data) {
    return apiClient.post(`/demandes/${id}/livrer`, data || {})
  },

  getFacture(id) {
    return apiClient.get(`/demandes/${id}/facture`)
  },

  predireClasse(data) {
    return apiClient.post('/demandes/predire-classe', data)
  },

  getHubs() {
    return apiClient.get('/demandes/hubs')
  },

  recommanderHubs(params) {
    const qs = new URLSearchParams({
      latCollecte: params.latitudeCollecte,
      lonCollecte: params.longitudeCollecte,
      latLivraison: params.latitudeLivraison,
      lonLivraison: params.longitudeLivraison,
      assurance: params.assurance,
      express: params.express,
    }).toString()
    return apiClient.get(`/demandes/recommandation-hubs?${qs}`)
  },
}
