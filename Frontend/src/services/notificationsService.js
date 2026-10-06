import { apiClient } from './apiClient'

/**
 * Notifications du rôle courant (incident véhicule, sac annulé).
 * Lues en polling (~30 s) depuis la cloche du Header.
 */
export const notificationsService = {
  async lister(nonLues = false) {
    return apiClient.get(`/notifications${nonLues ? '?nonLues=true' : ''}`)
  },

  async compteur() {
    return apiClient.get('/notifications/compteur')
  },

  async marquerLue(notificationId) {
    return apiClient.patch(`/notifications/${notificationId}/lue`)
  },

  async toutMarquerLues() {
    return apiClient.post('/notifications/tout-marquer-lues')
  },
}
