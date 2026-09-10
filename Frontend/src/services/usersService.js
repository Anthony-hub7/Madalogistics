import { apiClient } from './apiClient'

export const usersService = {
  creer(data) {
    return apiClient.post('/users', data)
  },
  lister(page = 0, size = 50) {
    return apiClient.get(`/users?page=${page}&size=${size}`)
  },
  modifier(userId, data) {
    return apiClient.put(`/users/${userId}`, data)
  },
  supprimer(userId) {
    return apiClient.delete(`/users/${userId}`)
  },
}
