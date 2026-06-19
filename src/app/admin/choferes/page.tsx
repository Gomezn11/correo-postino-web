'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Chofer { id: string; nombre: string; email: string; tarifa_por_entrega: number; created_at: string | null }

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function AdminChoferesPage() {
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', tarifa: '0' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  function cargar() {
    return api.get<Chofer[]>('/admin/usuarios?role=chofer')
      .then(setChoferes).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  async function crearChofer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreando(true)
    try {
      await api.post('/admin/usuarios', {
        email: form.email, password: form.password,
        nombre: form.nombre, role: 'chofer',
        tarifa_por_entrega: parseFloat(form.tarifa) || 0,
      })
      setForm({ nombre: '', email: '', password: '', tarifa: '0' })
      await cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear chofer')
    } finally { setCreando(false) }
  }

  async function eliminarChofer(id: string, nombre: string) {
    if (!confirm(`¿Eliminar al chofer ${nombre}?`)) return
    await api.delete(`/admin/usuarios/${id}`)
    setChoferes(prev => prev.filter(c => c.id !== id))
  }

  function formatARS(n: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Choferes</h1>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : choferes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay choferes registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
                <th className="px-4 py-3 font-medium">Tarifa/entrega</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {choferes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.email}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">{formatARS(c.tarifa_por_entrega)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => eliminarChofer(c.id, c.nombre)}
                      className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Crear chofer */}
      <div className="card max-w-md">
        <h2 className="font-bold mb-4">Agregar chofer</h2>
        <form onSubmit={crearChofer} className="space-y-3">
          <div>
            <label className="label">Nombre completo</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="input" required placeholder="Juan Pérez" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="input" required placeholder="juan@empresa.com" />
          </div>
          <div>
            <label className="label">Contraseña inicial</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input pr-10"
                required minLength={8} placeholder="Mínimo 8 caracteres"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                aria-label={showPass ? 'Ocultar' : 'Ver'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Tarifa por entrega (ARS)</label>
            <input type="number" value={form.tarifa} onChange={e => setForm({ ...form, tarifa: e.target.value })}
              className="input" min="0" step="100" placeholder="1500" />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}
          <button type="submit" disabled={creando} className="btn-primary w-full disabled:opacity-50">
            {creando ? 'Creando...' : '+ Agregar chofer'}
          </button>
        </form>
      </div>
    </div>
  )
}
