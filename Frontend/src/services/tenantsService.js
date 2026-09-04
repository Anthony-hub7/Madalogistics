import { apiClient } from './apiClient'

export const tenantsService = {
  getAll() {
    return apiClient.get('/tenants')
  },
  update(id, data) {
    return apiClient.put(`/tenants/${id}`, data)
  },
}
