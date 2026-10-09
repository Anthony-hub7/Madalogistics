import { apiClient } from './apiClient'

/**
 * Dashboard « Vue d'ensemble » Direction — agrégation en lecture seule de
 * l'activité du responsable logistique (commandes, sacs, tournées, flotte,
 * tarifs, factures, équipe). Accès : DIRECTION.
 */
export const directionService = {
  async tableauDeBord() {
    return apiClient.get('/direction/tableau-de-bord')
  },
}
