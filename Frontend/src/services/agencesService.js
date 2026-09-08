import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const STORAGE_KEY = 'madalogistix_dossier_agence'

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

    const result = await response.json()

    // Persister le tenantId + reference pour reprise ultérieure
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tenantId: result.tenantId,
        reference: result.reference,
        raisonSociale: dossier.raisonSociale,
        createdAt: Date.now(),
      }))
    } catch { /* storage full or unavailable */ }

    return result
  },

  /**
   * Vérifie le statut d'un dossier (GET public, sans authentification).
   */
  async statutDossier(tenantId) {
    return apiClient.get(`/auth/public/agences/dossier/${tenantId}`)
  },

  /**
   * Récupère les infos du dossier en cours depuis le localStorage.
   */
  recupererDossierEnCours() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  /**
   * Efface les infos du dossier en cours du localStorage.
   */
  effacerDossierEnCours() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  },

  /**
   * Finalise le compte administrateur apres validation du dossier.
   */
  finaliserCompte(data) {
    return apiClient.post('/auth/agences/finaliser', data)
  },
}
