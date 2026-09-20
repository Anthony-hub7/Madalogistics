import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const DOSSIER_KEY = 'madalogistix_dossier_en_cours'

export const agencesService = {
  getRecommandees(latCollecte = null, lonCollecte = null) {
    const params = new URLSearchParams()
    if (latCollecte != null) params.set('latCollecte', latCollecte)
    if (lonCollecte != null) params.set('lonCollecte', lonCollecte)
    const qs = params.toString()
    return apiClient.get(`/auth/public/agences/recommandees${qs ? '?' + qs : ''}`)
  },

  changerAgence(tenantId) {
    return apiClient.post('/auth/changer-agence', { tenantId })
  },

  async deposerDossier(dossier, fichiers) {
    const formData = new FormData()

    const dossierBlob = new Blob([JSON.stringify(dossier)], { type: 'application/json' })
    formData.append('dossier', dossierBlob)

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

  async finaliserCompte({ tenantId, prenom, nom, emailAdmin, password }) {
    return apiClient.post('/auth/agences/finaliser', {
      tenantId,
      prenom,
      nom,
      emailAdmin,
      password,
    })
  },

  sauvegarderDossier(dossier) {
    try {
      localStorage.setItem(DOSSIER_KEY, JSON.stringify(dossier))
    } catch { /* noop */ }
  },

  recupererDossierEnCours() {
    try {
      const raw = localStorage.getItem(DOSSIER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  effacerDossierEnCours() {
    try {
      localStorage.removeItem(DOSSIER_KEY)
    } catch { /* noop */ }
  },

  async statutDossier(tenantId) {
    return apiClient.get(`/auth/public/agences/dossier/${tenantId}`)
  },
}
