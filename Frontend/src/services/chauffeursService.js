import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const chauffeursService = {
  /**
   * Depose un dossier d'inscription chauffeur (multipart : JSON + permisScan).
   * apiClient ne gere pas le multipart, on fait un fetch brut.
   */
  async deposerDossier(dossier, fichierPermis) {
    const formData = new FormData()

    // Part JSON du dossier
    const dossierBlob = new Blob([JSON.stringify(dossier)], { type: 'application/json' })
    formData.append('dossier', dossierBlob)

    // Fichier permis
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
      throw new Error(body.message || `Erreur API: ${response.status}`)
    }

    return response.json()
  },
}
