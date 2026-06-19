import { api } from './api'

export interface User {
  id: string; email: string; role: string; nombre: string
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(sessionStorage.getItem('cp_user') ?? 'null') } catch { return null }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('cp_token')
}

export function setAuth(token: string, user: User) {
  sessionStorage.setItem('cp_token', token)
  sessionStorage.setItem('cp_user', JSON.stringify(user))
}

export function clearAuth() {
  sessionStorage.removeItem('cp_token')
  sessionStorage.removeItem('cp_user')
}

export async function login(email: string, password: string): Promise<User> {
  // Limpiar cualquier sesión previa antes de entrar (evita cruces admin/tienda
  // en el mismo navegador: token de una cuenta + datos de otra).
  clearAuth()
  const r = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password })
  if (!r.access_token || !r.user) throw new Error('Respuesta de login inválida')
  setAuth(r.access_token, r.user)
  return r.user
}
