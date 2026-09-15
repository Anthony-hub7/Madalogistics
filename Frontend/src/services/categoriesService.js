import { apiClient } from './apiClient'

/**
 * Service CRUD catégories Direction (V14 : avec tarification).
 * Accès : DIRECTION uniquement (hasRole('DIRECTION') côté backend).
 */
export const categoriesService = {
  async lister() {
    return apiClient.get('/direction/categories')
  },

  async obtenir(categorieId) {
    return apiClient.get(`/direction/categories/${categorieId}`)
  },

  async creer(data) {
    return apiClient.post('/direction/categories', data)
  },

  async modifier(categorieId, data) {
    return apiClient.put(`/direction/categories/${categorieId}`, data)
  },

  async toggleActif(categorieId) {
    return apiClient.patch(`/direction/categories/${categorieId}/actif`)
  },

  /**
   * Liste les catégories actives pour le formulaire client (GET /demandes/categories).
   * Accessible CLIENT_FINAL + GESTIONNAIRE + DIRECTION.
   */
  async listerActives() {
    return apiClient.get('/demandes/categories')
  },
}
