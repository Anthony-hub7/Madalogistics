import { apiClient } from './apiClient'

export const indisponibilitesService = {
  async listerChauffeurs(chauffeurId, from, to) {
    const params = new URLSearchParams({ chauffeurId })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiClient.get(`/indisponibilites/chauffeurs?${params}`)
  },

  async creerChauffeur(data) {
    return apiClient.post('/indisponibilites/chauffeurs', data)
  },

  async supprimerChauffeur(indispoId, chauffeurId) {
    return apiClient.delete(`/indisponibilites/chauffeurs/${indispoId}?chauffeurId=${chauffeurId}`)
  },

  async listerVehicules(vehiculeId, from, to) {
    const params = new URLSearchParams({ vehiculeId })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiClient.get(`/indisponibilites/vehicules?${params}`)
  },

  async creerVehicule(data) {
    return apiClient.post('/indisponibilites/vehicules', data)
  },

  async supprimerVehicule(indispoId, vehiculeId) {
    return apiClient.delete(`/indisponibilites/vehicules/${indispoId}?vehiculeId=${vehiculeId}`)
  },
}
