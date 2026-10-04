import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Service des missions du chauffeur (API /api/chauffeur/missions).
 */
export const missionsService = {
  /**
   * Lister les missions du chauffeur connecte (sacs AFFECTE ou EN_TRANSIT).
   */
  async lister() {
    return apiClient.get('/chauffeur/missions')
  },

  /**
   * Detail complet d'une mission (sac + tournee + etapes + colis + vehicule).
   */
  async detail(sacId) {
    return apiClient.get(`/chauffeur/missions/${sacId}`)
  },

  /**
   * Prendre en charge une mission → bascule directe EN_TRANSIT.
   */
  async prendreEnCharge(sacId) {
    return apiClient.post(`/chauffeur/missions/${sacId}/prendre-en-charge`)
  },

  /**
   * Valider une etape de livraison (photo par colis).
   * Si toutes les etapes LIVRAISON sont validees → cloture auto + facture.
   */
  async validerEtape(sacId, etapeId, { photo, signatureNom, notes }) {
    const formData = new FormData()
    formData.append('photo', photo)
    if (signatureNom) formData.append('signatureNom', signatureNom)
    if (notes) formData.append('notes', notes)

    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const response = await fetch(`${BASE_URL}/chauffeur/missions/${sacId}/etapes/${etapeId}/valider`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `Erreur API: ${response.status}`)
    }

    return response.json()
  },

  /**
   * Cloturer une mission avec photo(s) de preuve obligatoire(s) par etape.
   * @param {string} sacId
   * @param {Object} params - { photosMap: Map<etapeId, File>, signatureNom, notes }
   */
  async cloturer(sacId, { photosMap, signatureNom, notes }) {
    const formData = new FormData()

    if (signatureNom) formData.append('signatureNom', signatureNom)
    if (notes) formData.append('notes', notes)

    if (photosMap && photosMap.size > 0) {
      photosMap.forEach((file, etapeId) => {
        if (file) {
          formData.append('photos', file)
          formData.append('etapeIds', etapeId)
        }
      })
    }

    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const response = await fetch(`${BASE_URL}/chauffeur/missions/${sacId}/cloturer`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `Erreur API: ${response.status}`)
    }

    return response.json()
  },

  /**
   * URL de la photo de preuve d'une etape.
   */
  photoPreuveUrl(etapeId) {
    return `${BASE_URL}/chauffeur/missions/etapes/${etapeId}/photo`
  },

  /**
   * Trace aller-retour pour la carte (hub → livraisons → hub).
   * Retourne { hub, aller, retour, etapes, distanceKm, nbStops, nbColis, statut }
   */
  async trace(sacId) {
    return apiClient.get(`/chauffeur/missions/${sacId}/trace`)
  },
}
