import request from './request'

// 用户管理接口（ADMIN 专用）
export function listUsersApi() {
  return request.get('/users')
}

export function updateUserRoleApi(id, role) {
  return request.put(`/users/${id}/role`, null, { params: { role } })
}

export function resetUserPasswordApi(id, password) {
  return request.put(`/users/${id}/password`, null, { params: { password } })
}
