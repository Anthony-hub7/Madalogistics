import { apiClient } from './apiClient'

export const facturesService = {
  /**
   * Liste des factures du tenant (historique gestionnaire).
   * Filtres optionnels : statut (EMISE|PAYEE|ANNULEE), from/to (ISO yyyy-MM-dd).
   */
  getAll({ statut, from, to } = {}) {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    return apiClient.get(`/factures${qs ? `?${qs}` : ''}`)
  },
}
