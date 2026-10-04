import { apiClient } from './apiClient'

export const gainsService = {
  /**
   * Comparaison baseline (non optimisé) vs optimisé — dashboard Direction.
   * @param {Object} opts
   * @param {string} [opts.hubId] filtre hub (omis = tenant global)
   * @param {number} [opts.vitesseKmh] vitesse moyenne (défaut 40)
   * @param {number} [opts.consoL100km] consommation L/100 km (défaut 8)
   * @param {number} [opts.prixFuelArParL] prix carburant Ar/L (défaut 5900)
   * @param {number} [opts.facteurCo2KgParL] facteur CO2 kg/L (défaut 2.68)
   * @param {number} [opts.coutHoraireAr] coût main-d'œuvre Ar/h (défaut 0)
   */
  async comparer({ hubId, vitesseKmh, consoL100km, prixFuelArParL, facteurCo2KgParL, coutHoraireAr } = {}) {
    const params = new URLSearchParams()
    if (hubId) params.set('hubId', hubId)
    if (vitesseKmh != null && vitesseKmh !== '') params.set('vitesseKmh', vitesseKmh)
    if (consoL100km != null && consoL100km !== '') params.set('consoL100km', consoL100km)
    if (prixFuelArParL != null && prixFuelArParL !== '') params.set('prixFuelArParL', prixFuelArParL)
    if (facteurCo2KgParL != null && facteurCo2KgParL !== '') params.set('facteurCo2KgParL', facteurCo2KgParL)
    if (coutHoraireAr != null && coutHoraireAr !== '') params.set('coutHoraireAr', coutHoraireAr)
    const qs = params.toString()
    return apiClient.get(`/direction/gains${qs ? '?' + qs : ''}`)
  },
}
