const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

function getToken() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('cp_token')
}

function getRefresh() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('cp_refresh')
}

function limpiarSesion() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('cp_token')
  sessionStorage.removeItem('cp_user')
  sessionStorage.removeItem('cp_refresh')
}

// Un solo refresh a la vez aunque varias requests fallen al mismo tiempo
let refreshing: Promise<string | null> | null = null

async function renovarToken(): Promise<string | null> {
  const refresh_token = getRefresh()
  if (!refresh_token) return null
  if (!refreshing) {
    refreshing = fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    })
      .then(async r => {
        if (!r.ok) return null
        const data = await r.json()
        sessionStorage.setItem('cp_token', data.access_token)
        if (data.refresh_token) sessionStorage.setItem('cp_refresh', data.refresh_token)
        return data.access_token as string
      })
      .catch(() => null)
      .finally(() => { refreshing = null })
  }
  return refreshing
}

async function request<T>(path: string, opts: RequestInit = {}, reintento = false): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.headers) Object.assign(headers, opts.headers)

  const r = await fetch(BASE + path, { ...opts, headers })

  // Token vencido: renovar una vez y reintentar la misma request
  if (r.status === 401 && !reintento && getRefresh()) {
    const nuevo = await renovarToken()
    if (nuevo) return request<T>(path, opts, true)
    limpiarSesion()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || `Error ${r.status}`)
  }
  if (r.status === 204) return undefined as T
  return r.json()
}

async function download(path: string, fallbackName: string, reintento = false): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const r = await fetch(BASE + path, { headers })

  if (r.status === 401 && !reintento && getRefresh()) {
    const nuevo = await renovarToken()
    if (nuevo) return download(path, fallbackName, true)
    limpiarSesion()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || `Error ${r.status}`)
  }
  // Intentar respetar el nombre que envía el backend
  let name = fallbackName
  const cd = r.headers.get('Content-Disposition')
  const match = cd?.match(/filename="?([^"]+)"?/)
  if (match) name = match[1]

  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const api = {
  get:    <T>(p: string) => request<T>(p),
  post:   <T>(p: string, body: unknown) => request<T>(p, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(p: string, body: unknown) => request<T>(p, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(p: string, body: unknown) => request<T>(p, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(p: string)               => request<T>(p, { method: 'DELETE' }),
  download,
}
