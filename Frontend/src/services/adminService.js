import { apiClient } from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Service admin SAAS — appels API réels pour la gestion des dossiers
 * d'inscription agences et chauffeurs freelance.
 */
export const adminService = {
  // ═══════════════════════════════════════════════════════════════════════
  // AGENCES
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Liste les dossiers d'agences en attente de validation.
   * @param {string|null} statut - 'EN_ATTENTE', 'VALIDEE', 'REFUSEE' ou null (tous)
   * @returns {Promise<Array>} Liste de PMECliente
   */
  async listAgences(statut = 'EN_ATTENTE') {
    const params = statut ? `?statut=${statut}` : ''
    return apiClient.get(`/admin/agences${params}`)
  },

  /**
   * Détail d'un dossier agence.
   * @param {string} tenantId
   * @returns {Promise<Object>} PMECliente
   */
  async getAgence(tenantId) {
    return apiClient.get(`/admin/agences/${tenantId}`)
  },

  /**
   * Valide un dossier d'agence.
   * @param {string} tenantId
   */
  async validerAgence(tenantId) {
    return apiClient.post(`/admin/agences/${tenantId}/valider`)
  },

  /**
   * Refuse un dossier d'agence avec motif.
   * @param {string} tenantId
   * @param {string} motif
   */
  async refuserAgence(tenantId, motif) {
    return apiClient.post(`/admin/agences/${tenantId}/refuser`, { motif })
  },

  /**
   * Desactive un compte d'agence activee.
   * @param {string} tenantId
   * @param {string} motif
   */
  async desactiverAgence(tenantId, motif) {
    return apiClient.post(`/admin/agences/${tenantId}/desactiver`, { motif })
  },

  /**
   * Supprime un compte d'agence (soft delete).
   * @param {string} tenantId
   * @param {string} motif
   */
  async supprimerAgence(tenantId, motif) {
    return apiClient.post(`/admin/agences/${tenantId}/supprimer`, { motif })
  },

  /**
   * Reactive un compte d'agence desactivee.
   * @param {string} tenantId
   */
  async reactiverAgence(tenantId) {
    return apiClient.post(`/admin/agences/${tenantId}/reactiver`)
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CHAUFFEURS FREELANCE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Liste les dossiers de chauffeurs freelance en attente de validation.
   * @param {string|null} statut
   * @returns {Promise<Array>} Liste de Chauffeur
   */
  async listFreelances(statut = 'EN_ATTENTE') {
    const params = statut ? `?statut=${statut}` : ''
    return apiClient.get(`/admin/chauffeurs${params}`)
  },

  /**
   * Détail d'un dossier chauffeur.
   * @param {string} chauffeurId
   * @returns {Promise<Object>} Chauffeur
   */
  async getFreelance(chauffeurId) {
    return apiClient.get(`/admin/chauffeurs/${chauffeurId}`)
  },

  /**
   * Valide un dossier de chauffeur freelance.
   * @param {string} chauffeurId
   */
  async validerFreelance(chauffeurId) {
    return apiClient.post(`/admin/chauffeurs/${chauffeurId}/valider`)
  },

  /**
   * Refuse un dossier de chauffeur freelance avec motif.
   * @param {string} chauffeurId
   * @param {string} motif
   */
  async refuserFreelance(chauffeurId, motif) {
    return apiClient.post(`/admin/chauffeurs/${chauffeurId}/refuser`, { motif })
  },

  /**
   * Desactive un chauffeur freelance actif.
   * @param {string} chauffeurId
   * @param {string} motif
   */
  async desactiverFreelance(chauffeurId, motif) {
    return apiClient.post(`/admin/chauffeurs/${chauffeurId}/desactiver`, { motif })
  },

  /**
   * Supprime un chauffeur freelance (soft delete).
   * @param {string} chauffeurId
   * @param {string} motif
   */
  async supprimerFreelance(chauffeurId, motif) {
    return apiClient.post(`/admin/chauffeurs/${chauffeurId}/supprimer`, { motif })
  },

  /**
   * Reactive un chauffeur freelance desactive.
   * @param {string} chauffeurId
   */
  async reactiverFreelance(chauffeurId) {
    return apiClient.post(`/admin/chauffeurs/${chauffeurId}/reactiver`)
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DOCUMENTS (preview / download)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Génère une URL blob pour prévisualiser un document d'agence.
   * @param {string} tenantId
   * @param {'kbis'|'attestation'|'assurance'} type
   * @returns {Promise<{url: string, type: string, name: string}>}
   */
  async fetchDocumentAgence(tenantId, type) {
    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const response = await fetch(`${BASE_URL}/admin/documents/agence/${tenantId}/${type}`, {
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Erreur chargement document: ${response.status}`)
    }

    const blob = await response.blob()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const ext = contentType.includes('pdf') ? '.pdf' : contentType.includes('jpeg') ? '.jpg' : '.png'
    return {
      url: URL.createObjectURL(blob),
      type: contentType,
      name: `${type}_${tenantId}${ext}`,
    }
  },

  /**
   * Génère une URL blob pour prévisualiser le permis d'un chauffeur.
   * @param {string} chauffeurId
   * @returns {Promise<{url: string, type: string, name: string}|null>}
   */
  async fetchDocumentPermis(chauffeurId) {
    const token = apiClient._getToken?.()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const response = await fetch(`${BASE_URL}/admin/documents/chauffeur/${chauffeurId}/permis`, {
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Erreur chargement permis: ${response.status}`)
    }

    const blob = await response.blob()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const ext = contentType.includes('pdf') ? '.pdf' : contentType.includes('jpeg') ? '.jpg' : '.png'
    return {
      url: URL.createObjectURL(blob),
      type: contentType,
      name: `permis_${chauffeurId}${ext}`,
    }
  },

  /**
   * Compte les demandes en attente (agences + freelances).
   * @returns {Promise<{agences: number, freelances: number, total: number}>}
   */
  async compterDemandesEnAttente() {
    try {
      const [agences, freelances] = await Promise.all([
        this.listAgences('EN_ATTENTE'),
        this.listFreelances('EN_ATTENTE'),
      ])
      return {
        agences: agences.length,
        freelances: freelances.length,
        total: agences.length + freelances.length,
      }
    } catch {
      return { agences: 0, freelances: 0, total: 0 }
    }
  },
}
