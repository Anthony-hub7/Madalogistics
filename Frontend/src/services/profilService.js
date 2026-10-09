import { apiClient } from './apiClient'

/**
 * Profil de l'utilisateur connecte (lecture seule) + changement de mot de passe.
 */
export const profilService = {
  me() {
    return apiClient.get('/auth/me')
  },

  changerMotDePasse({ ancienMotDePasse, nouveauMotDePasse }) {
    return apiClient.post('/auth/mot-de-passe', { ancienMotDePasse, nouveauMotDePasse })
  },
}
