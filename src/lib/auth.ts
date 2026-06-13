import { api } from './api'

export interface User {
  id: string; email: string; role: string; nombre: string
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('cp_user') ?? 'null') } catch { return null }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cp_token')
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('cp_token', token)
  localStorage.setItem('cp_user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('cp_token')
  localStorage.removeItem('cp_user')
}

export async function login(email: string, password: string): Promise<User> {
  const r = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password })
  setAuth(r.access_token, r.user)
  return r.user
}
