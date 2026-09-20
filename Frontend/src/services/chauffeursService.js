import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const chauffeursService = {
  /**
   * Depose un dossier d'inscription chauffeur (multipart : JSON + permisScan).
   * apiClient ne gere pas le multipart, on fait un fetch brut.
   */
  async deposerDossier(dossier, fichierPermis) {
    const formData = new FormData()

    const dossierBlob = new Blob([JSON.stringify(dossier)], { type: 'application/json' })
    formData.append('dossier', dossierBlob)

    if (fichierPermis) formData.append('permisScan', fichierPermis)

    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const response = await fetch(`${BASE_URL}/auth/chauffeurs/dossier`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const parts = []
      if (body.message) parts.push(body.message)
      if (body.errors) {
        for (const [field, msgs] of Object.entries(body.errors)) {
          parts.push(`${field} : ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        }
      }
      if (body.fieldErrors) {
        for (const [field, msgs] of Object.entries(body.fieldErrors)) {
          parts.push(`${field} : ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        }
      }
      throw new Error(parts.length > 0 ? parts.join(' — ') : `Erreur API: ${response.status}`)
    }

    return response.json()
  },

  /**
   * Statut du dossier du chauffeur connecte (pour l'ecran compte non active).
   */
  async monStatutDossier() {
    return apiClient.get('/chauffeurs/mon-dossier/statut')
  },

  /**
   * Liste les dossiers de chauffeurs rattaches a l'agence (GESTIONNAIRE / DIRECTION).
   */
  lister({ statut } = {}) {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    const qs = params.toString()
    return apiClient.get(`/agences/equipe/chauffeurs${qs ? `?${qs}` : ''}`)
  },

  /**
   * Detail d'un dossier chauffeur (GESTIONNAIRE / DIRECTION).
   */
  detail(chauffeurId) {
    return apiClient.get(`/agences/equipe/chauffeurs/${chauffeurId}`)
  },

  /**
   * URL de telechargement du scan du permis.
   */
  permisUrl(chauffeurId) {
    const base = apiClient.defaults?.baseURL || ''
    return `${base}/agences/equipe/chauffeurs/${chauffeurId}/permis`
  },
}
