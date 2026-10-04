import { apiClient } from './apiClient'

/**
 * Appel d'offres freelance : missions ouvertes (toutes agences)
 * et acceptation en first-accept.
 */
export const missionsProposeesService = {
  /**
   * Liste des sacs CONSTITUE issus d'une demande FREELANCE, avec calcul
   * d'eligibilite (capacite poids/volume du vehicule du freelance).
   * @returns {Promise<Array>} MissionProposeeDTO[]
   */
  async lister() {
    return apiClient.get('/chauffeur/missions-proposees')
  },

  /**
   * Accepter une mission → attribution immediate + calcul de la tournee VRP.
   * @returns {Promise<{success, mission, tournee, avertissement}>}
   */
  async accepter(sacId) {
    return apiClient.post(`/chauffeur/missions-proposees/${sacId}/accepter`)
  },
}
