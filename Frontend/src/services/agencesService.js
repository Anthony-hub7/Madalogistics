import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const agencesService = {
  /**
   * Depose un dossier d'inscription agence (multipart : JSON + fichiers).
   * apiClient ne gere pas le multipart, on fait un fetch brut.
   */
  async deposerDossier(dossier, fichiers) {
    const formData = new FormData()

    // Part JSON du dossier
    const dossierBlob = new Blob([JSON.stringify(dossier)], { type: 'application/json' })
    formData.append('dossier', dossierBlob)

    // Fichiers
    if (fichiers.kbis) formData.append('kbis', fichiers.kbis)
    if (fichiers.attestation) formData.append('attestation', fichiers.attestation)
    if (fichiers.assurance) formData.append('assurance', fichiers.assurance)

    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const response = await fetch(`${BASE_URL}/auth/agences/dossier`, {
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
   * Finalise le compte administrateur apres validation du dossier.
   */
  finaliserCompte(data) {
    return apiClient.post('/auth/agences/finaliser', data)
  },
}
