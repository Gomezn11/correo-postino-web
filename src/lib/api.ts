const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cp_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.headers) Object.assign(headers, opts.headers)

  const r = await fetch(BASE + path, { ...opts, headers })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || `Error ${r.status}`)
  }
  if (r.status === 204) return undefined as T
  return r.json()
}

export const api = {
  get:    <T>(p: string) => request<T>(p),
  post:   <T>(p: string, body: unknown) => request<T>(p, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(p: string, body: unknown) => request<T>(p, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(p: string)               => request<T>(p, { method: 'DELETE' }),
}
