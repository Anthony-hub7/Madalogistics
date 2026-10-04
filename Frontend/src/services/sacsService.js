import { apiClient } from './apiClient'

export const sacsService = {
  async getAll() {
    return apiClient.get('/sacs')
  },

  // Detail complet (historique) : chauffeur, clients, colis + commande, etapes + preuves
  detail(sacId) {
    return apiClient.get(`/sacs/${sacId}`)
  },

  // V1-b : suppression d'un sac (CONSTITUE/AFFECTE) + liberation ressources
  remove(sacId) {
    return apiClient.delete(`/sacs/${sacId}`)
  },

  // V1-c : colis actuellement lies au sac
  getColis(sacId) {
    return apiClient.get(`/sacs/${sacId}/colis`)
  },

  // V1-c : colis libres (sans sac) pour un hub
  getColisLibres(hubId) {
    const qs = hubId ? `?hubId=${hubId}` : ''
    return apiClient.get(`/sacs/colis-libres${qs}`)
  },

  // V1-c : ajouter/retirer des colis (interdit apres tournee)
  editColis(sacId, { ajouter = [], retirer = [] } = {}) {
    return apiClient.patch(`/sacs/${sacId}/colis`, { ajouter, retirer })
  },

  // Creation manuelle : reunion de colis libres d'un hub en un sac CONSTITUE
  creer({ hubId, colisIds = [] } = {}) {
    return apiClient.post('/sacs', { hubId, colisIds })
  },

  // Annulation d'une mission freelance par le gestionnaire.
  // mode: 'FREELANCE' → republication aux freelances
  // mode: 'AGENCE'    → retour au groupage (colis detaches, sac supprime)
  annulerFreelance(sacId, { mode, motif } = {}) {
    return apiClient.post(`/sacs/${sacId}/annuler-freelance`, { mode, motif })
  },
}
