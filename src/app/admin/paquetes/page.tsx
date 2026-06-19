'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import EstadoBadge, { TODOS_ESTADOS, LABELS } from '@/components/EstadoBadge'

interface Paquete {
  id: string; qr_interno: string; comprador_nombre: string; comprador_direccion: string
  zona: string; tipo_paquete: string; estado_actual: string; chofer_id: string | null
  etiqueta_impresa: boolean; created_at: string
}
interface Chofer { id: string; nombre: string; email: string }

export default function AdminPaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cambiando, setCambiando] = useState<string | null>(null)
  const [asignando, setAsignando] = useState<string | null>(null)

  const cargar = useCallback(() => {
    let url = '/paquetes?limit=300'
    if (filtroEstado) url += `&estado=${filtroEstado}`
    return api.get<{ items: Paquete[] }>(url).then(r => setPaquetes(r.items ?? []))
  }, [filtroEstado])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cargar(),
      api.get<Chofer[]>('/admin/usuarios?role=chofer').then(setChoferes).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [cargar])

  const filtrados = paquetes.filter(p =>
    !busqueda || [p.comprador_nombre, p.qr_interno, p.comprador_direccion, p.zona]
      .some(v => v.toLowerCase().includes(busqueda.toLowerCase()))
  )

  async function cambiarEstado(id: string, estado: string) {
    setCambiando(id)
    try {
      await api.post(`/paquetes/${id}/estado`, { estado })
      await cargar()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setCambiando(null) }
  }

  async function asignarChofer(id: string, chofer_id: string) {
    setAsignando(id)
    try {
      await api.post(`/paquetes/${id}/asignar-chofer`, { chofer_id })
      await cargar()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setAsignando(null) }
  }

  async function eliminar(id: string, qr: string) {
    if (!confirm(`¿Eliminar paquete ${qr}?`)) return
    await api.delete(`/paquetes/${id}`)
    setPaquetes(prev => prev.filter(p => p.id !== id))
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Paquetes</h1>
        <span className="text-sm text-gray-500">{filtrados.length} resultados</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar..." className="input max-w-xs" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input w-auto">
          <option value="">Todos los estados</option>
          {TODOS_ESTADOS.map(e => <option key={e} value={e}>{LABELS[e]}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay paquetes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-3 font-medium">QR</th>
                  <th className="px-3 py-3 font-medium">Destinatario</th>
                  <th className="px-3 py-3 font-medium hidden lg:table-cell">Zona</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Chofer</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Fecha</th>
                  <th className="px-3 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.qr_interno}</td>
                    <td className="px-3 py-2 font-medium max-w-[150px] truncate">{p.comprador_nombre}</td>
                    <td className="px-3 py-2 text-gray-500 hidden lg:table-cell">{p.zona}</td>
                    <td className="px-3 py-2">
                      <select value={p.estado_actual}
                        onChange={e => cambiarEstado(p.id, e.target.value)}
                        disabled={cambiando === p.id}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white">
                        {TODOS_ESTADOS.map(e => <option key={e} value={e}>{LABELS[e]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <select value={p.chofer_id ?? ''}
                        onChange={e => asignarChofer(p.id, e.target.value)}
                        disabled={asignando === p.id}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white">
                        <option value="">Sin chofer</option>
                        {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs hidden md:table-cell">{formatFecha(p.created_at)}</td>
                    <td className="px-3 py-2 flex gap-1">
                      <a href={`/tracking/${p.qr_interno}`} target="_blank"
                        className="text-xs text-brand hover:underline">Track</a>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => eliminar(p.id, p.qr_interno)}
                        className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
